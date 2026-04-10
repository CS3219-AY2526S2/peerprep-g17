export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export const LANGUAGES = ["Python"] as const;
export const COLLABORATION_SESSION_STATUSES = ["active", "completed"] as const;
export const EXECUTION_MODES = [
  "python_function",
  "python_class",
] as const;
export const EXECUTION_RESULT_MODES = ["run", "submit"] as const;
export const EXECUTION_VERDICTS = [
  "Accepted",
  "Wrong Answer",
  "Runtime Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Compilation Error",
  "Internal Error",
] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];
export type Language = (typeof LANGUAGES)[number];
export type CollaborationSessionStatus =
  (typeof COLLABORATION_SESSION_STATUSES)[number];
export type ExecutionMode = (typeof EXECUTION_MODES)[number];
export type ExecutionResultMode = (typeof EXECUTION_RESULT_MODES)[number];
export type ExecutionVerdict = (typeof EXECUTION_VERDICTS)[number];

export interface CollaborationSessionPayload {
  sessionId: string;
  userAId: string;
  userBId: string;
  topic: string;
  difficulty: Difficulty;
  questionId: string;
  language: Language;
}

export interface FunctionJudgeTestCase {
  id: string;
  args: unknown[];
  expected: unknown;
}

export interface ClassJudgeTestCase {
  id: string;
  operations: string[];
  arguments: unknown[][];
  expected: unknown[];
}

export type JudgeTestCase = FunctionJudgeTestCase | ClassJudgeTestCase;

export interface JudgeConfig {
  className?: string;
  methodName?: string;
  comparisonMode: "exact_json" | "float_tolerance";
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface JudgeQuestion {
  id: string;
  title: string;
  difficulty?: Difficulty;
  categories?: string[];
  executionMode: ExecutionMode | "unsupported";
  starterCode: { python: string };
  visibleTestCases: JudgeTestCase[];
  hiddenTestCases: JudgeTestCase[];
  judgeConfig: JudgeConfig | null;
}

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
  mode: ExecutionResultMode;
  executionMode: ExecutionMode;
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

export interface ExecutionRequestBody {
  code?: string;
  customTestCase?: {
    args?: unknown[];
    operations?: string[];
    arguments?: unknown[][];
  };
}

export interface SessionQuestionSwitchBody {
  questionId?: string;
}
