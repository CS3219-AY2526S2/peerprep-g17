/*
AI Assistance Disclosure:
Tool: ChatGPT, date: 2026-04-12
Scope: Generated and edited collaboration page updates to show partner profile detail. Also used it for creating the boilerplate frontend.
Author review: I checked page behavior manually.
*/
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { usePublicProfile } from "@/hooks/usePublicProfile";
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
type CustomExecutionPayload =
  | {
      args: unknown[];
    }
  | {
      operations: string[];
      arguments: unknown[][];
    };
type QuestionHelpMode =
  | "rephrase"
  | "beginner_explanation"
  | "test_case_generation"
  | "optimization_hint"
  | "brainstorm";
type AiVerbosity = "quick" | "detailed";
type AiStyle =
  | "concise_coach"
  | "teacher"
  | "beginner_friendly"
  | "interviewer";

type ChatMessage = {
  messageId?: string;
  fromUserId?: string;
  username: string;
  text: string;
  type?: "chat" | "system";
  reactions?: Array<{
    emoji: string;
    userIds: string[];
  }>;
  timestamp?: string;
};

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

function toDisplayJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
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

function formatRuntime(runtimeMs: number): string {
  if (runtimeMs < 1000) {
    return `${runtimeMs} ms`;
  }

  return `${(runtimeMs / 1000).toFixed(2)} s`;
}

function formatMemory(memoryKb: number): string {
  if (memoryKb < 1024) {
    return `${memoryKb} KB`;
  }

  return `${(memoryKb / 1024).toFixed(2)} MB`;
}

function isCustomRunResult(result: ExecutionResult | null): boolean {
  return Boolean(
    result &&
      result.mode === "run" &&
      result.cases.some((testCase) => testCase.id === "custom-run"),
  );
}

function executionHeading(result: ExecutionResult): string {
  if (isCustomRunResult(result)) {
    return "Custom Output";
  }

  return result.mode === "submit" ? "Submission Verdict" : "Run Result";
}

function executionDisplayVerdict(result: ExecutionResult): string {
  if (isCustomRunResult(result)) {
    return result.verdict === "Accepted" ? "Output Ready" : result.verdict;
  }

  return result.verdict;
}

function executionSummaryText(result: ExecutionResult): string | null {
  if (isCustomRunResult(result) && result.verdict === "Accepted") {
    return "Custom input executed. Inspect the output and details below.";
  }

  return null;
}

function executionContainerStyles(result: ExecutionResult): string {
  if (isCustomRunResult(result) && result.verdict === "Accepted") {
    return "border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200";
  }

  return verdictStyles(result.verdict);
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

function CopyableCodeBlock({
  label,
  value,
  fallback,
  tone = "default",
}: {
  label: string;
  value: string;
  fallback: string;
  tone?: "default" | "error";
}) {
  const [copied, setCopied] = useState(false);
  const displayValue = value || fallback;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded border border-border/60 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-muted-foreground transition hover:bg-muted/50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className={`overflow-auto rounded bg-zinc-950 p-2 text-xs ${
          tone === "error" ? "text-rose-300" : "text-zinc-100"
        }`}
      >
        {displayValue}
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
          className="text-sm font-semibold tracking-tight text-slate-900 dark:text-sky-100"
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
        <ul key={`ul-${elements.length}`} className="list-disc space-y-2.5 pl-5 text-[14px] leading-6 text-foreground/85">
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
        <ol key={`ol-${elements.length}`} className="list-decimal space-y-2.5 pl-5 text-[14px] leading-6 text-foreground/85">
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
      <p key={`p-${elements.length}`} className="text-[14px] leading-7 text-foreground/85">
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

function AiResponsePanel({
  title,
  tone,
  content,
  onClose,
}: {
  title: string;
  tone: "sky" | "violet";
  content: string;
  onClose: () => void;
}) {
  const toneClasses =
    tone === "sky"
      ? {
          border: "border-sky-200/80 dark:border-sky-900/60",
          bg: "bg-white/95 dark:bg-slate-900/85",
          label: "text-sky-700 dark:text-sky-300",
          divider: "border-sky-200/80 dark:border-sky-900/60",
        }
      : {
          border: "border-violet-200/80 dark:border-violet-900/60",
          bg: "bg-white/95 dark:bg-slate-900/85",
          label: "text-violet-700 dark:text-violet-300",
          divider: "border-violet-200/80 dark:border-violet-900/60",
        };

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${toneClasses.border} ${toneClasses.bg} shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] dark:shadow-none`}
    >
      <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${toneClasses.divider}`}>
        <span className={`text-[11px] font-bold uppercase tracking-[0.16em] ${toneClasses.label}`}>
          {title}
        </span>
        <button
          type="button"
          className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="max-h-[320px] overflow-y-auto px-4 py-4">
        <ExplanationContent content={content} />
      </div>
    </div>
  );
}

function ChatMessageContent({ text }: { text: string }) {
  const normalized = text.replace(/\r\n/g, "\n");
  const parts = normalized.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const body = part.slice(3, -3);
          const firstNewline = body.indexOf("\n");
          const language =
            firstNewline === -1 ? body.trim() : body.slice(0, firstNewline).trim();
          const code =
            firstNewline === -1 ? "" : body.slice(firstNewline + 1).replace(/\n$/, "");

          return (
            <CodeSnippetBlock
              key={`chat-code-${index}`}
              language={language || "code"}
              code={code}
            />
          );
        }

        if (!part.trim()) {
          return null;
        }

        return (
          <p
            key={`chat-text-${index}`}
            className="whitespace-pre-wrap break-words leading-relaxed"
          >
            {renderInlineText(part)}
          </p>
        );
      })}
    </div>
  );
}

function CodeSnippetBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300/80 bg-slate-950 text-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 bg-slate-900 px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
          {language}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-6">
        <code>{code}</code>
      </pre>
    </div>
  );
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [terminated, setTerminated] = useState(false);
  const [sessionUnavailable, setSessionUnavailable] = useState(false);
  const [warningActive, setWarningActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(
    null,
  );
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [customTestError, setCustomTestError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [runningMode, setRunningMode] = useState<"run" | "submit" | null>(null);
  const [customFunctionArgsText, setCustomFunctionArgsText] = useState("[]");
  const [customClassOperationsText, setCustomClassOperationsText] = useState("[]");
  const [customClassArgumentsText, setCustomClassArgumentsText] = useState("[]");
  const [resultTab, setResultTab] = useState<ResultTab>("result");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [questionHelp, setQuestionHelp] = useState<string | null>(null);
  const [questionHelpLoading, setQuestionHelpLoading] = useState(false);
  const [questionHelpError, setQuestionHelpError] = useState<string | null>(null);
  const [questionHelpPrompt, setQuestionHelpPrompt] = useState("");
  const [questionHelpMode, setQuestionHelpMode] = useState<QuestionHelpMode>("rephrase");
  const [aiVerbosity, setAiVerbosity] = useState<AiVerbosity>("quick");
  const [aiStyle, setAiStyle] = useState<AiStyle>("concise_coach");
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
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState(43);
  const [isResizingPanels, setIsResizingPanels] = useState(false);

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
      setQuestionHelp(null);
      setQuestionHelpError(null);
      setQuestionHelpPrompt("");
      setQuestionHelpMode("rephrase");
      setAiVerbosity("quick");
      setAiStyle("concise_coach");
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
  const splitPaneRef = useRef<HTMLDivElement | null>(null);
  const lastInitializedQuestionIdRef = useRef<string | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndicatorsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const quickReplies = useMemo(
    () => [
      "Try the edge case with an empty input.",
      "I think the bug is in the visited check.",
      "Can you explain your approach first?",
      "Let's submit after one more run.",
    ],
    [],
  );

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

  const handlePanelResizeStart = useCallback(() => {
    setIsResizingPanels(true);
  }, []);

  useEffect(() => {
    if (!isResizingPanels) {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      const container = splitPaneRef.current;
      if (!container) {
        return;
      }

      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0) {
        return;
      }

      const nextWidth = ((event.clientX - bounds.left) / bounds.width) * 100;
      setLeftPaneWidth(Math.min(62, Math.max(32, nextWidth)));
    };

    const stopResizing = () => {
      setIsResizingPanels(false);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", stopResizing);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizingPanels]);

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
          setMessages((prev) => [...prev, data.payload as ChatMessage]);
          if (
            data.payload?.fromUserId &&
            data.payload.fromUserId !== user?.id &&
            resultTab !== "chat"
          ) {
            setUnreadChatCount((current) => current + 1);
          }
        } else if (data.type === "chat_history") {
          setMessages((data.payload ?? []) as ChatMessage[]);
        } else if (data.type === "chat_reaction_update") {
          setMessages((prev) =>
            prev.map((message) =>
              message.messageId === data.payload?.messageId
                ? {
                    ...message,
                    reactions: Array.isArray(data.payload?.reactions)
                      ? data.payload.reactions
                      : [],
                  }
                : message,
            ),
          );
        } else if (data.type === "chat_typing") {
          if (data.payload?.userId && data.payload.userId !== user?.id) {
            const typingUserId = String(data.payload.userId);
            const typingUsername = String(data.payload.username || "Partner");

            if (typingIndicatorsRef.current[typingUserId]) {
              clearTimeout(typingIndicatorsRef.current[typingUserId]);
            }

            if (data.payload?.isTyping) {
              setTypingUsers((current) => ({
                ...current,
                [typingUserId]: typingUsername,
              }));
              typingIndicatorsRef.current[typingUserId] = setTimeout(() => {
                setTypingUsers((current) => {
                  const next = { ...current };
                  delete next[typingUserId];
                  return next;
                });
              }, 1800);
            } else {
              setTypingUsers((current) => {
                const next = { ...current };
                delete next[typingUserId];
                return next;
              });
            }
          }
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
    resultTab,
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

  useEffect(() => {
    if (resultTab === "chat") {
      setUnreadChatCount(0);
    }
  }, [resultTab]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      Object.values(typingIndicatorsRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

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
      sendTypingSignal(false);
      sendActivity();
    }
  };

  const insertCodeSnippetTemplate = () => {
    const snippet = "```python\n# Share a code idea here\n```";
    setChatInput((current) => (current.trim() ? `${current}\n${snippet}` : snippet));
    window.setTimeout(() => chatInputRef.current?.focus(), 0);
  };

  const sendTypingSignal = useCallback((isTyping: boolean) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN || terminatedRef.current) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "chat_typing",
        payload: { isTyping },
      }),
    );
  }, []);

  const sendQuickReply = (text: string) => {
    if (
      socketRef.current?.readyState === WebSocket.OPEN &&
      !terminated &&
      chatStatus === "connected"
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: "chat_message",
          payload: { text, username: user?.username },
        }),
      );
      sendTypingSignal(false);
      sendActivity();
    }
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN || terminated) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "chat_reaction",
        payload: { messageId, emoji },
      }),
    );
  };

  const handleChatInputChange = (value: string) => {
    setChatInput(value);
    sendTypingSignal(value.trim().length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingSignal(false);
    }, 1200);
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
          verbosity: aiVerbosity,
          style: aiStyle,
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

  async function requestQuestionHelp(mode: QuestionHelpMode = questionHelpMode) {
    if (!question || !token) {
      return;
    }

    if (mode === "brainstorm" && !questionHelpPrompt.trim()) {
      setQuestionHelpError("Ask a question for the AI helper first.");
      return;
    }

    try {
      setQuestionHelpLoading(true);
      setQuestionHelpError(null);
      setQuestionHelp(null);

      const response = await fetch(`${COLLABORATION_API_URL}/sessions/assistant/question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionTitle: question.title,
          questionDescription: question.description,
          difficulty: question.difficulty,
          topics: question.categories,
          language: session?.language || "Python",
          code: editorRef.current?.getCode() || "",
          mode,
          verbosity: aiVerbosity,
          style: aiStyle,
          userPrompt: questionHelpPrompt,
        }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setQuestionHelpError(json?.error || "AI helper request failed.");
        return;
      }

      setQuestionHelp(json?.data?.response || "");
    } catch (err) {
      setQuestionHelpError(
        err instanceof Error ? err.message : "AI helper request failed.",
      );
    } finally {
      setQuestionHelpLoading(false);
    }
  }

  async function execute(mode: "run" | "submit") {
    await executeWithOptions(mode);
  }

  async function copyEditorCode() {
    const code = editorRef.current?.getCode();
    if (!code?.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1200);
    } catch {
      setCodeCopied(false);
    }
  }

  async function executeWithOptions(
    mode: "run" | "submit",
    customTestCase?: CustomExecutionPayload,
  ) {
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

      const response = await fetch(
        `${COLLABORATION_API_URL}/sessions/${sessionId}/${mode}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, customTestCase }),
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

  function parseCustomFunctionArgs(): CustomExecutionPayload {
    let parsed: unknown;
    try {
      parsed = JSON.parse(customFunctionArgsText);
    } catch {
      throw new Error("Custom arguments must be valid JSON.");
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Custom arguments must be a JSON array.");
    }

    return { args: parsed };
  }

  function parseCustomClassPayload(): CustomExecutionPayload {
    let parsedOperations: unknown;
    let parsedArguments: unknown;

    try {
      parsedOperations = JSON.parse(customClassOperationsText);
    } catch {
      throw new Error("Operations must be valid JSON.");
    }

    try {
      parsedArguments = JSON.parse(customClassArgumentsText);
    } catch {
      throw new Error("Arguments must be valid JSON.");
    }

    if (!Array.isArray(parsedOperations) || !parsedOperations.every((value) => typeof value === "string")) {
      throw new Error("Operations must be a JSON array of strings.");
    }

    if (!Array.isArray(parsedArguments) || !parsedArguments.every((value) => Array.isArray(value))) {
      throw new Error("Arguments must be a JSON array of arrays.");
    }

    if (parsedOperations.length !== parsedArguments.length) {
      throw new Error("Operations and arguments must have the same number of entries.");
    }

    return {
      operations: parsedOperations,
      arguments: parsedArguments as unknown[][],
    };
  }

  async function runCustomTest() {
    if (!question) {
      return;
    }

    try {
      setCustomTestError(null);
      const payload =
        question.executionMode === "python_function"
          ? parseCustomFunctionArgs()
          : parseCustomClassPayload();

      await executeWithOptions("run", payload);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Custom testcase is invalid.";
      setCustomTestError(message);
      setExecutionError(message);
      setResultTab("testcase");
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
  const executionDisplayTitle = useMemo(
    () => (executionResult ? executionHeading(executionResult) : ""),
    [executionResult],
  );
  const executionDisplayStatus = useMemo(
    () => (executionResult ? executionDisplayVerdict(executionResult) : ""),
    [executionResult],
  );
  const executionSummary = useMemo(
    () => (executionResult ? executionSummaryText(executionResult) : null),
    [executionResult],
  );

  const partnerUserId = useMemo(() => {
    if (!session || !user?.id) {
      return null;
    }

    return session.userAId === user.id ? session.userBId : session.userAId;
  }, [session, user?.id]);
  const { profile: partnerProfile, photoPreview: partnerPhotoPreview } = usePublicProfile(
    partnerUserId,
    token,
    { enabled: Boolean(partnerUserId) },
  );

  useEffect(() => {
    if (!question || lastInitializedQuestionIdRef.current === question.id) {
      return;
    }

    lastInitializedQuestionIdRef.current = question.id;
    setCustomTestError(null);

    if (question.executionMode === "python_function") {
      const firstCase = question.visibleTestCases[0];
      setCustomFunctionArgsText(
        firstCase && isFunctionCase(firstCase)
          ? toPrettyJson(firstCase.args)
          : "[]",
      );
      return;
    }

    const firstCase = question.visibleTestCases[0];
    if (firstCase && !isFunctionCase(firstCase)) {
      setCustomClassOperationsText(toPrettyJson(firstCase.operations));
      setCustomClassArgumentsText(toPrettyJson(firstCase.arguments));
      return;
    }

    setCustomClassOperationsText("[]");
    setCustomClassArgumentsText("[]");
  }, [question]);

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
                  <div
                    ref={splitPaneRef}
                    className="grid gap-6 xl:[grid-template-columns:minmax(0,var(--left-pane))_14px_minmax(0,calc(100%-var(--left-pane)-14px))]"
                    style={{ ["--left-pane" as string]: `${leftPaneWidth}%` }}
                  >
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
                      <details className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none" open>
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
                        <div className="space-y-4 border-t border-slate-200/80 pt-4 pr-1 dark:border-slate-800">
                        <p className="text-base leading-relaxed text-muted-foreground">
                          {question.description}
                        </p>

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

                  {question && (
                    <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Test Cases
                        </p>
                      </div>

                      <div className="space-y-3">
                        {question.visibleTestCases.map((testCase, index) => (
                          <TestCaseView
                            key={testCase.id}
                            testCase={testCase}
                            title={`Sample ${index + 1}`}
                          />
                        ))}
                      </div>

                      <div className="space-y-4 rounded-2xl border border-dashed border-sky-200/80 bg-sky-50/50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Custom Test
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Run your own input without changing the shared sample testcases. These inputs stay on this page while you work, but are not saved as shared session history.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={runCustomTest}
                            disabled={runningMode !== null}
                          >
                            {runningMode === "run" ? "Running..." : "Run Custom Test"}
                          </Button>
                        </div>

                        {question.executionMode === "python_function" ? (
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                              Arguments JSON Array
                            </label>
                            <textarea
                              rows={8}
                              value={customFunctionArgsText}
                              onChange={(event) => {
                                setCustomFunctionArgsText(event.target.value);
                                setCustomTestError(null);
                              }}
                              className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-950"
                              placeholder='[["hello"], 3]'
                            />
                          </div>
                        ) : (
                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                Operations JSON Array
                              </label>
                              <textarea
                                rows={8}
                                value={customClassOperationsText}
                                onChange={(event) => {
                                  setCustomClassOperationsText(event.target.value);
                                  setCustomTestError(null);
                                }}
                                className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-950"
                                placeholder='["LRUCache", "put", "get"]'
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                Arguments JSON Array
                              </label>
                              <textarea
                                rows={8}
                                value={customClassArgumentsText}
                                onChange={(event) => {
                                  setCustomClassArgumentsText(event.target.value);
                                  setCustomTestError(null);
                                }}
                                className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-950"
                                placeholder='[[2], [1, 1], [1]]'
                              />
                            </div>
                          </div>
                        )}

                        {customTestError && (
                          <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                            {customTestError}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 rounded-2xl border border-violet-200/80 bg-violet-50/60 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              AI Question Helper
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Use AI to rephrase the problem, explain it more clearly, brainstorm next steps, or suggest useful test cases without leaving the collaboration page.
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Bounded help, not full solutions by default
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            AI Mode
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant={aiVerbosity === "quick" ? "default" : "outline"}
                            onClick={() => setAiVerbosity("quick")}
                            disabled={questionHelpLoading || explaining}
                          >
                            Quick Help
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={aiVerbosity === "detailed" ? "default" : "outline"}
                            onClick={() => setAiVerbosity("detailed")}
                            disabled={questionHelpLoading || explaining}
                          >
                            More Detail
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            Teaching Style
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant={aiStyle === "concise_coach" ? "default" : "outline"}
                            onClick={() => setAiStyle("concise_coach")}
                            disabled={questionHelpLoading || explaining}
                          >
                            Concise Coach
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={aiStyle === "teacher" ? "default" : "outline"}
                            onClick={() => setAiStyle("teacher")}
                            disabled={questionHelpLoading || explaining}
                          >
                            Teacher
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={aiStyle === "beginner_friendly" ? "default" : "outline"}
                            onClick={() => setAiStyle("beginner_friendly")}
                            disabled={questionHelpLoading || explaining}
                          >
                            Beginner Friendly
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={aiStyle === "interviewer" ? "default" : "outline"}
                            onClick={() => setAiStyle("interviewer")}
                            disabled={questionHelpLoading || explaining}
                          >
                            Interview Coach
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={questionHelpMode === "rephrase" ? "default" : "outline"}
                            onClick={() => {
                              setQuestionHelpMode("rephrase");
                              void requestQuestionHelp("rephrase");
                            }}
                            disabled={questionHelpLoading}
                          >
                            Rephrase
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={questionHelpMode === "beginner_explanation" ? "default" : "outline"}
                            onClick={() => {
                              setQuestionHelpMode("beginner_explanation");
                              void requestQuestionHelp("beginner_explanation");
                            }}
                            disabled={questionHelpLoading}
                          >
                            Explain Simply
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={questionHelpMode === "test_case_generation" ? "default" : "outline"}
                            onClick={() => {
                              setQuestionHelpMode("test_case_generation");
                              void requestQuestionHelp("test_case_generation");
                            }}
                            disabled={questionHelpLoading}
                          >
                            Generate Test Cases
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={questionHelpMode === "optimization_hint" ? "default" : "outline"}
                            onClick={() => {
                              setQuestionHelpMode("optimization_hint");
                              void requestQuestionHelp("optimization_hint");
                            }}
                            disabled={questionHelpLoading}
                          >
                            Optimization Hint
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            Ask AI About This Question
                          </label>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <textarea
                              rows={3}
                              value={questionHelpPrompt}
                              onChange={(event) => setQuestionHelpPrompt(event.target.value)}
                              className="min-h-[88px] flex-1 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                              placeholder="What is this question really asking? Can you explain the constraints? What edge cases should we think about?"
                            />
                            <Button
                              type="button"
                              className="sm:self-start"
                              onClick={() => {
                                setQuestionHelpMode("brainstorm");
                                void requestQuestionHelp("brainstorm");
                              }}
                              disabled={questionHelpLoading}
                            >
                              {questionHelpLoading && questionHelpMode === "brainstorm"
                                ? "Asking..."
                                : "Ask AI"}
                            </Button>
                          </div>
                        </div>

                        {questionHelpError && (
                          <div className="rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                            {questionHelpError}
                          </div>
                        )}

                        {questionHelpLoading && !questionHelp && (
                          <div className="rounded-xl border border-violet-200/80 bg-white/80 px-4 py-3 text-sm text-violet-700 dark:border-violet-900/60 dark:bg-slate-900/70 dark:text-violet-300">
                            AI helper is thinking...
                          </div>
                        )}

                        {questionHelp && (
                          <AiResponsePanel
                            title="AI Question Helper"
                            tone="violet"
                            content={questionHelp}
                            onClose={() => {
                              setQuestionHelp(null);
                              setQuestionHelpError(null);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  </div>

                  <div className="hidden xl:flex xl:items-stretch xl:justify-center">
                    <button
                      type="button"
                      aria-label="Resize collaboration panels"
                      onMouseDown={handlePanelResizeStart}
                      className="group flex w-3 cursor-col-resize items-center justify-center rounded-full border border-slate-200/80 bg-white/85 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <span className="h-16 w-1 rounded-full bg-slate-300 group-hover:bg-slate-400 dark:bg-slate-600 dark:group-hover:bg-slate-500" />
                    </button>
                  </div>

                  <div className="space-y-6">
                  {partnerProfile && (
                    <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-white text-lg font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {partnerPhotoPreview ? (
                              <img
                                src={partnerPhotoPreview}
                                alt={`${partnerProfile.username} profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{partnerProfile.username[0]?.toUpperCase() || "?"}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                              Your Partner
                            </p>
                            <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                              {partnerProfile.username}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {partnerProfile.university || "No university listed"}
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/users/${partnerProfile.id}`}
                          className="inline-flex text-sm font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
                        >
                          View public profile
                        </Link>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {partnerProfile.bio || "No bio provided yet."}
                      </p>
                    </div>
                  )}

                  <div className="space-y-4 rounded-2xl border border-indigo-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-base font-semibold">Shared Editor</h3>
                      <div className="flex flex-wrap gap-2 rounded-xl border border-indigo-200/80 bg-white/90 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
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
                          onClick={copyEditorCode}
                        >
                          {codeCopied ? "Copied" : "Copy Code"}
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

                  <div className="space-y-4 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Results Workspace
                        </p>
                      </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-w-32"
                          onClick={() => setResultsCollapsed((current) => !current)}
                        >
                          {resultsCollapsed ? "Show Results" : "Hide Results"}
                        </Button>
                      </div>
                      {!resultsCollapsed && (
                      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-white/90 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
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
                        <span className="inline-flex items-center gap-2">
                          Chat
                          {unreadChatCount > 0 && (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-100 dark:text-emerald-950">
                              {unreadChatCount}
                            </span>
                          )}
                        </span>
                      </Button>
                      </div>
                      )}
                    </div>

                    {resultsCollapsed ? (
                      <div className="rounded-xl border border-dashed border-slate-300/80 bg-white/70 px-4 py-6 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-900/55">
                        Results are hidden so the editor has more room. Use
                        <span className="mx-1 font-medium text-foreground">Show Results</span>
                        when you want to present runs, console output, or chat.
                      </div>
                    ) : (
                    <>
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
                              className={`rounded-xl border px-4 py-3 shadow-sm ${executionContainerStyles(
                                executionResult,
                              )}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs uppercase tracking-wider opacity-80">
                                    {executionDisplayTitle}
                                  </div>
                                  <div className="text-lg font-semibold">
                                    {executionDisplayStatus}
                                  </div>
                                  {executionSummary && (
                                    <div className="mt-1 text-xs opacity-85">
                                      {executionSummary}
                                    </div>
                                  )}
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
                                {!isCustomRunResult(executionResult) && (
                                  <span className="rounded-full border border-current/20 px-2.5 py-1">
                                    Passed {executionResult.passedCount}/
                                    {executionResult.totalCount}
                                  </span>
                                )}
                                <span className="rounded-full border border-current/20 px-2.5 py-1">
                                  Runtime {formatRuntime(executionResult.runtimeMs)}
                                </span>
                                <span className="rounded-full border border-current/20 px-2.5 py-1">
                                  Memory {formatMemory(executionResult.memoryKb)}
                                </span>
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
                                      {isCustomRunResult(executionResult) ? (
                                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold border border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                          Output
                                        </span>
                                      ) : (
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${verdictStyles(
                                            testCase.verdict,
                                          )}`}
                                        >
                                          {testCase.verdict}
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <CopyableCodeBlock
                                        label="Input"
                                        value={testCase.inputPreview || ""}
                                        fallback="(none)"
                                      />
                                      <CopyableCodeBlock
                                        label="Expected"
                                        value={testCase.expectedPreview || ""}
                                        fallback="(custom testcase)"
                                      />
                                      <CopyableCodeBlock
                                        label="Actual"
                                        value={testCase.actualPreview || ""}
                                        fallback="(none)"
                                      />
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
                        {executionResult && (
                          <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/55 dark:text-slate-200">
                            <span className="rounded-full border border-slate-300/70 px-2.5 py-1 dark:border-slate-700">
                              Status {executionDisplayStatus}
                            </span>
                            <span className="rounded-full border border-slate-300/70 px-2.5 py-1 dark:border-slate-700">
                              Runtime {formatRuntime(executionResult.runtimeMs)}
                            </span>
                            <span className="rounded-full border border-slate-300/70 px-2.5 py-1 dark:border-slate-700">
                              Memory {formatMemory(executionResult.memoryKb)}
                            </span>
                          </div>
                        )}
                        <CopyableCodeBlock
                          label="Stdout"
                          value={executionResult?.stdout || ""}
                          fallback="(no stdout)"
                        />
                        <CopyableCodeBlock
                          label="Stderr"
                          value={executionResult?.stderr || ""}
                          fallback="(no stderr)"
                          tone="error"
                        />
                      </div>
                    )}

                    {resultTab === "chat" && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
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
                                    ? "bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.8)]"
                                    : chatStatus === "connected"
                                      ? "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.55)]"
                                      : "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.45)]"
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

                        <div className="min-h-[280px] max-h-[24rem] space-y-4 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
                          {messages?.length ? (
                            messages.map((message, index) => (
                              <div
                                key={message.messageId || index}
                                className={`flex flex-col ${
                                  message.type === "system"
                                    ? "items-center"
                                    : message.username === user?.username
                                      ? "items-end"
                                      : "items-start"
                                }`}
                              >
                                {message.type === "system" ? (
                                  <div className="max-w-[90%] rounded-full border border-violet-200/80 bg-violet-50 px-4 py-2 text-center text-sm text-violet-900 shadow-sm dark:border-violet-800 dark:bg-violet-900/35 dark:text-violet-100">
                                    {message.text}
                                  </div>
                                ) : (
                                  <>
                                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                      <span>{message.username}</span>
                                      {message.timestamp && (
                                        <span className="font-normal">
                                          {new Date(message.timestamp).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed shadow-sm ${
                                        message.username === user?.username
                                          ? "border border-sky-200/80 bg-sky-100 text-sky-950 dark:border-sky-300/80 dark:bg-sky-300 dark:text-slate-950"
                                          : "border border-emerald-200/80 bg-emerald-100 text-emerald-950 dark:border-emerald-300/80 dark:bg-emerald-300 dark:text-slate-950"
                                      }`}
                                    >
                                      <ChatMessageContent text={message.text} />
                                    </div>
                                    <div className="mt-2 flex max-w-[85%] flex-wrap items-center gap-2">
                                      {["👍"].map((emoji) => {
                                        const reaction = message.reactions?.find(
                                          (entry) => entry.emoji === emoji,
                                        );
                                        const reacted = !!reaction?.userIds?.includes(user?.id || "");
                                        const count = reaction?.userIds?.length ?? 0;

                                        return (
                                          <button
                                            key={`${message.messageId}-${emoji}`}
                                            type="button"
                                            className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                              reacted
                                                ? "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-100"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                                            }`}
                                            onClick={() =>
                                              message.messageId &&
                                              toggleReaction(message.messageId, emoji)
                                            }
                                          >
                                            {emoji}
                                            {count > 0 ? ` ${count}` : ""}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-300/80 bg-slate-50/80 px-6 text-center text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/80">
                              Chat messages will appear here once either of you starts the conversation.
                            </div>
                          )}
                          <div ref={scrollRef} />
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
                          {chatStatus !== "connected" && !terminated && (
                            <p className="mb-3 text-sm text-muted-foreground">
                              {chatStatus === "offline"
                                ? "Chat is unavailable while offline. It will reconnect when your internet comes back."
                                : "Chat is reconnecting. Messages can be sent again once the connection is restored."}
                            </p>
                          )}
                          <div className="mb-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={insertCodeSnippetTemplate}
                              disabled={terminated || chatStatus !== "connected"}
                            >
                              Insert Python Snippet
                            </Button>
                            {quickReplies.map((reply) => (
                              <button
                                key={reply}
                                type="button"
                                className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                                onClick={() => sendQuickReply(reply)}
                                disabled={terminated || chatStatus !== "connected"}
                              >
                                {reply}
                              </button>
                            ))}
                          </div>
                          {Object.keys(typingUsers).length > 0 && (
                            <p className="mb-3 text-sm text-muted-foreground">
                              {Object.values(typingUsers).join(", ")} typing...
                            </p>
                          )}
                          <textarea
                            ref={chatInputRef}
                            disabled={terminated || chatStatus !== "connected"}
                            rows={3}
                            className="w-full resize-y rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-base dark:border-slate-800 dark:bg-slate-950"
                            placeholder={
                              terminated
                                ? "Session ended"
                                : chatStatus === "offline"
                                  ? "Offline..."
                                  : chatStatus === "connected"
                                    ? "Type a message or paste a ```python``` snippet..."
                                    : "Reconnecting..."
                            }
                            value={chatInput}
                            onChange={(event) => handleChatInputChange(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                sendMessage();
                              }
                            }}
                          />
                          <p className="mt-2 text-xs text-muted-foreground">
                            Press Enter to send. Press Shift+Enter for a new line.
                          </p>
                        </div>
                      </div>
                    )}
                    </>
                    )}
                  </div>

                  {(explanation || explainError || explaining) && (
                    <div className="space-y-3">
                      {explaining && (
                        <div className="rounded-xl border border-sky-200/80 bg-white/80 px-4 py-3 text-sm text-sky-700 dark:border-sky-900/60 dark:bg-slate-900/70 dark:text-sky-300">
                          AI is summarizing the code...
                        </div>
                      )}
                      {explainError && (
                        <p className="rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                          {explainError}
                        </p>
                      )}
                      {explanation && (
                        <AiResponsePanel
                          title="AI Explanation"
                          tone="sky"
                          content={explanation}
                          onClose={() => {
                            setExplanation(null);
                            setExplainError(null);
                          }}
                        />
                      )}
                    </div>
                  )}
                  </div>
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
