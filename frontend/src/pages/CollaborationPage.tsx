import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

const ACTIVE_SESSION_STORAGE_KEY = "active_collaboration_session";

type ResultTab = "testcase" | "result" | "console" | "chat";
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

function toDisplayJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
}

function verdictStyles(verdict?: string) {
  switch (verdict) {
    case "Accepted":
      return "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "Wrong Answer":
      return "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
    case "Runtime Error":
    case "Compilation Error":
    case "Time Limit Exceeded":
    case "Memory Limit Exceeded":
    case "Internal Error":
      return "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
    default:
      return "border-border/60 bg-muted/20 text-foreground";
  }
}

function workspaceTabStyles(tab: ResultTab, activeTab: ResultTab) {
  if (tab !== activeTab) {
    return "border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
  }

  switch (tab) {
    case "testcase":
      return "border-sky-200 bg-sky-100 text-sky-900 shadow-sm hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100";
    case "result":
      return "border-amber-200 bg-amber-100 text-amber-900 shadow-sm hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-100";
    case "console":
      return "border-indigo-200 bg-indigo-100 text-indigo-900 shadow-sm hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100";
    case "chat":
      return "border-emerald-200 bg-emerald-100 text-emerald-900 shadow-sm hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100";
    default:
      return "";
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

function ValuePreview({
  label,
  value,
  emptyLabel = "(none)",
}: {
  label: string;
  value: unknown;
  emptyLabel?: string;
}) {
  const serialized =
    value === undefined || value === null || value === ""
      ? emptyLabel
      : toDisplayJson(value);

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <pre className="overflow-auto rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-3 text-sm text-slate-800 shadow-inner dark:border-slate-800 dark:bg-slate-950/75 dark:text-slate-100">
        {serialized}
      </pre>
    </div>
  );
}

function FunctionTestCaseView({
  testCase,
  title,
  showExpected = true,
}: {
  testCase: FunctionJudgeTestCase;
  title?: string;
  showExpected?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/45">
      {title && <div className="text-base font-semibold text-foreground">{title}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        <ValuePreview label="Arguments" value={testCase.args} emptyLabel="[]" />
        {showExpected && (
          <ValuePreview
            label="Expected Output"
            value={testCase.expected}
            emptyLabel="(not provided)"
          />
        )}
      </div>
    </div>
  );
}

function ClassTestCaseView({
  testCase,
  title,
  showExpected = true,
}: {
  testCase: ClassJudgeTestCase;
  title?: string;
  showExpected?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/45">
      {title && <div className="text-base font-semibold text-foreground">{title}</div>}
      <div className="grid gap-3 md:grid-cols-3">
        <ValuePreview
          label="Operations"
          value={testCase.operations}
          emptyLabel="[]"
        />
        <ValuePreview
          label="Arguments"
          value={testCase.arguments}
          emptyLabel="[]"
        />
        {showExpected && (
          <ValuePreview
            label="Expected Output"
            value={testCase.expected}
            emptyLabel="(not provided)"
          />
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          Call Flow
        </div>
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
          {testCase.operations.map((operation, index) => (
            <div
              key={`${testCase.id}-${operation}-${index}`}
              className="grid gap-2 px-3 py-3 text-sm md:grid-cols-[64px_1fr_1fr_1fr]"
            >
              <span className="font-semibold text-muted-foreground">
                Step {index + 1}
              </span>
              <span className="font-mono text-foreground">{operation}</span>
              <span className="font-mono text-muted-foreground">
                {toDisplayJson(testCase.arguments[index] ?? [])}
              </span>
              {showExpected && (
                <span className="font-mono text-emerald-700 dark:text-emerald-300">
                  {toDisplayJson(testCase.expected?.[index])}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TestCaseView({
  testCase,
  title,
  showExpected = true,
}: {
  testCase: JudgeTestCase;
  title?: string;
  showExpected?: boolean;
}) {
  if (isFunctionCase(testCase)) {
    return (
      <FunctionTestCaseView
        testCase={testCase}
        title={title}
        showExpected={showExpected}
      />
    );
  }

  return (
    <ClassTestCaseView
      testCase={testCase}
      title={title}
      showExpected={showExpected}
    />
  );
}

function renderInlineText(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md border border-sky-200/80 bg-sky-50 px-1.5 py-0.5 font-mono text-[12px] text-sky-950 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function ExplanationContent({ content }: { content: string }) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const elements: ReactNode[] = [];
  const lines = normalized.split("\n");

  for (let index = 0; index < lines.length;) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      elements.push(
        <div
          key={`code-${elements.length}`}
          className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80"
        >
          {language && (
            <div className="border-b border-slate-200/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto p-3 text-xs text-slate-800 dark:text-slate-100">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>,
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      elements.push(
        <h4
          key={`heading-${elements.length}`}
          className="text-sm font-semibold text-slate-900 dark:text-sky-100"
        >
          {headingMatch[2]}
        </h4>,
      );
      index += 1;
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const match = lines[index].match(/^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }

      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc space-y-2 pl-5 text-foreground/80">
          {items.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`}>{renderInlineText(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const match = lines[index].match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }

      elements.push(
        <ol key={`ol-${elements.length}`} className="list-decimal space-y-2 pl-5 text-foreground/80">
          {items.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`}>{renderInlineText(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      if (
        lines[index].startsWith("```") ||
        /^#{1,6}\s+/.test(lines[index]) ||
        /^[-*]\s+/.test(lines[index]) ||
        /^\d+\.\s+/.test(lines[index])
      ) {
        break;
      }
      paragraphLines.push(lines[index]);
      index += 1;
    }

    elements.push(
      <p key={`p-${elements.length}`} className="leading-7 text-foreground/80">
        {paragraphLines.map((paragraphLine, paragraphIndex) => (
          <Fragment key={`paragraph-${paragraphIndex}`}>
            {paragraphIndex > 0 && <br />}
            {renderInlineText(paragraphLine)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className="space-y-4">{elements}</div>;
}

export default function CollaborationPage() {
  const CHAT_RECONNECT_DELAY_MS = 2000;
  const CHAT_MAX_RECONNECT_ATTEMPTS = 10;
  const SESSION_RETRY_DELAY_MS = 3000;
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [session, setSession] = useState<CollaborationSessionRecord | null>(null);
  const [question, setQuestion] = useState<QuestionRecord | null>(null);
  const [questionCatalog, setQuestionCatalog] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [terminated, setTerminated] = useState(false);
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
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
  const [switchingQuestion, setSwitchingQuestion] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"leave" | "submit" | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [chatStatus, setChatStatus] = useState<
    "connecting" | "connected" | "reconnecting" | "offline"
  >(
    typeof navigator !== "undefined" && !navigator.onLine
      ? "offline"
      : "connecting",
  );
  const [editorStatus, setEditorStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const selectedVisibleCase = useMemo(() => {
    if (!question) return null;
    const index = Number(selectedTestCase.replace("sample-", ""));
    return question.visibleTestCases[index] || null;
  }, [question, selectedTestCase]);

  const currentQuestionIndex = useMemo(() => {
    if (!session?.questionId) return -1;
    return questionCatalog.findIndex(
      (catalogQuestion) => catalogQuestion.id === session.questionId,
    );
  }, [questionCatalog, session?.questionId]);

  const syncQuestionChange = useCallback(
    (nextQuestionId: string, nextTopic?: string, nextDifficulty?: string) => {
      setSession((previous) =>
        previous
          ? {
              ...previous,
              questionId: nextQuestionId,
              topic: nextTopic || previous.topic,
              difficulty: nextDifficulty || previous.difficulty,
              lastExecutionResult: null,
              lastExecutionAt: undefined,
              lastSubmittedAt: undefined,
            }
          : previous,
      );
      setQuestion(null);
      setExecutionResult(null);
      setExecutionError(null);
      setExplainError(null);
      setExplanation(null);
      setResultTab("testcase");
    },
    [],
  );

  const editorRef = useRef<CodeEditorHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatCleanupRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminatedRef = useRef(false);
  const isRedirecting = useRef(false);
  const executionStartedAtRef = useRef<string | null>(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearSessionRetryTimer = useCallback(() => {
    if (sessionRetryTimerRef.current) {
      clearTimeout(sessionRetryTimerRef.current);
      sessionRetryTimerRef.current = null;
    }
  }, []);

  const sendKeepAlive = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "keep_alive", payload: {} }));
    }
  }, []);

  const sendActivity = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "activity", payload: {} }));
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
          window.location.href = "/match";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cancelCountdown]);

  const handleKeepAlive = () => {
    cancelCountdown();
    sendKeepAlive();
  };

  const applyExecutionResult = useCallback((result: ExecutionResult | null) => {
    setExecutionResult(result);
    setRunningMode(null);
    setExecutionError(null);
    if (result) {
      executionStartedAtRef.current = result.initiatedAt;
      setSession((previous) =>
        previous
          ? {
              ...previous,
              lastExecutionResult: result,
              lastExecutionAt: result.initiatedAt,
              lastSubmittedAt:
                result.mode === "submit"
                  ? result.initiatedAt
                  : previous.lastSubmittedAt,
            }
          : previous,
      );
    }
  }, []);

  useEffect(() => {
    if (!question) {
      return;
    }

    setCustomFunctionArgs(buildFunctionCustomState(question));
    setCustomClassOperations(buildClassOperationState(question));
    setCustomClassArguments(buildClassArgumentState(question));
    setSelectedTestCase("sample-0");
  }, [question?.id]);

  useEffect(() => {
    if (!token) return;

    async function loadQuestionCatalog() {
      try {
        const response = await fetch(
          `${QUESTION_API_URL}?executionModes=python_function,python_class`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!response.ok) {
          return;
        }

        const json = await response.json();
        setQuestionCatalog(Array.isArray(json.data) ? json.data : []);
      } catch {
        // Keep the collaboration page usable even if the temporary switcher fails.
      }
    }

    void loadQuestionCatalog();
  }, [token]);

  async function completeSession(shouldSave: boolean = true) {
  if (!token || !sessionId || isRedirecting.current) return;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "explicit_leave",
      payload: {
        reason: shouldSave ? "submitted the solution" : "left the session"
      }
    }));
  }

  isRedirecting.current = true;
  terminatedRef.current = true;

    try {
      setCompleting(true);
      const collabUrl = shouldSave
        ? `${COLLABORATION_API_URL}/sessions/${sessionId}/complete`
        : `${COLLABORATION_API_URL}/sessions/${sessionId}`;
      const code = editorRef.current?.getCode() ?? "";

      const collabRes = await fetch(collabUrl, {
        method: shouldSave ? "POST" : "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      if (!collabRes.ok) {
        const json = await collabRes.json().catch(() => ({}));
        throw new Error(json.error || "Failed to complete session.");
      }

      const matchingRes = await fetch(`${MATCHING_API_URL}/requests/me/session`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!matchingRes.ok) {
        const json = await matchingRes.json().catch(() => ({}));
        throw new Error(json.error || "Failed to clear match state.");
      }
    } catch (err) {
      console.error("Cleanup failed:", err);
      setError(err instanceof Error ? err.message : "Failed to end session.");
      isRedirecting.current = false;
      terminatedRef.current = false;
    } finally {
      setCompleting(false);
      if (isRedirecting.current) {
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        window.location.href = "/match";
      }
    }
  }

  const handleActionConfirm = async () => {
    const mode = confirmMode;
    setConfirmMode(null);
    if (mode === "submit") await completeSession(true);
    else if (mode === "leave") await completeSession(false);
  };

  const redirectAfterSharedCompletion = useCallback(
    (outcome: "submitted" | "ended") => {
      if (isRedirecting.current) {
        return;
      }

      isRedirecting.current = true;
      terminatedRef.current = true;
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      editorRef.current?.disconnect();
      setSessionUnavailable(false);
      setTerminated(true);
      setError(
        outcome === "submitted"
          ? "The collaboration session was completed and submitted."
          : "The collaboration session was ended.",
      );
      setTimeout(() => navigate("/match"), 1500);
    },
    [navigate],
  );

  const connectChatSocket = useCallback(() => {
    if (
      !token ||
      !sessionId ||
      terminatedRef.current ||
      isRedirecting.current ||
      chatCleanupRef.current
    ) {
      return;
    }

    const currentSocket = socketRef.current;
    if (
      currentSocket &&
      (currentSocket.readyState === WebSocket.OPEN ||
        currentSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = import.meta.env.VITE_COLLAB_WS_URL ?? "ws://localhost:8083";
    const ws = new WebSocket(
      `${wsUrl}/ws/chat/${sessionId}?token=${token}&username=${encodeURIComponent(
        user?.username || "Guest",
      )}`,
    );
    socketRef.current = ws;
    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      clearReconnectTimer();
      setPeerOnline(false);
      setChatStatus("connected");
    };

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
        } else if (data.type === "chat_history") {
          setMessages(data.payload);
        } else if (data.type === "peer_status_snapshot") {
          const onlineUserIds: string[] = data.payload?.onlineUserIds ?? [];
          setPeerOnline(
            onlineUserIds.some((onlineUserId) => onlineUserId !== user?.id),
          );
        } else if (data.type === "peer_status_change") {
          if (data.payload.userId !== user?.id) {
            setPeerOnline(data.payload.isConnected);
          }
        } else if (data.type === "session_completed") {
          redirectAfterSharedCompletion(data.payload?.outcome || "ended");
        } else if (data.type === "session_terminated") {
          if (isRedirecting.current) return;
          isRedirecting.current = true;
          localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          editorRef.current?.disconnect();
          setSessionUnavailable(false);
          setTerminated(true);
          setTimeout(() => navigate("/match"), 3000);
        } else if (data.type === "execution_started") {
          executionStartedAtRef.current = data.payload?.initiatedAt || null;
          setRunningMode(data.payload?.mode || "run");
          setExecutionResult(null);
          setExecutionError(null);
          setResultTab("result");
        } else if (data.type === "execution_result") {
          applyExecutionResult(data.payload);
          setResultTab("result");
        } else if (data.type === "question_switched") {
          syncQuestionChange(
            data.payload?.questionId,
            data.payload?.topic,
            data.payload?.difficulty,
          );
        }
      } catch {
        // Ignore non-JSON noise.
      }
    };

    ws.onclose = () => {
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
      setPeerOnline(false);
      if (!navigator.onLine) {
        setChatStatus("offline");
      } else {
        setChatStatus("reconnecting");
      }
      if (terminatedRef.current && !isRedirecting.current) {
        isRedirecting.current = true;
        navigate("/match");
        return;
      }

      if (
        chatCleanupRef.current ||
        isRedirecting.current ||
        terminatedRef.current ||
        reconnectAttemptsRef.current >= CHAT_MAX_RECONNECT_ATTEMPTS
      ) {
        return;
      }

      reconnectAttemptsRef.current += 1;
      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        connectChatSocket();
      }, CHAT_RECONNECT_DELAY_MS * reconnectAttemptsRef.current);
    };
    ws.onerror = () => {
      setPeerOnline(false);
      ws.close();
    };
  }, [
    applyExecutionResult,
    cancelCountdown,
    clearReconnectTimer,
    navigate,
    redirectAfterSharedCompletion,
    sessionId,
    startCountdown,
    syncQuestionChange,
    token,
    user?.id,
    user?.username,
  ]);

  useEffect(() => {
    if (!token || !sessionId || terminatedRef.current || isRedirecting.current) return;
    chatCleanupRef.current = false;
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
    connectChatSocket();

    const handleOnline = () => {
      reconnectAttemptsRef.current = 0;
      setChatStatus("reconnecting");
      connectChatSocket();
    };

    const handleOffline = () => {
      setChatStatus("offline");
      setPeerOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      chatCleanupRef.current = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearReconnectTimer();
      clearSessionRetryTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [clearReconnectTimer, clearSessionRetryTimer, connectChatSocket, sessionId, token]);

  const loadSession = useCallback(async () => {
    if (!token || !sessionId || isRedirecting.current) return;

    try {
      setLoading(true);
      setSessionUnavailable(false);
      setError("");
      const res = await fetch(`${COLLABORATION_API_URL}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.status === "completed" && !isRedirecting.current) {
          redirectAfterSharedCompletion(
            json.data?.lastSubmittedAt ? "submitted" : "ended",
          );
          return;
        }
        setSession(json.data);
        setSessionUnavailable(false);
        clearSessionRetryTimer();
        if (json.data?.lastExecutionResult) {
          applyExecutionResult(json.data.lastExecutionResult);
        } else {
          setExecutionResult(null);
        }
        if (json.data?.messages) setMessages(json.data.messages);
      } else if (res.status === 404 && !isRedirecting.current) {
        setSession(null);
        setSessionUnavailable(true);
        setError("The collaboration session is unavailable right now.");
      } else {
        setSession(null);
        setSessionUnavailable(true);
        setError("Unable to reach the collaboration service right now.");
      }
    } catch (_) {
      setSession(null);
      setSessionUnavailable(true);
      setError("Unable to reach the collaboration service right now.");
    } finally {
      setLoading(false);
    }
  }, [
    applyExecutionResult,
    clearSessionRetryTimer,
    redirectAfterSharedCompletion,
    sessionId,
    token,
  ]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!sessionUnavailable || terminated || isRedirecting.current) {
      clearSessionRetryTimer();
      return;
    }

    clearSessionRetryTimer();
    sessionRetryTimerRef.current = setTimeout(() => {
      void loadSession();
    }, SESSION_RETRY_DELAY_MS);

    return () => {
      clearSessionRetryTimer();
    };
  }, [clearSessionRetryTimer, loadSession, sessionUnavailable, terminated]);

  useEffect(() => {
    if (!runningMode || !token || !sessionId || terminatedRef.current) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `${COLLABORATION_API_URL}/sessions/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!response.ok || cancelled) {
          return;
        }

        const json = await response.json();
        const latestResult = json.data?.lastExecutionResult as
          | ExecutionResult
          | null
          | undefined;

        if (
          latestResult &&
          (!executionStartedAtRef.current ||
            new Date(latestResult.initiatedAt).getTime() >=
              new Date(executionStartedAtRef.current).getTime())
        ) {
          setSession(json.data);
          applyExecutionResult(latestResult);
          return;
        }

        if (attempts >= 12) {
          setRunningMode(null);
          setExecutionError(
            "Execution finished but the shared result did not sync in time. Please run again.",
          );
        }
      } catch {
        if (attempts >= 12) {
          setRunningMode(null);
        }
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 1500);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [applyExecutionResult, runningMode, sessionId, token]);

  useEffect(() => {
    if (!session?.questionId || !token) return;
    const questionId = session.questionId;

    async function loadQuestion() {
      try {
        setQuestion(null);
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
    if (terminated) {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
  }, [terminated]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (
      socketRef.current?.readyState === WebSocket.OPEN &&
      chatInput.trim() &&
      !terminated
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: "chat_message",
          payload: { text: chatInput, username: user?.username },
        }),
      );
      setChatInput("");
      sendActivity();
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
      const response = await fetch(`${COLLABORATION_API_URL}/sessions/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setExplainError(result?.error || "Explanation failed.");
        return;
      }

      setExplanation(result?.data?.explanation || "");
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

      applyExecutionResult(json.data);
    } catch (err) {
      setExecutionError(
        err instanceof Error ? err.message : `Failed to ${mode} code.`,
      );
    } finally {
      setRunningMode(null);
    }
  }

  async function switchQuestion(nextQuestionId: string) {
    if (
      !token ||
      !sessionId ||
      !nextQuestionId ||
      nextQuestionId === session?.questionId
    ) {
      return;
    }

    try {
      setSwitchingQuestion(true);
      setError("");
      const response = await fetch(
        `${COLLABORATION_API_URL}/sessions/${sessionId}/question`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questionId: nextQuestionId }),
        },
      );

      const json = await response.json();
      if (!response.ok) {
        setError(json.error || "Failed to switch question.");
        return;
      }

      setSession(json.data);
      syncQuestionChange(
        json.data.questionId,
        json.data.topic,
        json.data.difficulty,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to switch question.",
      );
    } finally {
      setSwitchingQuestion(false);
    }
  }

  void switchingQuestion;
  void currentQuestionIndex;
  void switchQuestion;

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

      <main className="relative mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-12 pt-24">
        <div className="pointer-events-none absolute inset-x-6 top-20 -z-10 h-[32rem] rounded-[3rem] bg-gradient-to-br from-sky-100 via-white to-amber-50/90 blur-3xl dark:from-sky-950/20 dark:via-transparent dark:to-slate-950/20" />
        <div className="pointer-events-none absolute right-12 top-56 -z-10 h-40 w-40 rounded-full bg-cyan-100/70 blur-3xl dark:bg-cyan-900/20" />
        <div className="min-w-0">
          <Card
            className={`flex h-full flex-col border shadow-[0_24px_80px_-36px_rgba(15,23,42,0.32)] ${
              terminated
                ? "border-destructive/40 bg-white/95 dark:bg-slate-950/85"
                : "border-slate-200/90 bg-white/95 dark:border-slate-800 dark:bg-slate-950/85"
            }`}
          >
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-3 py-1 text-[11px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-700 dark:bg-sky-300" />
                Live collaboration
              </div>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Collaboration Session
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              {loading && !terminated && (
                <p className="animate-pulse text-sm">Syncing workspace...</p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}

              {!terminated && session ? (
                <div className="space-y-6">
                  {/* Temporary question browser hidden for now.
                  {questionCatalog.length > 0 && (
                    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                            Temporary Question Browser
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Jump through supported questions without leaving this collaboration session.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              currentQuestionIndex > 0 &&
                              switchQuestion(
                                questionCatalog[currentQuestionIndex - 1].id,
                              )
                            }
                            disabled={switchingQuestion || currentQuestionIndex <= 0}
                          >
                            Previous
                          </Button>
                          <select
                            className="min-w-72 rounded-md border bg-background px-3 py-2 text-sm"
                            value={session?.questionId || ""}
                            onChange={(event) => void switchQuestion(event.target.value)}
                            disabled={switchingQuestion}
                          >
                            {questionCatalog.map((catalogQuestion, index) => (
                              <option key={catalogQuestion.id} value={catalogQuestion.id}>
                                {index + 1}. {catalogQuestion.title}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              currentQuestionIndex >= 0 &&
                              currentQuestionIndex < questionCatalog.length - 1 &&
                              switchQuestion(
                                questionCatalog[currentQuestionIndex + 1].id,
                              )
                            }
                            disabled={
                              switchingQuestion ||
                              currentQuestionIndex < 0 ||
                              currentQuestionIndex >= questionCatalog.length - 1
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )} */}

                  {question && (
                    <details className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50/70 to-cyan-50/60 p-4 shadow-[0_16px_40px_-30px_rgba(14,116,144,0.45)] dark:border-slate-800 dark:bg-slate-950/45" open>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{question.title}</span>
                          {question.categories.length > 0 && (
                            <span className="rounded-full border border-sky-200/80 bg-white/90 px-2.5 py-1 text-[11px] text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
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
                      <div className="max-h-[24rem] space-y-4 overflow-y-auto border-t border-slate-200/80 pt-4 pr-1 dark:border-slate-800">
                        <p className="text-base leading-relaxed text-muted-foreground">
                          {question.description}
                        </p>

                        {question.examples.length > 0 && (
                      <div className="space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                              Examples
                            </p>
                            {question.examples.map((example, index) => (
                              <div
                                key={index}
                                className="rounded-xl border border-sky-200/80 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65"
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
                                  <div className="mt-2 border-t border-border/10 pt-2 text-xs italic">
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
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                              Sample Testcases
                            </p>
                            {question.visibleTestCases.map((testCase, index) => (
                              <TestCaseView
                                key={testCase.id}
                                testCase={testCase}
                                title={`Sample ${index + 1}`}
                              />
                            ))}
                          </div>
                        )}

                        {question.link && (
                          <div className="pt-2">
                            <a
                              href={question.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              View on LeetCode <span className="text-xs">→</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  <div className="space-y-4 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/60 to-sky-50/60 p-4 shadow-[0_18px_44px_-32px_rgba(79,70,229,0.42)] dark:border-slate-800 dark:bg-slate-950/35">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-base font-semibold">Shared Editor</h3>
                      <div className="flex flex-wrap gap-2 rounded-xl border border-indigo-200/80 bg-white/90 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                        <Button
                          className="min-w-24"
                          onClick={() => execute("run")}
                          disabled={runningMode !== null}
                        >
                          {runningMode === "run" ? "Running..." : "Run"}
                        </Button>
                        <Button
                          className="min-w-24"
                          onClick={() => execute("submit")}
                          disabled={runningMode !== null}
                        >
                          {runningMode === "submit" ? "Submitting..." : "Submit"}
                        </Button>
                        <Button
                          className="min-w-24"
                          variant="outline"
                          onClick={explainCode}
                          disabled={explaining}
                        >
                          Explain
                        </Button>
                      </div>
                    </div>
                    {question ? (
                      <CodeEditor
                        key={`${session.sessionId}:${question.id}`}
                        ref={editorRef}
                        sessionId={session.sessionId}
                        username={user?.username || "Guest"}
                        token={token || ""}
                        initialCode={question.starterCode?.python ?? ""}
                        sharedCode={session.sharedCode ?? ""}
                        sharedYjsState={session.sharedYjsState ?? null}
                        onActivity={sendActivity}
                        onConnectionStatusChange={setEditorStatus}
                      />
                    ) : (
                      <div className="flex h-[450px] items-center justify-center rounded-md border bg-background text-sm text-muted-foreground shadow-inner">
                        Loading shared starter code...
                      </div>
                    )}
                    {question && editorStatus !== "connected" && (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        {editorStatus === "connecting"
                          ? "Shared editor connecting..."
                          : "Shared editor disconnected. Your chat may still work while code sync reconnects."}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/60 p-5 shadow-[0_18px_44px_-32px_rgba(245,158,11,0.4)] dark:border-slate-800 dark:bg-slate-950/45">
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Results Workspace
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Switch between sample inputs, run results, and console
                          output without everything blending together.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 rounded-xl border border-amber-200/80 bg-white/90 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                      <Button
                        variant={resultTab === "testcase" ? "default" : "outline"}
                        className={`min-w-24 text-sm ${workspaceTabStyles("testcase", resultTab)}`}
                        onClick={() => setResultTab("testcase")}
                      >
                        Testcase
                      </Button>
                      <Button
                        variant={resultTab === "result" ? "default" : "outline"}
                        className={`min-w-24 text-sm ${workspaceTabStyles("result", resultTab)}`}
                        onClick={() => setResultTab("result")}
                      >
                        Result
                      </Button>
                      <Button
                        variant={resultTab === "console" ? "default" : "outline"}
                        className={`min-w-24 text-sm ${workspaceTabStyles("console", resultTab)}`}
                        onClick={() => setResultTab("console")}
                      >
                        Console
                      </Button>
                      <Button
                        variant={resultTab === "chat" ? "default" : "outline"}
                        className={`min-w-24 text-sm ${workspaceTabStyles("chat", resultTab)}`}
                        onClick={() => setResultTab("chat")}
                      >
                        Chat
                      </Button>
                      </div>
                    </div>

                    {resultTab === "testcase" && question && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {question.visibleTestCases.map((testCase, index) => (
                            <Button
                              key={testCase.id}
                              variant={
                                selectedTestCase === `sample-${index}`
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                `${
                                selectedTestCase === `sample-${index}`
                                  ? "border-sky-200 bg-sky-100 text-sky-900 shadow-sm hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100"
                                  : "border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              } min-w-24 text-sm`
                              }
                              onClick={() =>
                                setSelectedTestCase(`sample-${index}`)
                              }
                            >
                              Sample {index + 1}
                            </Button>
                          ))}
                          <Button
                            variant={
                              selectedTestCase === "custom" ? "default" : "outline"
                            }
                            className={
                              `${
                              selectedTestCase === "custom"
                                ? "border-indigo-200 bg-indigo-100 text-indigo-900 shadow-sm hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100"
                                : "border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            } min-w-24 text-sm`
                            }
                            onClick={() => setSelectedTestCase("custom")}
                          >
                            Custom
                          </Button>
                        </div>

                        {selectedTestCase === "custom" ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Running with a custom testcase executes only the
                              custom input and returns output/error details.
                            </p>
                            {question.executionMode === "python_function" ? (
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                  Args JSON
                                </p>
                                <textarea
                                  className="min-h-32 w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-950/75"
                                  value={customFunctionArgs}
                                  onChange={(event) =>
                                    setCustomFunctionArgs(event.target.value)
                                  }
                                />
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                    Operations JSON
                                  </p>
                                  <textarea
                                    className="min-h-24 w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-950/75"
                                    value={customClassOperations}
                                    onChange={(event) =>
                                      setCustomClassOperations(event.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                    Arguments JSON
                                  </p>
                                  <textarea
                                    className="min-h-24 w-full rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-950/75"
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
                            <p className="text-sm text-muted-foreground">
                              Run will execute all visible sample testcases.
                            </p>
                            {selectedVisibleCase && (
                              <TestCaseView testCase={selectedVisibleCase} />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {resultTab === "result" && (
                      <div className="space-y-4">
                        {runningMode && (
                          <div className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200">
                            {runningMode === "run"
                              ? "Running shared testcases..."
                              : "Submitting shared solution..."}
                          </div>
                        )}
                        {executionError && (
                          <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                            {executionError}
                          </div>
                        )}
                        {executionResult && (
                          <>
                            <div
                              className={`rounded-xl border px-4 py-3 shadow-sm ${verdictStyles(
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
                                    className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/55"
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
                                        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                          Input
                                        </div>
                                        <pre className="overflow-auto rounded-xl border border-slate-200/80 bg-white p-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
                                          {testCase.inputPreview || "(none)"}
                                        </pre>
                                      </div>
                                      <div>
                                        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                          Expected
                                        </div>
                                        <pre className="overflow-auto rounded-xl border border-slate-200/80 bg-white p-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
                                          {testCase.expectedPreview || "(custom testcase)"}
                                        </pre>
                                      </div>
                                      <div>
                                        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                          Actual
                                        </div>
                                        <pre className="overflow-auto rounded-xl border border-slate-200/80 bg-white p-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
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
                          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            Stdout
                          </div>
                          <pre className="max-h-56 overflow-auto rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
                            {executionResult?.stdout || "(no stdout)"}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            Stderr
                          </div>
                          <pre className="max-h-56 overflow-auto rounded-xl border border-rose-200/70 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-950/70 dark:bg-rose-950/30 dark:text-rose-200">
                            {executionResult?.stderr || "(no stderr)"}
                          </pre>
                        </div>
                      </div>
                    )}

                    {resultTab === "chat" && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-gradient-to-r from-white to-emerald-50/70 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Session Chat
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Keep chat in the same workspace while you demo code,
                              testcases, and outputs.
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-1 text-sm md:items-end">
                            <span className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  chatStatus === "connected" && peerOnline
                                    ? "bg-green-500"
                                    : "bg-zinc-500"
                                }`}
                              />
                              <span className="font-medium text-foreground">
                                {chatStatus !== "connected"
                                  ? "Peer status unavailable"
                                  : peerOnline
                                    ? "Peer online"
                                    : "Peer offline"}
                              </span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {chatStatus === "connected"
                                ? "Chat connected"
                                : chatStatus === "reconnecting"
                                  ? "Chat reconnecting..."
                                  : chatStatus === "offline"
                                    ? "You are offline"
                                    : "Chat connecting..."}
                            </span>
                          </div>
                        </div>

                        <div className="min-h-[280px] max-h-[24rem] space-y-4 overflow-y-auto rounded-2xl border border-emerald-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
                          {messages?.length ? (
                            messages.map((message, index) => (
                              <div
                                key={index}
                                className={`flex flex-col ${
                                  message.username === user?.username
                                    ? "items-end"
                                    : "items-start"
                                }`}
                              >
                                <span className="mb-1 text-xs font-semibold text-muted-foreground">
                                  {message.username}
                                </span>
                                <div
                                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed shadow-sm ${
                                    message.username === user?.username
                                      ? "bg-gradient-to-r from-slate-950 to-sky-900 text-white dark:from-slate-100 dark:to-sky-200 dark:text-slate-950"
                                      : "border border-emerald-200/80 bg-emerald-50/70 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                                  }`}
                                >
                                  {message.text}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-emerald-200/80 bg-emerald-50/70 px-6 text-center text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-900/40">
                              Chat messages will appear here once either of you starts the conversation.
                            </div>
                          )}
                          <div ref={scrollRef} />
                        </div>

                        <div className="rounded-xl border border-emerald-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                          {chatStatus !== "connected" && !terminated && (
                            <p className="mb-3 text-sm text-muted-foreground">
                              {chatStatus === "offline"
                                ? "Chat is unavailable while offline. It will reconnect when your internet comes back."
                                : "Chat is reconnecting. Messages can be sent again once the connection is restored."}
                            </p>
                          )}
                          <input
                            disabled={terminated || chatStatus !== "connected"}
                            className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base dark:border-slate-800 dark:bg-slate-950"
                            placeholder={
                              terminated
                                ? "Session ended"
                                : chatStatus === "offline"
                                  ? "Offline..."
                                  : chatStatus === "connected"
                                    ? "Type a message..."
                                    : "Reconnecting..."
                            }
                            value={chatInput}
                            onChange={(event) => setChatInput(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {(explanation || explainError || explaining) && (
                    <div className="max-h-[320px] overflow-y-auto rounded-2xl border border-fuchsia-200/80 bg-gradient-to-br from-white via-fuchsia-50/65 to-sky-50/60 p-4 text-sm shadow-[0_18px_40px_-30px_rgba(217,70,239,0.35)] dark:border-sky-900/70 dark:bg-slate-950/80">
                      <div className="mb-3 flex justify-between border-b border-sky-200/80 pb-2 dark:border-sky-900/60">
                        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
                          AI Explanation
                        </span>
                        <button
                          className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                          onClick={() => {
                            setExplanation(null);
                            setExplainError(null);
                          }}
                        >
                          Close
                        </button>
                      </div>
                      {explaining && (
                        <div className="animate-pulse text-sm text-sky-700 dark:text-sky-300">
                          Analyzing...
                        </div>
                      )}
                      {explainError && (
                        <p className="text-xs text-rose-400">{explainError}</p>
                      )}
                      {explanation && <ExplanationContent content={explanation} />}
                    </div>
                  )}
                </div>
              ) : !terminated && (loading || sessionUnavailable) ? (
                <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg">
                  <p className="text-xl font-black uppercase text-zinc-500">
                    {loading ? "Reconnecting" : "Connection Lost"}
                  </p>
                  <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
                    {loading
                      ? "Trying to restore the collaboration session..."
                      : "The collaboration service is unavailable right now. This session has not been confirmed as ended."}
                  </p>
                  {!loading && (
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                      Retry Connection
                    </Button>
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
