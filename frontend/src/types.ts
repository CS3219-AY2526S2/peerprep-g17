/* ── Question types ──────────────────────────────────── */

export interface ExampleRecord {
  input: string;
  output: string;
  explanation?: string;
}

export interface QuestionRecord {
  id: string;
  title: string;
  difficulty: string;
  categories: string[];
  description: string;
  examples: ExampleRecord[];
  link: string;
  executionMode: "python_function" | "python_class" | "unsupported";
  starterCode: { python: string };
  visibleTestCases: JudgeTestCase[];
  judgeConfig: JudgeConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface FunctionJudgeTestCase {
  id: string;
  args: unknown[];
  expected?: unknown;
}

export interface ClassJudgeTestCase {
  id: string;
  operations: string[];
  arguments: unknown[][];
  expected?: unknown[];
}

export type JudgeTestCase = FunctionJudgeTestCase | ClassJudgeTestCase;

export interface JudgeConfig {
  className?: string;
  methodName?: string;
  comparisonMode: "exact_json" | "float_tolerance";
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface QuestionMeta {
  total: number;
  difficulties: string[];
  categories: string[];
}

/* ── Question constants ─────────────────────────────── */

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const CATEGORIES = [
  "Algorithms",
  "Arrays",
  "Binary Search",
  "Bit Manipulation",
  "Brainteaser",
  "Data Structures",
  "Databases",
  "Depth-First Search",
  "Dynamic Programming",
  "Greedy",
  "Hash Table",
  "Math",
  "Recursion",
  "Sorting",
  "Strings",
] as const;

export const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Hard: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20",
};

/* ── User types ─────────────────────────────────────── */

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  university: string;
  bio: string;
  profilePhotoUrl: string | null;
}

export type MatchStatus = "searching" | "matched" | "timed_out" | "cancelled";

export interface MatchState {
  status: MatchStatus;
  requestId: string;
  sessionId?: string;
  remainingMs?: number;
  partnerUserId?: string;
  topic?: string;
  difficulty?: string;
  questionId?: string;
}

export interface CollaborationSessionRecord {
  sessionId: string;
  userAId: string;
  userBId: string;
  topic: string;
  difficulty: string;
  questionId: string;
  language: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  starterCodeSeededAt?: string;
  sharedCode?: string;
  sharedYjsState?: string | null;
  lastExecutionResult?: ExecutionResult | null;
  lastExecutionAt?: string;
  lastSubmittedAt?: string;
}

export type ExecutionVerdict =
  | "Accepted"
  | "Wrong Answer"
  | "Runtime Error"
  | "Time Limit Exceeded"
  | "Memory Limit Exceeded"
  | "Compilation Error"
  | "Internal Error";

export interface ExecutionCaseResult {
  id: string;
  verdict: ExecutionVerdict;
  inputPreview: string;
  expectedPreview: string;
  actualPreview: string;
  stdout: string;
  stderr: string;
  errorMessage: string;
}

export interface ExecutionResult {
  mode: "run" | "submit";
  executionMode: "python_function" | "python_class";
  verdict: ExecutionVerdict;
  status: "finished";
  stdout: string;
  stderr: string;
  runtimeMs: number;
  memoryKb: number;
  passedCount: number;
  totalCount: number;
  cases: ExecutionCaseResult[];
  initiatedByUserId: string;
  initiatedAt: string;
}

export interface AttemptRecord {
  _id: string;
  sessionId: string;
  questionId: string;
  topic: string;
  difficulty: string;
  language: string;
  code: string;
  attemptedAt: string;
  mode?: "submit" | "session_complete";
  verdict?: ExecutionVerdict;
  passedCount?: number;
  totalCount?: number;
  runtimeMs?: number;
  memoryKb?: number;
  executionMode?: "python_function" | "python_class";
  firstFailingCase?: ExecutionCaseResult | null;
  submittedAt?: string | null;
  reflectionNote?: string;
  reflectionChecked?: boolean;
}

export interface AttemptSuggestion {
  hint: string;
  improvementAreas: string;
  approach: string;
  solution: string;
  takeaway: string;
}
