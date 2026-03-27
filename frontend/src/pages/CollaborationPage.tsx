import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COLLABORATION_API_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import type { CollaborationSessionRecord } from "@/types";
import CodeEditor from "./CollaborationEditor";
import type { CodeEditorHandle } from "./CollaborationEditor";


export default function CollaborationPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [session, setSession] = useState<CollaborationSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<{fromUserId: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

  const sendMessage = () => {
  if (socket && chatInput.trim()) {
    socket.send(JSON.stringify({
      type: "chat_message",
      payload: { text: chatInput }
    }));
    setChatInput("");
  }
};

  useEffect(() => {
    if (!token || !sessionId) return;

  const wsUrl = import.meta.env.VITE_COLLAB_WS_URL ?? "ws://localhost:4003";
  const ws = new WebSocket(`${wsUrl}/ws/chat/${sessionId}?token=${token}`);

  ws.onopen = () => console.log("[Chat] Connected");
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      if (data.type === "chat_message") {
        setMessages(prev => [...prev, data.payload as {fromUserId: string, text: string}]);
      }
    } catch {
    }
  };

  ws.onclose = () => console.log("[Chat] Disconnected");

  setSocket(ws);

  return () => {
    ws.close();
  };
}, [sessionId, token]);

  useEffect(() => {
    if (!token || !sessionId) {
      return;
    }

    let cancelled = false;

    async function loadSession(): Promise<void> {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${COLLABORATION_API_URL}/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await response.json()) as {
          data?: CollaborationSessionRecord;
          error?: string;
        };

        if (!response.ok || !json.data) {
          throw new Error(json.error || "Failed to load collaboration session.");
        }

        if (!cancelled) {
          setSession(json.data);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load collaboration session.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  async function completeSession(): Promise<void> {
    if (!token || !sessionId) {
      return;
    }

    try {
      setCompleting(true);
      setError("");

      const response = await fetch(
        `${COLLABORATION_API_URL}/${sessionId}/complete`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = (await response.json()) as {
        data?: CollaborationSessionRecord;
        error?: string;
      };

      if (!response.ok || !json.data) {
        throw new Error(json.error || "Failed to complete collaboration session.");
      }

      setSession(json.data);
      navigate("/match");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to complete collaboration session.",
      );
    } finally {
      setCompleting(false);
    }
  }

return (
  <div className="min-h-screen bg-background text-foreground">
    <Navbar />
    <main className="mx-auto max-w-7xl px-6 pt-24 pb-12 flex flex-col md:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Collaboration Session</CardTitle>
            <CardDescription>Solve the problem together in real-time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            {loading && <p className="text-sm text-muted-foreground">Loading session...</p>}
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {session && (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 md:col-span-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Session ID</div>
                    <div className="mt-1 font-mono text-xs truncate">{session.sessionId}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Topic</div>
                    <div className="mt-1 text-xs font-medium">{session.topic}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Difficulty</div>
                    <div className="mt-1 text-xs font-medium">{session.difficulty}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Shared Editor ({session.language})</h3>
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-muted-foreground uppercase">Live</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editorRef.current?.format()}
                  >
                    Format
                  </Button>
                  <CodeEditor
                    ref={editorRef}
                    sessionId={session.sessionId}
                    username={user?.username || "Guest"}
                    token={token || ""}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Signed in as <span className="text-foreground font-medium">{user?.username}</span>
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t bg-muted/10 pt-6">
            <Link to="/match">
              <Button variant="ghost" size="sm">Exit Session</Button>
            </Link>
            <Button
              size="sm"
              onClick={completeSession}
              disabled={!session || session.status === "completed" || completing}
            >
              {completing ? "Saving..." : "Submit & Complete"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="w-full md:w-80 flex flex-col border rounded-xl bg-card shadow-sm h-[600px]">
        <div className="p-4 border-b bg-muted/20">
          <span className="font-bold text-sm">Session Chat</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.fromUserId === user?.username ? "items-end" : "items-start"}`}>
              <span className="text-[10px] text-muted-foreground mb-1">{m.fromUserId}</span>
              <div className={`px-3 py-2 rounded-2xl text-sm max-w-[90%] ${
                m.fromUserId === user?.username
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-muted text-foreground rounded-tl-none"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-muted/10">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-background border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button size="sm" onClick={sendMessage}>Send</Button>
          </div>
        </div>
      </div>

    </main>
  </div>
); 
}