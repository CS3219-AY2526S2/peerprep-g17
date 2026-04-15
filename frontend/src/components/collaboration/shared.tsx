import { Fragment, useState, type ReactNode } from "react";

import type {
  ClassJudgeTestCase,
  FunctionJudgeTestCase,
  JudgeTestCase,
} from "@/types";
import {
  isFunctionCase,
  toDisplayJson,
} from "@/lib/collaboration/executionFormatters";

// ── Inline text helpers ───────────────────────────────────────────────

function renderInlineText(text: string): ReactNode {
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

// ── Code blocks (used in chat + explanations) ─────────────────────────

export function CodeSnippetBlock({
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

export function CopyableCodeBlock({
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

// ── Value preview (used in test case views) ──────────────────────────

export function ValuePreview({
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

// ── Test case views ───────────────────────────────────────────────────

function FunctionTestCaseView({
  testCase,
  title,
  showExpected,
}: {
  testCase: FunctionJudgeTestCase;
  title?: string;
  showExpected: boolean;
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
  showExpected,
}: {
  testCase: ClassJudgeTestCase;
  title?: string;
  showExpected: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/45">
      {title && <div className="text-base font-semibold text-foreground">{title}</div>}
      <div className="grid gap-3 md:grid-cols-3">
        <ValuePreview label="Operations" value={testCase.operations} emptyLabel="[]" />
        <ValuePreview label="Arguments" value={testCase.arguments} emptyLabel="[]" />
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

export function TestCaseView({
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

// ── Markdown-ish content (used by AI explanations) ────────────────────

export function ExplanationContent({ content }: { content: string }) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const elements: ReactNode[] = [];
  const lines = normalized.split("\n");

  for (let index = 0; index < lines.length; ) {
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
        <ul
          key={`ul-${elements.length}`}
          className="list-disc space-y-2.5 pl-5 text-[14px] leading-6 text-foreground/85"
        >
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
        <ol
          key={`ol-${elements.length}`}
          className="list-decimal space-y-2.5 pl-5 text-[14px] leading-6 text-foreground/85"
        >
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
      <p
        key={`p-${elements.length}`}
        className="text-[14px] leading-7 text-foreground/85"
      >
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

export function AiResponsePanel({
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
          label: "text-sky-700 dark:text-sky-300",
        }
      : {
          border: "border-violet-200/80 dark:border-violet-900/60",
          label: "text-violet-700 dark:text-violet-300",
        };

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${toneClasses.border} bg-white/95 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] dark:bg-slate-900/85 dark:shadow-none`}
    >
      <div
        className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${toneClasses.border}`}
      >
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.16em] ${toneClasses.label}`}
        >
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

// ── Chat message rendering ────────────────────────────────────────────

export function ChatMessageContent({ text }: { text: string }) {
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
