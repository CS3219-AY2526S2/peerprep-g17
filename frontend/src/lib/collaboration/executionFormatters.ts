import type {
  ExecutionResult,
  FunctionJudgeTestCase,
  JudgeTestCase,
} from "@/types";

export function isFunctionCase(
  testCase: JudgeTestCase,
): testCase is FunctionJudgeTestCase {
  return "args" in testCase;
}

export function toDisplayJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
}

export function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
}

export function verdictStyles(verdict?: string): string {
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

export function formatRuntime(runtimeMs: number): string {
  if (runtimeMs < 1000) {
    return `${runtimeMs} ms`;
  }
  return `${(runtimeMs / 1000).toFixed(2)} s`;
}

export function formatMemory(memoryKb: number): string {
  if (memoryKb < 1024) {
    return `${memoryKb} KB`;
  }
  return `${(memoryKb / 1024).toFixed(2)} MB`;
}

export function isCustomRunResult(result: ExecutionResult | null): boolean {
  return Boolean(
    result &&
      result.mode === "run" &&
      result.cases.some((testCase) => testCase.id === "custom-run"),
  );
}

export function executionHeading(result: ExecutionResult): string {
  if (isCustomRunResult(result)) {
    return "Custom Output";
  }
  return result.mode === "submit" ? "Submission Verdict" : "Run Result";
}

export function executionDisplayVerdict(result: ExecutionResult): string {
  if (isCustomRunResult(result)) {
    return result.verdict === "Accepted" ? "Output Ready" : result.verdict;
  }
  return result.verdict;
}

export function executionSummaryText(result: ExecutionResult): string | null {
  if (isCustomRunResult(result) && result.verdict === "Accepted") {
    return "Custom input executed. Inspect the output and details below.";
  }
  return null;
}

export function executionContainerStyles(result: ExecutionResult): string {
  if (isCustomRunResult(result) && result.verdict === "Accepted") {
    return "border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200";
  }
  return verdictStyles(result.verdict);
}

export function difficultyBadgeStyles(difficulty: string): string {
  switch (difficulty) {
    case "Easy":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "Medium":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "Hard":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
    default:
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300";
  }
}
