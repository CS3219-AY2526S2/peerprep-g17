import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { COLLABORATION_API_URL, MATCHING_API_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import type { CollaborationSessionRecord } from "@/types";
import CodeEditor from "./CollaborationEditor";
import type { CodeEditorHandle } from "./CollaborationEditor";
import { QUESTION_API_URL } from "@/config";

function InactivityWarning({ secondsLeft, onKeepAlive }: { secondsLeft: number; onKeepAlive: () => void; }) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs.toString().padStart(2, "0")}s` : `${secs}s`;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4 animate-in slide-in-from-top-4">
      <div className="rounded-lg border border-amber-500/40 bg-amber-950/90 px-4 py-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 text-white">
        <div>
          <p className="text-sm font-bold text-amber-500 uppercase tracking-tight">Inactivity Warning</p>
          <p className="text-xs text-amber-200/80 mt-0.5">Terminating in <span className="font-mono font-bold text-amber-400">{timeStr}</span></p>
        </div>
        <button className="bg-500/20 text-amber-500 px-3 py-1 rounded border border-amber-500/40 text-sm hover:bg-amber-500/30" onClick={onKeepAlive}>Stay Connected</button>
      </div>
    </div>
  );
}

export default function CollaborationPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [session, setSession] = useState<CollaborationSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [terminated, setTerminated] = useState(false);
  const [warningActive, setWarningActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [output, setOutput] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [confirmMode, setConfirmMode] = useState<"leave" | "submit" | null>(null);

  const editorRef = useRef<CodeEditorHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminatedRef = useRef(false);
  const isRedirecting = useRef(false);

  const sendKeepAlive = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "keep_alive", payload: {} }));
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setWarningActive(false);
    setCountdown(0);
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    cancelCountdown();
    setCountdown(seconds);
    setWarningActive(true);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          console.log("⏰ Timer hit zero. Auto-redirecting...");
          window.location.href = "/match"; 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cancelCountdown]);

  const handleKeepAlive = () => {
    sendKeepAlive();
    cancelCountdown();
  };

  async function completeSession(shouldSave: boolean = true) {
    if (!token || !sessionId || isRedirecting.current) return;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "explicit_leave",
        payload: { reason: shouldSave ? "Submitted" : "Exited" }
      }));
    }
    isRedirecting.current = true;
    terminatedRef.current = true;

    try {
      setCompleting(true);
      const collabUrl = shouldSave 
        ? `${COLLABORATION_API_URL}/sessions/${sessionId}/complete`
        : `${COLLABORATION_API_URL}/sessions/${sessionId}`;

      await fetch(collabUrl, {
        method: shouldSave ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetch(`${MATCHING_API_URL}/requests/me/session`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

    } catch (err) {
      console.error("Cleanup failed:", err);
    } finally {
      setCompleting(false);
      window.location.href = "/match";
    }
  }

  const handleActionConfirm = async () => {
    const mode = confirmMode;
    setConfirmMode(null);
    if (mode === "submit") await completeSession(true);
    else if (mode === "leave") await completeSession(false);
  };

  useEffect(() => {
    if (!token || !sessionId || terminatedRef.current || isRedirecting.current) return;
    const wsUrl = import.meta.env.VITE_COLLAB_WS_URL ?? "ws://localhost:8083";
    const ws = new WebSocket(`${wsUrl}/ws/chat/${sessionId}?token=${token}`);
    socketRef.current = ws;
    ws.onopen = () => console.log("[WS] Chat socket opened");
    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        console.log("Valid JSON arrived:", data.type);
        if (data.type === "session_warning") {
          data.payload.cancelled ? cancelCountdown() : startCountdown(data.payload.countdownSeconds);
        } else if (data.type === "chat_message") {
          setMessages((prev) => [...prev, data.payload]);
        } else if (data.type === "chat_history") {
          // --- HANDLES PERSISTED MESSAGES ON RELOAD ---
          setMessages(data.payload);
        } else if (data.type === "session_terminated") {
          if (isRedirecting.current) return;
          isRedirecting.current = true;
          editorRef.current?.disconnect();
          setTerminated(true);
          setTimeout(() => navigate("/match"), 3000);
        }
      } catch (_) {}
    };

    ws.onclose = (e) => {
      console.log("[WS] Chat socket closed", e.code, e.reason);
      setSocket(null);
      if (terminatedRef.current && !isRedirecting.current) {
        isRedirecting.current = true;
        navigate("/match");
      }
    };
    ws.onerror = (e) => console.log("[WS] Chat socket error", e);
    setSocket(ws);
    return () => { ws.close(); socketRef.current = null; cancelCountdown(); };
  }, [sessionId, token, navigate, startCountdown, cancelCountdown, user?.username]);

  useEffect(() => {
    if (!token || !sessionId || isRedirecting.current) return;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${COLLABORATION_API_URL}/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const json = await res.json();
          setSession(json.data);
          // --- HYDRATE MESSAGES FROM INITIAL API LOAD ---
          if (json.data?.messages) setMessages(json.data.messages);
        } else if (res.status === 404 && !isRedirecting.current) {
          setTerminated(true);
        }
      } catch (_) { setError("Failed to load session."); }
      finally { setLoading(false); }
    }
    load();
  }, [sessionId, token]);

  useEffect(() => {
    if (!session?.questionId || !token) return;
    async function loadQuestion() {
      try {
        const res = await fetch(`${QUESTION_API_URL}/${session!.questionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setQuestion(json.data);
        }
      } catch (_) {}
    }
    loadQuestion();
  }, [session?.questionId, token]);
  
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    if (socket && chatInput.trim() && !terminated) {
      socket.send(JSON.stringify({ type: "chat_message", payload: { text: chatInput, username: user?.username } }));
      setChatInput("");
      handleKeepAlive();
    }
  };

  async function runCode() {
    const code = editorRef.current?.getCode();
    if (!code?.trim()) return;
    try {
      setRunning(true);
      setOutput(null);
      setRunError(null);
      const res = await fetch(`${COLLABORATION_API_URL}/sessions/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (json.data?.run?.stderr) setRunError(json.data.run.stderr);
      else setOutput(json.data?.run?.stdout || "(no output)");
    } catch (_) { setRunError("Execution failed."); }
    finally { setRunning(false); }
  }

  async function explainCode() {
    const code = editorRef.current?.getCode();
    if (!code?.trim()) { setExplainError("No code to explain."); return; }
    try {
      setExplaining(true);
      setExplanation(null);
      setExplainError(null);
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: "Explain this code clearly." }, { role: "user", content: code }],
        }),
      });
      const result = await response.json();
      setExplanation(result?.choices?.[0]?.message?.content || "No explanation returned.");
    } catch (err: any) { setExplainError(err.message || "Explanation failed."); }
    finally { setExplaining(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      {warningActive && countdown > 0 && <InactivityWarning secondsLeft={countdown} onKeepAlive={handleKeepAlive} />}
      <main className="mx-auto max-w-7xl px-6 pt-24 pb-12 flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <Card className={`h-full flex flex-col shadow-lg ${terminated ? "border-destructive/40" : "border-primary/10"}`}>
            <CardHeader><CardTitle>Collaboration Session</CardTitle></CardHeader>
            <CardContent className="space-y-6 flex-1">
              {loading && !terminated && <p className="animate-pulse text-sm">Syncing workspace...</p>}
              {error && <p className="text-destructive text-xs">{error}</p>}
              
              {!terminated && session ? (
                <div className="flex flex-col gap-6">
                  {question && (
                    <details className="rounded-lg border border-border/60 bg-muted/20 p-3" open>
                      <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between list-none">
                        <div className="flex items-center gap-2">
                          <span>{question.title}</span>
                          {question.categories?.length > 0 && (
                            <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              [{question.categories.join(", ")}]
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          question.difficulty === "Easy" ? "bg-green-500/20 text-green-400" :
                          question.difficulty === "Medium" ? "bg-amber-500/20 text-amber-400" :
                            "bg-red-500/20 text-red-400"
                        }`}>
                          {question.difficulty}
                        </span>
                      </summary>
                      <div className="mt-3 border-t border-border/40 pt-3 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {question.description}
                        </p>
                        {question.examples?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Examples</p>
                            {question.examples.map((ex: any, i: number) => (
                              <div key={i} className="rounded bg-muted/40 px-3 py-2 text-xs font-mono border border-border/20">
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground w-12 shrink-0">Input:</span> 
                                  <span className="text-foreground">{ex.input}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground w-12 shrink-0">Output:</span> 
                                  <span className="text-foreground">{ex.output}</span>
                                </div>
                                {ex.explanation && (
                                  <div className="mt-1 pt-1 border-t border-border/10 italic text-[11px]">
                                    <span className="text-muted-foreground not-italic font-sans mr-2">Explanation:</span> 
                                    {ex.explanation}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {question.link && (
                          <div className="pt-2">
                            <a 
                              href={question.link} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[10px] text-primary hover:underline flex items-center gap-1"
                            >
                              View on LeetCode <span className="text-xs">→</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold">Shared Editor</h3>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={runCode} disabled={running}>Run</Button>
                        <Button size="sm" variant="outline" onClick={explainCode} disabled={explaining}>Explain</Button>
                      </div>
                    </div>
                    <CodeEditor 
                      ref={editorRef} 
                      sessionId={session.sessionId} 
                      username={user?.username || "Guest"} 
                      token={token || ""} 
                      onActivity={handleKeepAlive} 
                    />
                  </div>

                  {(output || runError) && (
                    <div className="rounded-md border bg-zinc-950 text-zinc-100 font-mono text-xs p-3 max-h-[180px] overflow-y-auto">
                      <div className="flex justify-between mb-2 border-b border-zinc-800 pb-1">
                        <span className="text-zinc-500 uppercase text-[10px]">Terminal Output</span>
                        <button onClick={() => { setOutput(null); setRunError(null); }}>✕</button>
                      </div>
                      {runError ? <pre className="text-rose-400">{runError}</pre> : <pre>{output}</pre>}
                    </div>
                  )}

                  {(explanation || explainError || explaining) && (
                    <div className="rounded-md border border-violet-500/20 bg-violet-950/10 text-sm p-4 max-h-[300px] overflow-y-auto">
                      <div className="flex justify-between mb-3 border-b border-violet-500/20 pb-2">
                        <span className="text-violet-400 uppercase text-[10px] font-bold">✦ AI Explanation</span>
                        <button onClick={() => { setExplanation(null); setExplainError(null); }}>✕</button>
                      </div>
                      {explaining && <div className="text-violet-300 text-xs animate-pulse">Analysing...</div>}
                      {explainError && <p className="text-rose-400 text-xs">{explainError}</p>}
                      {explanation && <div className="text-foreground/80 whitespace-pre-wrap">{explanation}</div>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                  <p className="text-xl font-black uppercase text-zinc-500">Session Ended</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate("/match")}>Return to Match Page</Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/5 pt-6">
              <Button variant="ghost" size="sm" onClick={() => setConfirmMode("leave")} disabled={terminated}>Exit Session</Button>
              <Button size="sm" onClick={() => setConfirmMode("submit")} disabled={!session || completing || terminated}>
                {completing ? "Saving..." : "Submit & Complete"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="w-full md:w-80 flex flex-col border rounded-xl bg-card shadow-lg h-[600px]">
          <div className="p-4 border-b font-bold text-[10px] uppercase text-muted-foreground">Session Chat</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages?.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.username === user?.username ? "items-end" : "items-start"}`}>
                <span className="text-[10px] text-muted-foreground mb-1 font-bold">{m.username}</span>
                <div className={`px-3 py-2 rounded-2xl text-sm ${m.username === user?.username ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
          <div className="p-4 border-t">
            <input 
              disabled={terminated} 
              className="w-full bg-background border rounded px-3 py-2 text-sm" 
              placeholder="Message..." 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && sendMessage()} 
            />
          </div>
        </div>
      </main>

      {/* CONFIRMATION MODALS */}
      {confirmMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader><CardTitle>{confirmMode === "submit" ? "Submit & Save?" : "Leave Session?"}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">This will end the collaboration session.</p></CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmMode(null)}>Cancel</Button>
              <Button variant={confirmMode === "submit" ? "default" : "destructive"} onClick={handleActionConfirm}>Confirm</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}