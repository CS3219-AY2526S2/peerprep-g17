import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { ExecutionResult } from "@/types";
import {
  executionContainerStyles,
  executionDisplayVerdict,
  executionHeading,
  executionSummaryText,
  formatMemory,
  formatRuntime,
  isCustomRunResult,
  verdictStyles,
} from "@/lib/collaboration/executionFormatters";
import type {
  ChatMessage,
  ChatStatus,
  ResultTab as ResultTabType,
} from "@/lib/collaboration/types";
import { ChatMessageContent, CopyableCodeBlock } from "./shared";

interface ResultsWorkspaceProps {
  resultTab: ResultTabType;
  onResultTabChange: (tab: ResultTabType) => void;
  unreadChatCount: number;
  // Result tab
  runningMode: "run" | "submit" | null;
  executionError: string | null;
  executionResult: ExecutionResult | null;
  latestExecutionLabel: string;
  // Chat tab
  messages: ChatMessage[];
  chatInput: string;
  chatStatus: ChatStatus;
  peerOnline: boolean;
  terminated: boolean;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
  typingUsers: Record<string, string>;
  quickReplies: string[];
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
  onSendQuickReply: (text: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onInsertCodeSnippet: () => void;
}

const TAB_CONFIG: Array<{
  value: ResultTabType;
  label: string;
  activeClass: string;
}> = [
  {
    value: "result",
    label: "Result",
    activeClass:
      "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  },
  {
    value: "console",
    label: "Console",
    activeClass:
      "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100",
  },
  {
    value: "chat",
    label: "Chat",
    activeClass:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  },
];

export function ResultsWorkspace(props: ResultsWorkspaceProps) {
  const { resultTab, onResultTabChange, unreadChatCount } = props;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-amber-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
      <div className="flex flex-wrap gap-1 border-b border-slate-200/80 px-3 py-2 dark:border-slate-800">
        {TAB_CONFIG.map((tab) => {
          const active = resultTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onResultTabChange(tab.value)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? `shadow-sm ${tab.activeClass}`
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
              {tab.value === "chat" && unreadChatCount > 0 && !active && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadChatCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-4">
        {resultTab === "result" && (
          <div className="h-full overflow-y-auto">
            <ResultContent
              runningMode={props.runningMode}
              executionError={props.executionError}
              executionResult={props.executionResult}
              latestExecutionLabel={props.latestExecutionLabel}
            />
          </div>
        )}
        {resultTab === "console" && (
          <div className="h-full overflow-y-auto">
            <ConsoleContent executionResult={props.executionResult} />
          </div>
        )}
        {resultTab === "chat" && (
          <ChatContent
            messages={props.messages}
            chatInput={props.chatInput}
            chatStatus={props.chatStatus}
            peerOnline={props.peerOnline}
            terminated={props.terminated}
            currentUserId={props.currentUserId}
            currentUsername={props.currentUsername}
            typingUsers={props.typingUsers}
            quickReplies={props.quickReplies}
            onChatInputChange={props.onChatInputChange}
            onSendMessage={props.onSendMessage}
            onSendQuickReply={props.onSendQuickReply}
            onToggleReaction={props.onToggleReaction}
            onInsertCodeSnippet={props.onInsertCodeSnippet}
          />
        )}
      </div>
    </div>
  );
}

// ── Result tab content ───────────────────────────────────────────────

function ResultContent({
  runningMode,
  executionError,
  executionResult,
  latestExecutionLabel,
}: {
  runningMode: "run" | "submit" | null;
  executionError: string | null;
  executionResult: ExecutionResult | null;
  latestExecutionLabel: string;
}) {
  return (
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
                  {executionHeading(executionResult)}
                </div>
                <div className="text-lg font-semibold">
                  {executionDisplayVerdict(executionResult)}
                </div>
                {executionSummaryText(executionResult) && (
                  <div className="mt-1 text-xs opacity-85">
                    {executionSummaryText(executionResult)}
                  </div>
                )}
              </div>
              <div className="text-right text-xs opacity-90">
                <div>Triggered by {latestExecutionLabel || "a collaborator"}</div>
                <div>{new Date(executionResult.initiatedAt).toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {!isCustomRunResult(executionResult) && (
                <span className="rounded-full border border-current/20 px-2.5 py-1">
                  Passed {executionResult.passedCount}/{executionResult.totalCount}
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
                      <span className="rounded-full border border-slate-300/80 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
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
          Run sample testcases or submit the shared solution to see verdicts here.
        </p>
      )}
    </div>
  );
}

// ── Console tab content ──────────────────────────────────────────────

function ConsoleContent({
  executionResult,
}: {
  executionResult: ExecutionResult | null;
}) {
  return (
    <div className="space-y-4">
      {executionResult && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/55 dark:text-slate-200">
          <span className="rounded-full border border-slate-300/70 px-2.5 py-1 dark:border-slate-700">
            Status {executionDisplayVerdict(executionResult)}
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
  );
}

// ── Chat tab content ─────────────────────────────────────────────────

interface ChatContentProps {
  messages: ChatMessage[];
  chatInput: string;
  chatStatus: ChatStatus;
  peerOnline: boolean;
  terminated: boolean;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
  typingUsers: Record<string, string>;
  quickReplies: string[];
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
  onSendQuickReply: (text: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onInsertCodeSnippet: () => void;
}

function ChatContent({
  messages,
  chatInput,
  chatStatus,
  peerOnline,
  terminated,
  currentUserId,
  currentUsername,
  typingUsers,
  quickReplies,
  onChatInputChange,
  onSendMessage,
  onSendQuickReply,
  onToggleReaction,
  onInsertCodeSnippet,
}: ChatContentProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const inputDisabled = terminated || chatStatus !== "connected";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-2.5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          Session Chat
        </p>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                chatStatus === "connected" && peerOnline
                  ? "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)]"
                  : chatStatus === "connected"
                    ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.55)]"
                    : "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.45)]"
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
          <span className="text-muted-foreground">
            {chatStatus === "connected"
              ? "Chat connected"
              : chatStatus === "reconnecting"
                ? "Reconnecting..."
                : chatStatus === "offline"
                  ? "You are offline"
                  : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
        {messages?.length ? (
          messages.map((message, index) => (
            <div
              key={message.messageId || index}
              className={`flex flex-col ${
                message.type === "system"
                  ? "items-center"
                  : message.username === currentUsername
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
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                      message.username === currentUsername
                        ? "border border-sky-200/80 bg-sky-100 text-sky-950 dark:border-sky-300/80 dark:bg-sky-300 dark:text-slate-950"
                        : "border border-emerald-200/80 bg-emerald-100 text-emerald-950 dark:border-emerald-300/80 dark:bg-emerald-300 dark:text-slate-950"
                    }`}
                  >
                    <ChatMessageContent text={message.text} />
                  </div>
                  <div className="mt-1.5 flex max-w-[85%] flex-wrap items-center gap-2">
                    {["👍"].map((emoji) => {
                      const reaction = message.reactions?.find(
                        (entry) => entry.emoji === emoji,
                      );
                      const reacted = !!reaction?.userIds?.includes(
                        currentUserId || "",
                      );
                      const count = reaction?.userIds?.length ?? 0;

                      return (
                        <button
                          key={`${message.messageId}-${emoji}`}
                          type="button"
                          className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                            reacted
                              ? "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-100"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                          }`}
                          onClick={() =>
                            message.messageId &&
                            onToggleReaction(message.messageId, emoji)
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
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-300/80 bg-slate-50/80 px-6 text-center text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-950/80">
            Chat messages will appear here once either of you starts the conversation.
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
        {chatStatus !== "connected" && !terminated && (
          <p className="mb-2 text-xs text-muted-foreground">
            {chatStatus === "offline"
              ? "Chat is unavailable while offline. It will reconnect when your internet comes back."
              : "Chat is reconnecting. Messages can be sent again once the connection is restored."}
          </p>
        )}
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onInsertCodeSnippet}
            disabled={inputDisabled}
          >
            Insert Python Snippet
          </Button>
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => onSendQuickReply(reply)}
              disabled={inputDisabled}
            >
              {reply}
            </button>
          ))}
        </div>
        {Object.keys(typingUsers).length > 0 && (
          <p className="mb-2 text-xs text-muted-foreground">
            {Object.values(typingUsers).join(", ")} typing...
          </p>
        )}
        <textarea
          ref={inputRef}
          disabled={inputDisabled}
          rows={2}
          className="w-full resize-y rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
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
          onChange={(event) => onChatInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSendMessage();
            }
          }}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Press Enter to send. Press Shift+Enter for a new line.
        </p>
      </div>
    </div>
  );
}
