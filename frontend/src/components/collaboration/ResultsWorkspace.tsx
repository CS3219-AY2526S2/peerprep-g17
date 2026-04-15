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
import type { ResultTab as ResultTabType } from "@/lib/collaboration/types";
import { CopyableCodeBlock } from "./shared";

interface ResultsWorkspaceProps {
  resultTab: ResultTabType;
  onResultTabChange: (tab: ResultTabType) => void;
  runningMode: "run" | "submit" | null;
  executionError: string | null;
  executionResult: ExecutionResult | null;
  latestExecutionLabel: string;
}

const TAB_CONFIG: Array<{
  value: Extract<ResultTabType, "result" | "console">;
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
];

export function ResultsWorkspace(props: ResultsWorkspaceProps) {
  const { resultTab, onResultTabChange } = props;
  const activeTab = resultTab === "chat" ? "result" : resultTab;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-amber-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
      <div className="flex flex-wrap gap-1 border-b border-slate-200/80 px-3 py-2 dark:border-slate-800">
        {TAB_CONFIG.map((tab) => {
          const active = activeTab === tab.value;
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
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-4">
        {activeTab === "result" && (
          <div className="h-full overflow-y-auto">
            <ResultContent
              runningMode={props.runningMode}
              executionError={props.executionError}
              executionResult={props.executionResult}
              latestExecutionLabel={props.latestExecutionLabel}
            />
          </div>
        )}
        {activeTab === "console" && (
          <div className="h-full overflow-y-auto">
            <ConsoleContent executionResult={props.executionResult} />
          </div>
        )}
      </div>
    </div>
  );
}

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
