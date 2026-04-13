import { config } from "../config";
import type {
  ClassJudgeTestCase,
  ExecutionCaseResult,
  ExecutionMode,
  ExecutionRequestBody,
  ExecutionResult,
  ExecutionResultMode,
  ExecutionVerdict,
  FunctionJudgeTestCase,
  JudgeQuestion,
  JudgeTestCase,
} from "../types";

const RESULT_START_MARKER = "__PEERPREP_EXECUTION_RESULT_START__";
const RESULT_END_MARKER = "__PEERPREP_EXECUTION_RESULT_END__";
const PYTHON_USER_PRELUDE = [
  "from typing import *",
  "from collections import *",
  "from functools import *",
  "from heapq import *",
  "from bisect import *",
  "from itertools import *",
  "from math import *",
  "import bisect",
  "import collections",
  "import functools",
  "import heapq",
  "import itertools",
  "import math",
  "import random",
  "import re",
  "import string",
].join("\n");

interface ExecutionRunnerResult {
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number | null;
  signal: string | null;
}

interface ExecutionRunner {
  executePython(
    source: string,
    limits: { timeLimitMs: number; memoryLimitMb: number },
  ): Promise<ExecutionRunnerResult>;
}

interface HarnessResult {
  verdict: ExecutionVerdict;
  stdout: string;
  stderr: string;
  runtimeMs: number;
  memoryKb: number;
  passedCount: number;
  totalCount: number;
  cases: ExecutionCaseResult[];
}

type CustomFunctionCase = Pick<FunctionJudgeTestCase, "args">;
type CustomClassCase = Pick<ClassJudgeTestCase, "operations" | "arguments">;

function truncateText(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}\n...(truncated)`;
}

function normalizeRunnerText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapInfrastructureVerdict(stderr: string): ExecutionVerdict {
  const normalized = stderr.toLowerCase();
  if (normalized.includes("timed out") || normalized.includes("timeout")) {
    return "Time Limit Exceeded";
  }
  if (normalized.includes("memory")) {
    return "Memory Limit Exceeded";
  }
  return "Internal Error";
}

function buildCasesForMode(
  question: JudgeQuestion,
  mode: ExecutionResultMode,
  customTestCase?: ExecutionRequestBody["customTestCase"],
): JudgeTestCase[] {
  if (mode === "submit") {
    return [...question.visibleTestCases, ...question.hiddenTestCases];
  }

  if (!customTestCase) {
    return question.visibleTestCases;
  }

  if (question.executionMode === "python_function") {
    return [
      {
        id: "custom-run",
        args: Array.isArray(customTestCase.args) ? customTestCase.args : [],
      } as FunctionJudgeTestCase,
    ];
  }

  return [
    {
      id: "custom-run",
      operations: Array.isArray(customTestCase.operations)
        ? customTestCase.operations
        : [],
      arguments: Array.isArray(customTestCase.arguments)
        ? customTestCase.arguments
        : [],
    } as ClassJudgeTestCase,
  ];
}

function validateCustomTestCase(
  executionMode: ExecutionMode,
  customTestCase?: ExecutionRequestBody["customTestCase"],
): void {
  if (!customTestCase) {
    return;
  }

  if (executionMode === "python_function") {
    if (!Array.isArray(customTestCase.args)) {
      throw new Error("Custom function testcase must provide an args array.");
    }
    return;
  }

  if (
    !Array.isArray(customTestCase.operations) ||
    !Array.isArray(customTestCase.arguments) ||
    customTestCase.operations.length !== customTestCase.arguments.length
  ) {
    throw new Error(
      "Custom class testcase must provide matching operations and arguments arrays.",
    );
  }
}

function sanitizeSubmitCases(
  result: ExecutionResult,
  question: JudgeQuestion,
): ExecutionResult {
  if (result.mode !== "submit") {
    return result;
  }

  const visibleCaseIds = new Set(
    question.visibleTestCases.map((testCase) => testCase.id),
  );
  const failingCase = result.cases.find(
    (testCase) => testCase.verdict !== "Accepted",
  );

  return {
    ...result,
    cases:
      result.verdict === "Accepted"
        ? []
        : failingCase
          ? [failingCase]
          : result.cases.filter((testCase) => visibleCaseIds.has(testCase.id)),
  };
}

function extractHarnessResult(
  stdout: string,
  stderr: string,
): HarnessResult | null {
  const startIndex = stdout.indexOf(RESULT_START_MARKER);
  const endIndex = stdout.indexOf(RESULT_END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  const payload = stdout
    .slice(startIndex + RESULT_START_MARKER.length, endIndex)
    .trim();

  if (!payload) {
    return null;
  }

  const parsed = JSON.parse(payload) as HarnessResult;
  parsed.stdout = truncateText(normalizeRunnerText(parsed.stdout), config.executionOutputLimitBytes);
  parsed.stderr = truncateText(
    [normalizeRunnerText(parsed.stderr), normalizeRunnerText(stderr)]
      .filter(Boolean)
      .join("\n")
      .trim(),
    config.executionOutputLimitBytes,
  );
  parsed.cases = Array.isArray(parsed.cases) ? parsed.cases : [];
  return parsed;
}

function buildJudgeHarness(
  question: JudgeQuestion,
  sourceCode: string,
  mode: ExecutionResultMode,
  testCases: JudgeTestCase[],
): string {
  const className = question.judgeConfig?.className || "";
  const methodName = question.judgeConfig?.methodName || "";
  const comparisonMode = question.judgeConfig?.comparisonMode || "exact_json";

  return `import contextlib
import io
import json
import math
import time
import traceback
import tracemalloc

RESULT_START = ${JSON.stringify(RESULT_START_MARKER)}
RESULT_END = ${JSON.stringify(RESULT_END_MARKER)}
OUTPUT_LIMIT = ${JSON.stringify(config.executionOutputLimitBytes)}
MODE = ${JSON.stringify(mode)}
EXECUTION_MODE = ${JSON.stringify(question.executionMode)}
COMPARE_MODE = ${JSON.stringify(comparisonMode)}
CLASS_NAME = ${JSON.stringify(className)}
METHOD_NAME = ${JSON.stringify(methodName)}
USER_CODE = ${JSON.stringify(sourceCode)}
USER_CODE_WITH_PRELUDE = ${JSON.stringify(`${PYTHON_USER_PRELUDE}\n`)} + USER_CODE
TEST_CASES = json.loads(${JSON.stringify(JSON.stringify(testCases))})

class LimitedBuffer(io.StringIO):
    def __init__(self, limit):
        super().__init__()
        self.limit = limit
        self.total_written = 0
        self.truncated = False

    def write(self, value):
        if not isinstance(value, str):
            value = str(value)
        self.total_written += len(value)
        if self.tell() >= self.limit:
            self.truncated = True
            return len(value)
        remaining = self.limit - self.tell()
        if len(value) > remaining:
            super().write(value[:remaining])
            self.truncated = True
        else:
            super().write(value)
        return len(value)

    def get_clipped_value(self):
        text = self.getvalue()
        if self.truncated or self.total_written > self.limit:
            return text + "\\n...(truncated)"
        return text

def clip_text(value, limit=OUTPUT_LIMIT):
    if value is None:
        return ""
    text = str(value)
    if len(text) <= limit:
        return text
    return text[:limit] + "\\n...(truncated)"

def sanitize(value):
    if isinstance(value, (str, int, bool)) or value is None:
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return str(value)
        return value
    if isinstance(value, (list, tuple)):
        return [sanitize(item) for item in value]
    if isinstance(value, dict):
        return {str(key): sanitize(item) for key, item in value.items()}
    return repr(value)

def normalize(value):
    sanitized = sanitize(value)
    if isinstance(sanitized, float) and COMPARE_MODE == "float_tolerance":
        return round(sanitized, 6)
    if isinstance(sanitized, list):
        return [normalize(item) for item in sanitized]
    if isinstance(sanitized, dict):
        return {key: normalize(sanitized[key]) for key in sorted(sanitized)}
    return sanitized

def compare_values(actual, expected):
    left = normalize(actual)
    right = normalize(expected)
    return left == right

def preview(value):
    try:
        return clip_text(json.dumps(sanitize(value), sort_keys=True))
    except Exception:
        return clip_text(repr(value))

def runtime_error_case(case_id, error, stdout_text, stderr_text):
    return {
        "id": case_id,
        "verdict": "Runtime Error",
        "inputPreview": "",
        "expectedPreview": "",
        "actualPreview": "",
        "stdout": clip_text(stdout_text),
        "stderr": clip_text(stderr_text),
        "errorMessage": clip_text(error),
    }

def run_function_case(namespace, case):
    stdout_buffer = LimitedBuffer(OUTPUT_LIMIT)
    stderr_buffer = LimitedBuffer(OUTPUT_LIMIT)
    case_id = case.get("id", "case")
    try:
        solution_class = namespace[CLASS_NAME]
        instance = solution_class()
        method = getattr(instance, METHOD_NAME)
        tracemalloc.reset_peak()
        started = time.perf_counter()
        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
            actual = method(*case.get("args", []))
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        _, peak_bytes = tracemalloc.get_traced_memory()
        has_expected = "expected" in case
        expected = case.get("expected")
        verdict = "Accepted"
        error_message = ""
        if has_expected and not compare_values(actual, expected):
            verdict = "Wrong Answer"
            error_message = "Expected output did not match actual output."
        return {
            "id": case_id,
            "verdict": verdict,
            "inputPreview": preview(case.get("args", [])),
            "expectedPreview": preview(expected) if has_expected else "",
            "actualPreview": preview(actual),
            "stdout": stdout_buffer.get_clipped_value(),
            "stderr": stderr_buffer.get_clipped_value(),
            "errorMessage": error_message,
            "_runtimeMs": elapsed_ms,
            "_memoryKb": int(peak_bytes / 1024),
        }
    except Exception:
        return runtime_error_case(
            case_id,
            traceback.format_exc(limit=5),
            stdout_buffer.get_clipped_value(),
            stderr_buffer.get_clipped_value(),
        )

def run_class_case(namespace, case):
    stdout_buffer = LimitedBuffer(OUTPUT_LIMIT)
    stderr_buffer = LimitedBuffer(OUTPUT_LIMIT)
    case_id = case.get("id", "case")
    try:
        klass = namespace[CLASS_NAME]
        operations = case.get("operations", [])
        arguments = case.get("arguments", [])
        if not operations or not arguments or len(operations) != len(arguments):
            raise ValueError("Invalid class testcase payload.")
        tracemalloc.reset_peak()
        started = time.perf_counter()
        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
            instance = klass(*arguments[0])
            actual = [None]
            for operation, operation_args in zip(operations[1:], arguments[1:]):
                actual.append(getattr(instance, operation)(*operation_args))
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        _, peak_bytes = tracemalloc.get_traced_memory()
        has_expected = "expected" in case
        expected = case.get("expected")
        verdict = "Accepted"
        error_message = ""
        if has_expected and not compare_values(actual, expected):
            verdict = "Wrong Answer"
            error_message = "Expected output did not match actual output."
        return {
            "id": case_id,
            "verdict": verdict,
            "inputPreview": preview({
                "operations": operations,
                "arguments": arguments,
            }),
            "expectedPreview": preview(expected) if has_expected else "",
            "actualPreview": preview(actual),
            "stdout": stdout_buffer.get_clipped_value(),
            "stderr": stderr_buffer.get_clipped_value(),
            "errorMessage": error_message,
            "_runtimeMs": elapsed_ms,
            "_memoryKb": int(peak_bytes / 1024),
        }
    except Exception:
        return runtime_error_case(
            case_id,
            traceback.format_exc(limit=5),
            stdout_buffer.get_clipped_value(),
            stderr_buffer.get_clipped_value(),
        )

def finalize_report(report):
    print(RESULT_START)
    print(json.dumps(report))
    print(RESULT_END)

def main():
    namespace = {}
    report = {
        "verdict": "Accepted",
        "stdout": "",
        "stderr": "",
        "runtimeMs": 0,
        "memoryKb": 0,
        "passedCount": 0,
        "totalCount": len(TEST_CASES),
        "cases": [],
    }
    top_stdout = LimitedBuffer(OUTPUT_LIMIT)
    top_stderr = LimitedBuffer(OUTPUT_LIMIT)
    tracemalloc.start()

    try:
        with contextlib.redirect_stdout(top_stdout), contextlib.redirect_stderr(top_stderr):
            compiled = compile(USER_CODE_WITH_PRELUDE, "<submitted_code>", "exec")
            exec(compiled, namespace)
    except SyntaxError:
        report["verdict"] = "Compilation Error"
        report["stderr"] = clip_text(traceback.format_exc(limit=5))
        report["stdout"] = top_stdout.get_clipped_value()
        finalize_report(report)
        return
    except Exception:
        report["verdict"] = "Runtime Error"
        report["stderr"] = clip_text(traceback.format_exc(limit=5))
        report["stdout"] = top_stdout.get_clipped_value()
        finalize_report(report)
        return

    report["stdout"] = top_stdout.get_clipped_value()
    report["stderr"] = top_stderr.get_clipped_value()
    highest_memory = 0
    total_runtime = 0

    for case in TEST_CASES:
        if EXECUTION_MODE == "python_function":
            case_result = run_function_case(namespace, case)
        else:
            case_result = run_class_case(namespace, case)

        total_runtime += int(case_result.pop("_runtimeMs", 0) or 0)
        highest_memory = max(highest_memory, int(case_result.pop("_memoryKb", 0) or 0))
        report["cases"].append(case_result)

        if case_result["verdict"] == "Accepted":
            report["passedCount"] += 1
            continue

        report["verdict"] = case_result["verdict"]
        if MODE == "submit":
            break

    if report["verdict"] == "Accepted" and report["passedCount"] != report["totalCount"]:
        report["verdict"] = "Wrong Answer"

    report["runtimeMs"] = total_runtime
    report["memoryKb"] = highest_memory
    finalize_report(report)

main()
`;
}

class PistonExecutionRunner implements ExecutionRunner {
  async executePython(
    source: string,
    limits: { timeLimitMs: number; memoryLimitMb: number },
  ): Promise<ExecutionRunnerResult> {
    const effectiveTimeLimitMs = Math.min(
      limits.timeLimitMs,
      config.pistonMaxTimeoutMs,
    );

    const response = await fetch(`${config.pistonUrl}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "python",
        version: "3.10.0",
        files: [{ content: source }],
        compile_timeout: effectiveTimeLimitMs,
        run_timeout: effectiveTimeLimitMs,
        compile_memory_limit: limits.memoryLimitMb * 1024 * 1024,
        run_memory_limit: limits.memoryLimitMb * 1024 * 1024,
      }),
    });

    if (!response.ok) {
      const errorText = truncateText(
        normalizeRunnerText(await response.text()),
        config.executionOutputLimitBytes,
      );
      throw new Error(
        errorText
          ? `Code execution service unavailable: ${errorText}`
          : "Code execution service unavailable.",
      );
    }

    const json = (await response.json()) as {
      run?: {
        stdout?: string;
        stderr?: string;
        output?: string;
        code?: number | null;
        signal?: string | null;
      };
    };

    return {
      stdout: normalizeRunnerText(json.run?.stdout),
      stderr: normalizeRunnerText(json.run?.stderr),
      output: normalizeRunnerText(json.run?.output),
      exitCode:
        typeof json.run?.code === "number" ? json.run.code : null,
      signal:
        typeof json.run?.signal === "string" ? json.run.signal : null,
    };
  }
}

export class ExecutionService {
  constructor(private readonly runner: ExecutionRunner = new PistonExecutionRunner()) {}

  async execute(
    question: JudgeQuestion,
    code: string,
    mode: ExecutionResultMode,
    initiatedByUserId: string,
    customTestCase?: ExecutionRequestBody["customTestCase"],
  ): Promise<ExecutionResult> {
    if (question.executionMode !== "python_function" && question.executionMode !== "python_class") {
      throw new Error("This question is not supported by the v1 judge.");
    }

    if (!question.judgeConfig) {
      throw new Error("Question judge metadata is incomplete.");
    }

    validateCustomTestCase(question.executionMode, customTestCase);
    const cases = buildCasesForMode(question, mode, customTestCase);

    if (cases.length === 0) {
      throw new Error("This question does not have any configured testcases.");
    }

    const harness = buildJudgeHarness(question, code, mode, cases);
    const runnerResult = await this.runner.executePython(harness, {
      timeLimitMs: question.judgeConfig.timeLimitMs,
      memoryLimitMb: question.judgeConfig.memoryLimitMb,
    });

    const parsed = extractHarnessResult(
      runnerResult.stdout || runnerResult.output,
      runnerResult.stderr,
    );

    const now = new Date().toISOString();
    if (!parsed) {
      const combinedError = truncateText(
        [runnerResult.stderr, runnerResult.output]
          .filter(Boolean)
          .join("\n")
          .trim(),
        config.executionOutputLimitBytes,
      );

      return {
        mode,
        executionMode: question.executionMode,
        verdict: mapInfrastructureVerdict(combinedError),
        status: "finished",
        stdout: "",
        stderr: combinedError,
        runtimeMs: 0,
        memoryKb: 0,
        passedCount: 0,
        totalCount: cases.length,
        cases: [],
        initiatedByUserId,
        initiatedAt: now,
      };
    }

    return sanitizeSubmitCases(
      {
        mode,
        executionMode: question.executionMode,
        verdict: parsed.verdict,
        status: "finished",
        stdout: truncateText(parsed.stdout || "", config.executionOutputLimitBytes),
        stderr: truncateText(parsed.stderr || "", config.executionOutputLimitBytes),
        runtimeMs: parsed.runtimeMs || 0,
        memoryKb: parsed.memoryKb || 0,
        passedCount: parsed.passedCount || 0,
        totalCount: parsed.totalCount || cases.length,
        cases: parsed.cases || [],
        initiatedByUserId,
        initiatedAt: now,
      },
      question,
    );
  }
}
