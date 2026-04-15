import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type {
  ChatMessage,
  ChatStatus,
} from "@/lib/collaboration/types";
import { ChatMessageContent } from "./shared";

interface ChatPanelProps {
  open: boolean;
  messages: ChatMessage[];
  chatInput: string;
  chatStatus: ChatStatus;
  peerOnline: boolean;
  terminated: boolean;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
  typingUsers: Record<string, string>;
  quickReplies: string[];
  onClose: () => void;
  onChatInputChange: (value: string) => void;
  onSendMessage: () => void;
  onSendQuickReply: (text: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onInsertCodeSnippet: () => void;
}

export function ChatPanel({
  open,
  messages,
  chatInput,
  chatStatus,
  peerOnline,
  terminated,
  currentUserId,
  currentUsername,
  typingUsers,
  quickReplies,
  onClose,
  onChatInputChange,
  onSendMessage,
  onSendQuickReply,
  onToggleReaction,
  onInsertCodeSnippet,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingNames = Object.values(typingUsers);
  const inputDisabled = terminated || chatStatus !== "connected";

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open || inputDisabled) return;
    inputRef.current?.focus();
  }, [inputDisabled, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-2 top-16 z-50 md:inset-x-auto md:right-6 md:top-16 md:h-[min(92vh,1280px)] md:w-[min(640px,calc(100vw-3rem))]">
      <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/98 shadow-[0_28px_80px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/96 dark:shadow-[0_28px_80px_-30px_rgba(2,8,23,0.9)]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-sky-50/70 px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Session Chat
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
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
                <span className="text-slate-600 dark:text-slate-300">
                  {chatStatus !== "connected"
                    ? "Peer status unavailable"
                    : peerOnline
                      ? "Peer online"
                      : "Peer offline"}
                </span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
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
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] px-5 py-4 md:px-6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))]">
          {messages.length > 0 ? (
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
                  <div className="max-w-[90%] rounded-full border border-violet-200/80 bg-violet-50/95 px-4 py-2 text-center text-sm font-medium text-violet-900 shadow-sm dark:border-violet-800 dark:bg-violet-900/35 dark:text-violet-100">
                    {message.text}
                  </div>
                ) : (
                  <>
                    <div
                      className={`mb-1 flex max-w-[92%] items-center gap-2 px-1 text-xs ${
                        message.username === currentUsername
                          ? "justify-end text-sky-700 dark:text-sky-300"
                          : "justify-start text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      <span className="font-semibold">
                        {message.username === currentUsername
                          ? "You"
                          : message.username}
                      </span>
                      {message.timestamp && (
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div
                      className={`max-w-[92%] rounded-3xl border px-4 py-3.5 text-[15px] leading-7 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.45)] md:px-5 ${
                        message.username === currentUsername
                          ? "border-sky-300/80 bg-sky-50 text-slate-950 dark:border-sky-700/80 dark:bg-sky-950/45 dark:text-sky-50"
                          : "border-emerald-300/80 bg-emerald-50 text-slate-950 dark:border-emerald-700/80 dark:bg-emerald-950/40 dark:text-emerald-50"
                      }`}
                    >
                      <ChatMessageContent text={message.text} />
                    </div>
                    <div className="mt-2 flex max-w-[92%] flex-wrap items-center gap-2 px-1">
                      {["\u{1F44D}"].map((emoji) => {
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
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-white/75 px-6 text-center text-sm leading-6 text-muted-foreground dark:border-slate-700 dark:bg-slate-950/70">
              Chat messages will appear here once either of you starts the
              conversation.
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="border-t border-slate-200/80 bg-white/96 p-3 dark:border-slate-800 dark:bg-slate-900/96">
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
          {typingNames.length > 0 && (
            <p className="mb-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {typingNames.join(", ")} typing...
            </p>
          )}
          <textarea
            ref={inputRef}
            disabled={inputDisabled}
            rows={2}
            className="w-full resize-y rounded-2xl border border-slate-300/80 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 shadow-inner outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-sky-700 dark:focus:bg-slate-950 dark:focus:ring-sky-950/60"
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
              if (event.key === "Escape") {
                onClose();
                return;
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSendMessage();
              }
            }}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Press Enter to send. Press Shift+Enter for a new line. Press Esc
              to close.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onSendMessage}
              disabled={inputDisabled || !chatInput.trim()}
            >
              Send Message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
