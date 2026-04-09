import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  COLLABORATION_API_URL,
  MATCHING_API_URL,
  QUESTION_API_URL,
} from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ClassJudgeTestCase,
  CollaborationSessionRecord,
  ExecutionResult,
  FunctionJudgeTestCase,
  JudgeTestCase,
  QuestionRecord,
} from "@/types";
import CodeEditor from "./CollaborationEditor";
import type { CodeEditorHandle } from "./CollaborationEditor";

type ResultTab = "testcase" | "result" | "console";
type SelectedTestCase = `sample-${number}` | "custom";

function InactivityWarning({
  secondsLeft,
  onKeepAlive,
}: {
  secondsLeft: number;
  onKeepAlive: () => void;
}) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr =
    mins > 0
      ? `${mins}m ${secs.toString().padStart(2, "0")}s`
      : `${secs}s`;

  return (
    <div className="fixed top-20 left-1/2 z-[9999] w-full max-w-md -translate-x-1/2 px-4 animate-in slide-in-from-top-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/40 bg-amber-950/90 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
        <div>
          <p className="text-sm font-bold uppercase tracking-tight text-amber-500">
            Inactivity Warning
          </p>
          <p className="mt-0.5 text-xs text-amber-200/80">
            Terminating in{" "}
            <span className="font-mono font-bold text-amber-400">{timeStr}</span>
          </p>
        </div>
        <button
          className="rounded border border-amber-500/40 px-3 py-1 text-sm text-amber-500 hover:bg-amber-500/30"
          onClick={onKeepAlive}
        >
          Stay Connected
        </button>
      </div>
    </div>
  );
}

function isFunctionCase(testCase: JudgeTestCase): testCase is FunctionJudgeTestCase {
  return "args" in testCase;
}

function isClassCase(testCase: JudgeTestCase): testCase is ClassJudgeTestCase {
  return "operations" in testCase;
}

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function verdictStyles(verdict?: string) {
  switch (verdict) {
    case "Accepted":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "Wrong Answer":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "Runtime Error":
    case "Compilation Error":
    case "Time Limit Exceeded":
    case "Memory Limit Exceeded":
    case "Internal Error":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-border/60 bg-muted/20 text-foreground";
  }
}

function buildFunctionCustomState(question: QuestionRecord | null): string {
  const firstCase = question?.visibleTestCases.find(isFunctionCase);
  return toPrettyJson(firstCase?.args || []);
}

function buildClassOperationState(question: QuestionRecord | null): string {
  const firstCase = question?.visibleTestCases.find(isClassCase);
  return toPrettyJson(firstCase?.operations || []);
}

function buildClassArgumentState(question: QuestionRecord | null): string {
  const firstCase = question?.visibleTestCases.find(isClassCase);
  return toPrettyJson(firstCase?.arguments || []);
}

export default function CollaborationPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [session, setSession] = useState<CollaborationSessionRecord | null>(null);
  const [question, setQuestion] = useState<QuestionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [terminated, setTerminated] = useState(false);
  const [warningActive, setWarningActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(
    null,
  );
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [runningMode, setRunningMode] = useState<"run" | "submit" | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>("testcase");
  const [selectedTestCase, setSelectedTestCase] =
    useState<SelectedTestCase>("sample-0");
  const [customFunctionArgs, setCustomFunctionArgs] = useState("[]");
  const [customClassOperations, setCustomClassOperations] = useState("[]");
  const [customClassArguments, setCustomClassArguments] = useState("[]");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"leave" | "submit" | null>(
    null,
  );

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

  const startCountdown = useCallback(
    (seconds: number) => {
      cancelCountdown();
      setCountdown(seconds);
      setWarningActive(true);

      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            window.location.href = "/match";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [cancelCountdown],
  );

  const handleKeepAlive = () => {
    sendKeepAlive();
    cancelCountdown();
  };

  const selectedVisibleCase = useMemo(() => {
    if (!question) return null;
    const index = Number(selectedTestCase.replace("sample-", ""));
    return question.visibleTestCases[index] || null;
  }, [question, selectedTestCase]);

  useEffect(() => {
    if (!question) {
      return;
    }

    setCustomFunctionArgs(buildFunctionCustomState(question));
    setCustomClassOperations(buildClassOperationState(question));
    setCustomClassArguments(buildClassArgumentState(question));
    setSelectedTestCase("sample-0");
  }, [question?.id]);

  async function completeSession(shouldSave = true) {
    if (!token || !sessionId || isRedirecting.current) return;

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
    if (!token || !sessionId || terminatedRef.current || isRedirecting.current) {
      return;
    }

    const wsUrl = import.meta.env.VITE_COLLAB_WS_URL ?? "ws://localhost:8083";
    const ws = new WebSocket(
      `${wsUrl}/ws/chat/${sessionId}?token=${token}&username=${encodeURIComponent(
        user?.username || "User",
      )}`,
    );
    socketRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "session_warning") {
          data.payload.cancelled
            ? cancelCountdown()
            : startCountdown(data.payload.countdownSeconds);
        } else if (data.type === "chat_message") {
          setMessages((prev) => [...prev, data.payload]);
        } else if (data.type === "session_terminated") {
          if (isRedirecting.current) return;
          isRedirecting.current = true;
          editorRef.current?.disconnect();
          setTerminated(true);
          setTimeout(() => navigate("/match"), 3000);
        } else if (data.type === "execution_started") {
          setRunningMode(data.payload?.mode || "run");
          setExecutionError(null);
          setResultTab("result");
        } else if (data.type === "execution_result") {
          setExecutionResult(data.payload);
          setRunningMode(null);
          setExecutionError(null);
          setResultTab("result");
        }
      } catch {
        // Ignore non-JSON noise.
      }
    };

    ws.onclose = () => {
      setSocket(null);
      if (terminatedRef.current && !isRedirecting.current) {
        isRedirecting.current = true;
        navigate("/match");
      }
    };
    ws.onerror = () => undefined;
    setSocket(ws);

    return () => {
      ws.close();
      socketRef.current = null;
      cancelCountdown();
    };
  }, [
    cancelCountdown,
    navigate,
    sessionId,
    startCountdown,
    token,
    user?.username,
  ]);

  useEffect(() => {
    if (!token || !sessionId || isRedirecting.current) return;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${COLLABORATION_API_URL}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setSession(json.data);
          setExecutionResult(json.data?.lastExecutionResult || null);
          if (json.data?.messages) setMessages(json.data.messages);
        } else if (res.status === 404 && !isRedirecting.current) {
          setTerminated(true);
        }
      } catch {
        setError("Failed to load session.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [sessionId, token]);

  useEffect(() => {
    if (!session?.questionId || !token) return;
    const questionId = session.questionId;

    async function loadQuestion() {
      try {
        const res = await fetch(`${QUESTION_API_URL}/${questionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setQuestion(json.data);
        }
      } catch {
        // Ignore question fetch errors here; the page already has a session shell.
      }
    }

    void loadQuestion();
  }, [session?.questionId, token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (socket && chatInput.trim() && !terminated) {
      socket.send(
        JSON.stringify({
          type: "chat_message",
          payload: { text: chatInput, username: user?.username },
        }),
      );
      setChatInput("");
      handleKeepAlive();
    }
  };

  async function explainCode() {
    const code = editorRef.current?.getCode();
    if (!code?.trim()) {
      setExplainError("No code to explain.");
      return;
    }

    try {
      setExplaining(true);
      setExplanation(null);
      setExplainError(null);
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "Explain this code clearly." },
            { role: "user", content: code },
          ],
        }),
      });
      const result = await response.json();
      setExplanation(result?.choices?.[0]?.message?.content || "No explanation returned.");
    } catch (err: any) {
      setExplainError(err.message || "Explanation failed.");
    } finally {
      setExplaining(false);
    }
  }

  function buildCustomPayload() {
    if (!question || selectedTestCase !== "custom") {
      return undefined;
    }

    if (question.executionMode === "python_function") {
      const parsedArgs = JSON.parse(customFunctionArgs);
      if (!Array.isArray(parsedArgs)) {
        throw new Error("Custom args must be a JSON array.");
      }
      return { args: parsedArgs };
    }

    const operations = JSON.parse(customClassOperations);
    const argumentsPayload = JSON.parse(customClassArguments);

    if (!Array.isArray(operations) || !Array.isArray(argumentsPayload)) {
      throw new Error("Operations and arguments must both be JSON arrays.");
    }
    if (operations.length !== argumentsPayload.length) {
      throw new Error("Operations and arguments must be the same length.");
    }

    return {
      operations,
      arguments: argumentsPayload,
    };
  }

  async function execute(mode: "run" | "submit") {
    const code = editorRef.current?.getCode();
    if (!code?.trim() || !token || !sessionId) {
      setExecutionError("No code to execute.");
      setResultTab("result");
      return;
    }

    try {
      setExecutionError(null);
      setRunningMode(mode);
      setResultTab("result");

      const body: Record<string, unknown> = { code };
      const customPayload = buildCustomPayload();
      if (customPayload) {
        body.customTestCase = customPayload;
      }

      const response = await fetch(
        `${COLLABORATION_API_URL}/sessions/${sessionId}/${mode}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      const json = await response.json();
      if (!response.ok) {
        setExecutionError(json.error || `Failed to ${mode} code.`);
        return;
      }

      setExecutionResult(json.data);
    } catch (err) {
      setExecutionError(
        err instanceof Error ? err.message : `Failed to ${mode} code.`,
      );
    } finally {
      setRunningMode(null);
    }
  }

  const latestExecutionLabel = useMemo(() => {
    if (!executionResult) return "";
    return executionResult.initiatedByUserId === user?.id ? "You" : "Your partner";
  }, [executionResult, user?.id]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      {warningActive && countdown > 0 && (
        <InactivityWarning
          secondsLeft={countdown}
          onKeepAlive={handleKeepAlive}
        />
      )}

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-12 pt-24 md:flex-row">
        <div className="min-w-0 flex-1">
          <Card
            className={`flex h-full flex-col shadow-lg ${
              terminated ? "border-destructive/40" : "border-primary/10"
            }`}
          >
            <CardHeader>
              <CardTitle>Collaboration Session</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              {loading && !terminated && (
                <p className="animate-pulse text-sm">Syncing workspace...</p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}

              {!terminated && session ? (
                <div className="space-y-6">
                  {question && (
                    <details className="rounded-lg border border-border/60 bg-muted/20 p-3" open>
                      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{question.title}</span>
                          {question.categories.length > 0 && (
                            <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              [{question.categories.join(", ")}]
                            </span>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            question.difficulty === "Easy"
                              ? "bg-green-500/20 text-green-400"
                              : question.difficulty === "Medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {question.difficulty}
                        </span>
                      </summary>
                      <div className="space-y-4 border-t border-border/40 pt-3">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {question.description}
                        </p>

                        {question.judgeConfig && (
                          <div className="space-y-2 rounded-md border border-border/40 bg-background/60 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Starter Code / Signature
                            </p>
                            <div className="text-xs text-muted-foreground">
                              {question.executionMode === "python_function"
                                ? `class ${question.judgeConfig.className} -> ${question.judgeConfig.methodName}(...)`
                                : `class ${question.judgeConfig.className}`}
                            </div>
                            <pre className="max-h-48 overflow-auto rounded bg-zinc-950 p-3 text-xs text-zinc-100">
                              {question.starterCode.python}
                            </pre>
                          </div>
                        )}

                        {question.examples.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Examples
                            </p>
                            {question.examples.map((example, index) => (
                              <div
                                key={index}
                                className="rounded border border-border/20 bg-muted/40 px-3 py-2 text-xs"
                              >
                                <div className="flex gap-2">
                                  <span className="w-16 shrink-0 text-muted-foreground">
                                    Input:
                                  </span>
                                  <span>{example.input}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="w-16 shrink-0 text-muted-foreground">
                                    Output:
                                  </span>
                                  <span>{example.output}</span>
                                </div>
                                {example.explanation && (
                                  <div className="mt-1 border-t border-border/10 pt-1 text-[11px] italic">
                                    <span className="mr-2 not-italic text-muted-foreground">
                                      Explanation:
                                    </span>
                                    {example.explanation}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {question.visibleTestCases.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Sample Testcases
                            </p>
                            {question.visibleTestCases.map((testCase, index) => (
                              <div
                                key={testCase.id}
                                className="rounded border border-border/20 bg-background/70 p-3 text-xs"
                              >
                                <div className="mb-1 font-semibold text-foreground">
                                  Sample {index + 1}
                                </div>
                                <pre className="overflow-auto whitespace-pre-wrap text-muted-foreground">
                                  {toPrettyJson(testCase)}
                                </pre>
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
                              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                            >
                              View on LeetCode <span className="text-xs">→</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Shared Editor</h3>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => execute("run")}
                          disabled={runningMode !== null}
                        >
                          {runningMode === "run" ? "Running..." : "Run"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => execute("submit")}
                          disabled={runningMode !== null}
                        >
                          {runningMode === "submit" ? "Submitting..." : "Submit"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={explainCode}
                          disabled={explaining}
                        >
                          Explain
                        </Button>
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

                  <div className="space-y-4 rounded-xl border border-border/60 bg-card/70 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={resultTab === "testcase" ? "default" : "outline"}
                        onClick={() => setResultTab("testcase")}
                      >
                        Testcase
                      </Button>
                      <Button
                        size="sm"
                        variant={resultTab === "result" ? "default" : "outline"}
                        onClick={() => setResultTab("result")}
                      >
                        Result
                      </Button>
                      <Button
                        size="sm"
                        variant={resultTab === "console" ? "default" : "outline"}
                        onClick={() => setResultTab("console")}
                      >
                        Console
                      </Button>
                    </div>

                    {resultTab === "testcase" && question && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {question.visibleTestCases.map((testCase, index) => (
                            <Button
                              key={testCase.id}
                              size="sm"
                              variant={
                                selectedTestCase === `sample-${index}`
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                setSelectedTestCase(`sample-${index}`)
                              }
                            >
                              Sample {index + 1}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant={
                              selectedTestCase === "custom" ? "default" : "outline"
                            }
                            onClick={() => setSelectedTestCase("custom")}
                          >
                            Custom
                          </Button>
                        </div>

                        {selectedTestCase === "custom" ? (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Running with a custom testcase executes only the
                              custom input and returns output/error details.
                            </p>
                            {question.executionMode === "python_function" ? (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Args JSON
                                </p>
                                <textarea
                                  className="min-h-32 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                  value={customFunctionArgs}
                                  onChange={(event) =>
                                    setCustomFunctionArgs(event.target.value)
                                  }
                                />
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Operations JSON
                                  </p>
                                  <textarea
                                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                    value={customClassOperations}
                                    onChange={(event) =>
                                      setCustomClassOperations(event.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Arguments JSON
                                  </p>
                                  <textarea
                                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                    value={customClassArguments}
                                    onChange={(event) =>
                                      setCustomClassArguments(event.target.value)
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Run will execute all visible sample testcases.
                            </p>
                            {selectedVisibleCase && (
                              <pre className="max-h-72 overflow-auto rounded-md border bg-zinc-950 p-3 text-xs text-zinc-100">
                                {toPrettyJson(selectedVisibleCase)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {resultTab === "result" && (
                      <div className="space-y-4">
                        {runningMode && (
                          <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                            {runningMode === "run"
                              ? "Running shared testcases..."
                              : "Submitting shared solution..."}
                          </div>
                        )}
                        {executionError && (
                          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                            {executionError}
                          </div>
                        )}
                        {executionResult && (
                          <>
                            <div
                              className={`rounded-md border px-4 py-3 ${verdictStyles(
                                executionResult.verdict,
                              )}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs uppercase tracking-wider opacity-80">
                                    {executionResult.mode === "submit"
                                      ? "Submission Verdict"
                                      : "Run Result"}
                                  </div>
                                  <div className="text-lg font-semibold">
                                    {executionResult.verdict}
                                  </div>
                                </div>
                                <div className="text-right text-xs opacity-90">
                                  <div>
                                    Triggered by {latestExecutionLabel || "a collaborator"}
                                  </div>
                                  <div>
                                    {new Date(
                                      executionResult.initiatedAt,
                                    ).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                                <span>
                                  Passed {executionResult.passedCount}/
                                  {executionResult.totalCount}
                                </span>
                                <span>Runtime {executionResult.runtimeMs} ms</span>
                                <span>Memory {executionResult.memoryKb} KB</span>
                              </div>
                            </div>

                            {executionResult.cases.length > 0 ? (
                              <div className="space-y-3">
                                {executionResult.cases.map((testCase) => (
                                  <div
                                    key={testCase.id}
                                    className="rounded-md border border-border/60 bg-background/60 p-3 text-sm"
                                  >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <div className="font-medium">{testCase.id}</div>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${verdictStyles(
                                          testCase.verdict,
                                        )}`}
                                      >
                                        {testCase.verdict}
                                      </span>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <div>
                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                          Input
                                        </div>
                                        <pre className="overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-100">
                                          {testCase.inputPreview || "(none)"}
                                        </pre>
                                      </div>
                                      <div>
                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                          Expected
                                        </div>
                                        <pre className="overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-100">
                                          {testCase.expectedPreview || "(custom testcase)"}
                                        </pre>
                                      </div>
                                      <div>
                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                          Actual
                                        </div>
                                        <pre className="overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-100">
                                          {testCase.actualPreview || "(none)"}
                                        </pre>
                                      </div>
                                    </div>
                                    {testCase.errorMessage && (
                                      <p className="mt-3 text-xs text-rose-300">
                                        {testCase.errorMessage}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No per-case details were returned for this result.
                              </p>
                            )}
                          </>
                        )}
                        {!runningMode && !executionError && !executionResult && (
                          <p className="text-sm text-muted-foreground">
                            Run sample testcases or submit the shared solution to
                            see verdicts here.
                          </p>
                        )}
                      </div>
                    )}

                    {resultTab === "console" && (
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Stdout
                          </div>
                          <pre className="max-h-48 overflow-auto rounded-md border bg-zinc-950 p-3 text-xs text-zinc-100">
                            {executionResult?.stdout || "(no stdout)"}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Stderr
                          </div>
                          <pre className="max-h-48 overflow-auto rounded-md border bg-zinc-950 p-3 text-xs text-rose-300">
                            {executionResult?.stderr || "(no stderr)"}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {(explanation || explainError || explaining) && (
                    <div className="max-h-[300px] overflow-y-auto rounded-md border border-violet-500/20 bg-violet-950/10 p-4 text-sm">
                      <div className="mb-3 flex justify-between border-b border-violet-500/20 pb-2">
                        <span className="text-[10px] font-bold uppercase text-violet-400">
                          ✦ AI Explanation
                        </span>
                        <button
                          onClick={() => {
                            setExplanation(null);
                            setExplainError(null);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      {explaining && (
                        <div className="animate-pulse text-xs text-violet-300">
                          Analysing...
                        </div>
                      )}
                      {explainError && (
                        <p className="text-xs text-rose-400">{explainError}</p>
                      )}
                      {explanation && (
                        <div className="whitespace-pre-wrap text-foreground/80">
                          {explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed">
                  <p className="text-xl font-black uppercase text-zinc-500">
                    Session Ended
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/match")}
                  >
                    Return to Match Page
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-muted/5 pt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmMode("leave")}
                disabled={terminated}
              >
                Exit Session
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmMode("submit")}
                disabled={!session || completing || terminated}
              >
                {completing ? "Saving..." : "Submit & Complete"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="flex h-[600px] w-full flex-col rounded-xl border bg-card shadow-lg md:w-80">
          <div className="border-b p-4 text-[10px] font-bold uppercase text-muted-foreground">
            Session Chat
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages?.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  message.username === user?.username
                    ? "items-end"
                    : "items-start"
                }`}
              >
                <span className="mb-1 text-[10px] font-bold text-muted-foreground">
                  {message.username}
                </span>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    message.username === user?.username
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
          <div className="border-t p-4">
            <input
              disabled={terminated}
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              placeholder="Message..."
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && sendMessage()}
            />
          </div>
        </div>
      </main>

      {confirmMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle>
                {confirmMode === "submit" ? "Submit & Save?" : "Leave Session?"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This will end the collaboration session.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmMode(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmMode === "submit" ? "default" : "destructive"}
                onClick={handleActionConfirm}
              >
                Confirm
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
