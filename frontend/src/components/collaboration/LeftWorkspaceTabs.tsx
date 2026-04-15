import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { QuestionRecord } from "@/types";
import { difficultyBadgeStyles } from "@/lib/collaboration/executionFormatters";
import type {
  AiStyle,
  AiVerbosity,
  QuestionHelpMode,
} from "@/lib/collaboration/types";
import { AiResponsePanel, TestCaseView } from "./shared";

type LeftTab = "question" | "tests" | "ai";

interface LeftWorkspaceTabsProps {
  question: QuestionRecord | null;
  // Test cases
  runningMode: "run" | "submit" | null;
  customTestError: string | null;
  customFunctionArgsText: string;
  customClassOperationsText: string;
  customClassArgumentsText: string;
  onCustomFunctionArgsChange: (value: string) => void;
  onCustomClassOperationsChange: (value: string) => void;
  onCustomClassArgumentsChange: (value: string) => void;
  onRunCustomTest: () => void;
  // AI helper
  aiVerbosity: AiVerbosity;
  aiStyle: AiStyle;
  questionHelpMode: QuestionHelpMode;
  questionHelpPrompt: string;
  questionHelp: string | null;
  questionHelpError: string | null;
  questionHelpLoading: boolean;
  explaining: boolean;
  onAiVerbosityChange: (verbosity: AiVerbosity) => void;
  onAiStyleChange: (style: AiStyle) => void;
  onQuestionHelpModeChange: (mode: QuestionHelpMode) => void;
  onQuestionHelpPromptChange: (prompt: string) => void;
  onRequestQuestionHelp: (mode: QuestionHelpMode) => void;
  onCloseQuestionHelp: () => void;
}

const TABS: Array<{ value: LeftTab; label: string }> = [
  { value: "question", label: "Question" },
  { value: "tests", label: "Test Cases" },
  { value: "ai", label: "AI Helper" },
];

const STYLE_OPTIONS: Array<{ value: AiStyle; label: string }> = [
  { value: "concise_coach", label: "Concise Coach" },
  { value: "teacher", label: "Teacher" },
  { value: "beginner_friendly", label: "Beginner Friendly" },
  { value: "interviewer", label: "Interview Coach" },
];

const QUICK_MODE_OPTIONS: Array<{ value: QuestionHelpMode; label: string }> = [
  { value: "rephrase", label: "Rephrase" },
  { value: "beginner_explanation", label: "Explain Simply" },
  { value: "test_case_generation", label: "Generate Test Cases" },
  { value: "optimization_hint", label: "Optimization Hint" },
];

export function LeftWorkspaceTabs(props: LeftWorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>("question");
  const { question } = props;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
      <div className="flex flex-wrap gap-1 border-b border-slate-200/80 px-3 py-2 dark:border-slate-800">
        {TABS.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-sky-100 text-sky-900 shadow-sm dark:bg-sky-900/40 dark:text-sky-100"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!question ? (
          <p className="text-sm text-muted-foreground">Loading question...</p>
        ) : activeTab === "question" ? (
          <QuestionContent question={question} />
        ) : activeTab === "tests" ? (
          <TestsContent {...props} question={question} />
        ) : (
          <AiHelperContent {...props} />
        )}
      </div>
    </div>
  );
}

// ── Question tab content ─────────────────────────────────────────────

function QuestionContent({ question }: { question: QuestionRecord }) {
  return (
    <div className="space-y-4 rounded-2xl border border-sky-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {question.title}
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${difficultyBadgeStyles(
              question.difficulty,
            )}`}
          >
            {question.difficulty}
          </span>
        </div>
        {question.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {question.categories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-sky-200/80 bg-sky-50/80 px-2.5 py-0.5 text-[11px] text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {question.description}
      </p>

      {question.link && (
        <a
          href={question.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline dark:text-sky-300"
        >
          View on LeetCode <span aria-hidden>→</span>
        </a>
      )}
    </div>
  );
}

// ── Test cases tab content ───────────────────────────────────────────

function TestsContent({
  question,
  runningMode,
  customTestError,
  customFunctionArgsText,
  customClassOperationsText,
  customClassArgumentsText,
  onCustomFunctionArgsChange,
  onCustomClassOperationsChange,
  onCustomClassArgumentsChange,
  onRunCustomTest,
}: LeftWorkspaceTabsProps & { question: QuestionRecord }) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Sample Test Cases
        </p>
        <div className="space-y-3">
          {question.visibleTestCases.map((testCase, index) => (
            <TestCaseView
              key={testCase.id}
              testCase={testCase}
              title={`Sample ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-dashed border-sky-200/80 bg-sky-50/50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Custom Test
            </p>
            <p className="text-sm text-muted-foreground">
              Run your own input without changing the shared sample testcases. These
              inputs stay on this page while you work, but are not saved as shared
              session history.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onRunCustomTest}
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
              rows={6}
              value={customFunctionArgsText}
              onChange={(event) => onCustomFunctionArgsChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-950"
              placeholder='[["hello"], 3]'
            />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Operations JSON Array
              </label>
              <textarea
                rows={6}
                value={customClassOperationsText}
                onChange={(event) =>
                  onCustomClassOperationsChange(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 font-mono text-sm dark:border-slate-800 dark:bg-slate-950"
                placeholder='["LRUCache", "put", "get"]'
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Arguments JSON Array
              </label>
              <textarea
                rows={6}
                value={customClassArgumentsText}
                onChange={(event) =>
                  onCustomClassArgumentsChange(event.target.value)
                }
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
    </div>
  );
}

// ── AI helper tab content ────────────────────────────────────────────

function AiHelperContent({
  aiVerbosity,
  aiStyle,
  questionHelpMode,
  questionHelpPrompt,
  questionHelp,
  questionHelpError,
  questionHelpLoading,
  explaining,
  onAiVerbosityChange,
  onAiStyleChange,
  onQuestionHelpModeChange,
  onQuestionHelpPromptChange,
  onRequestQuestionHelp,
  onCloseQuestionHelp,
}: LeftWorkspaceTabsProps) {
  const controlsDisabled = questionHelpLoading || explaining;

  return (
    <div className="space-y-4 rounded-2xl border border-violet-200/80 bg-violet-50/60 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          AI Question Helper
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Bounded help — rephrase, explain, brainstorm, or generate test cases. Not
          full solutions by default.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Detail
          </span>
          <select
            value={aiVerbosity}
            onChange={(event) => onAiVerbosityChange(event.target.value as AiVerbosity)}
            disabled={controlsDisabled}
            className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="quick">Quick Help</option>
            <option value="detailed">More Detail</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Teaching Style
          </span>
          <select
            value={aiStyle}
            onChange={(event) => onAiStyleChange(event.target.value as AiStyle)}
            disabled={controlsDisabled}
            className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
          >
            {STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Quick Actions
        </span>
        <div className="flex flex-wrap gap-2">
          {QUICK_MODE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={questionHelpMode === option.value ? "default" : "outline"}
              onClick={() => {
                onQuestionHelpModeChange(option.value);
                onRequestQuestionHelp(option.value);
              }}
              disabled={questionHelpLoading}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Ask AI About This Question
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            rows={3}
            value={questionHelpPrompt}
            onChange={(event) => onQuestionHelpPromptChange(event.target.value)}
            className="min-h-[80px] flex-1 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950"
            placeholder="What is this question really asking? What edge cases should we think about?"
          />
          <Button
            type="button"
            className="sm:self-start"
            onClick={() => {
              onQuestionHelpModeChange("brainstorm");
              onRequestQuestionHelp("brainstorm");
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
          onClose={onCloseQuestionHelp}
        />
      )}
    </div>
  );
}
