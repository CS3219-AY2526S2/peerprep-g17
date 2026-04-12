import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionService } from "../services/executionService";
import type { JudgeQuestion } from "../types";

function createFunctionQuestion(): JudgeQuestion {
  return {
    id: "q-1",
    title: "Two Sum",
    difficulty: "Easy",
    categories: ["Arrays"],
    executionMode: "python_function",
    starterCode: { python: "def solve(nums, target):\n    return []\n" },
    visibleTestCases: [{ id: "visible-1", args: [[2, 7], 9], expected: [0, 1] }],
    hiddenTestCases: [{ id: "hidden-1", args: [[3, 2, 4], 6], expected: [1, 2] }],
    judgeConfig: {
      methodName: "solve",
      comparisonMode: "exact_json",
      timeLimitMs: 4000,
      memoryLimitMb: 256,
    },
  };
}

test("ExecutionService rejects unsupported questions, missing judge config, and empty testcase sets", async () => {
  const runner = {
    async executePython() {
      return {
        stdout: "",
        stderr: "",
        output: "",
        exitCode: 0,
        signal: null,
      };
    },
  };

  const service = new ExecutionService(runner);

  await assert.rejects(
    () =>
      service.execute(
        { ...createFunctionQuestion(), executionMode: "unsupported" },
        "print('hi')",
        "run",
        "user-1",
      ),
    /not supported/i,
  );

  await assert.rejects(
    () =>
      service.execute(
        { ...createFunctionQuestion(), judgeConfig: null },
        "print('hi')",
        "run",
        "user-1",
      ),
    /judge metadata is incomplete/i,
  );

  await assert.rejects(
    () =>
      service.execute(
        {
          ...createFunctionQuestion(),
          visibleTestCases: [],
          hiddenTestCases: [],
        },
        "print('hi')",
        "run",
        "user-1",
      ),
    /does not have any configured testcases/i,
  );
});

test("ExecutionService validates custom testcase payloads for function and class modes", async () => {
  const runner = {
    async executePython() {
      return {
        stdout: "",
        stderr: "",
        output: "",
        exitCode: 0,
        signal: null,
      };
    },
  };

  const service = new ExecutionService(runner);

  await assert.rejects(
    () =>
      service.execute(
        createFunctionQuestion(),
        "print('hi')",
        "run",
        "user-1",
        { operations: ["solve"], arguments: [[]] },
      ),
    /args array/i,
  );

  await assert.rejects(
    () =>
      service.execute(
        {
          ...createFunctionQuestion(),
          executionMode: "python_class",
          judgeConfig: {
            className: "LRUCache",
            comparisonMode: "exact_json",
            timeLimitMs: 4000,
            memoryLimitMb: 256,
          },
          visibleTestCases: [
            {
              id: "class-visible",
              operations: ["LRUCache", "put"],
              arguments: [[2], [1, 1]],
              expected: [null, null],
            },
          ],
        },
        "print('hi')",
        "run",
        "user-1",
        { operations: ["LRUCache"], arguments: [[2], [1, 1]] },
      ),
    /matching operations and arguments arrays/i,
  );
});

test("ExecutionService maps missing harness output to infrastructure verdicts", async () => {
  const timeoutRunner = {
    async executePython() {
      return {
        stdout: "",
        stderr: "timed out by sandbox",
        output: "",
        exitCode: 1,
        signal: null,
      };
    },
  };

  const timeoutResult = await new ExecutionService(timeoutRunner).execute(
    createFunctionQuestion(),
    "print('hi')",
    "run",
    "user-1",
  );
  assert.equal(timeoutResult.verdict, "Time Limit Exceeded");

  const memoryRunner = {
    async executePython() {
      return {
        stdout: "",
        stderr: "memory limit exceeded",
        output: "",
        exitCode: 1,
        signal: null,
      };
    },
  };

  const memoryResult = await new ExecutionService(memoryRunner).execute(
    createFunctionQuestion(),
    "print('hi')",
    "run",
    "user-1",
  );
  assert.equal(memoryResult.verdict, "Memory Limit Exceeded");
});

test("ExecutionService sanitizes submit results to hide hidden accepted cases and keep the first failing case", async () => {
  const acceptedRunner = {
    async executePython() {
      return {
        stdout: [
          "__PEERPREP_EXECUTION_RESULT_START__",
          JSON.stringify({
            verdict: "Accepted",
            stdout: "",
            stderr: "",
            runtimeMs: 3,
            memoryKb: 16,
            passedCount: 2,
            totalCount: 2,
            cases: [
              {
                id: "visible-1",
                verdict: "Accepted",
                inputPreview: "",
                expectedPreview: "",
                actualPreview: "",
                stdout: "",
                stderr: "",
                errorMessage: "",
              },
              {
                id: "hidden-1",
                verdict: "Accepted",
                inputPreview: "",
                expectedPreview: "",
                actualPreview: "",
                stdout: "",
                stderr: "",
                errorMessage: "",
              },
            ],
          }),
          "__PEERPREP_EXECUTION_RESULT_END__",
        ].join("\n"),
        stderr: "",
        output: "",
        exitCode: 0,
        signal: null,
      };
    },
  };

  const acceptedResult = await new ExecutionService(acceptedRunner).execute(
    createFunctionQuestion(),
    "print('hi')",
    "submit",
    "user-1",
  );
  assert.equal(acceptedResult.cases.length, 0);

  const failingRunner = {
    async executePython() {
      return {
        stdout: [
          "__PEERPREP_EXECUTION_RESULT_START__",
          JSON.stringify({
            verdict: "Wrong Answer",
            stdout: "",
            stderr: "",
            runtimeMs: 3,
            memoryKb: 16,
            passedCount: 0,
            totalCount: 2,
            cases: [
              {
                id: "hidden-1",
                verdict: "Wrong Answer",
                inputPreview: "",
                expectedPreview: "",
                actualPreview: "",
                stdout: "",
                stderr: "",
                errorMessage: "wrong",
              },
            ],
          }),
          "__PEERPREP_EXECUTION_RESULT_END__",
        ].join("\n"),
        stderr: "",
        output: "",
        exitCode: 0,
        signal: null,
      };
    },
  };

  const failingResult = await new ExecutionService(failingRunner).execute(
    createFunctionQuestion(),
    "print('hi')",
    "submit",
    "user-1",
  );
  assert.equal(failingResult.cases.length, 1);
  assert.equal(failingResult.cases[0]?.id, "hidden-1");
});

test("ExecutionService injects common Python standard-library helpers into the harness", async () => {
  let capturedSource = "";

  const runner = {
    async executePython(source: string) {
      capturedSource = source;
      return {
        stdout: [
          "__PEERPREP_EXECUTION_RESULT_START__",
          JSON.stringify({
            verdict: "Accepted",
            stdout: "",
            stderr: "",
            runtimeMs: 1,
            memoryKb: 1,
            passedCount: 1,
            totalCount: 1,
            cases: [
              {
                id: "visible-1",
                verdict: "Accepted",
                inputPreview: "",
                expectedPreview: "",
                actualPreview: "",
                stdout: "",
                stderr: "",
                errorMessage: "",
              },
            ],
          }),
          "__PEERPREP_EXECUTION_RESULT_END__",
        ].join("\n"),
        stderr: "",
        output: "",
        exitCode: 0,
        signal: null,
      };
    },
  };

  const service = new ExecutionService(runner);

  await service.execute(
    createFunctionQuestion(),
    "class Solution:\n    def solve(self, nums, target):\n        seen: List[int] = []\n        queue = deque(nums)\n        return [0, 1] if list(queue) == [2, 7] else seen\n",
    "run",
    "user-1",
  );

  assert.match(capturedSource, /from typing import \*/);
  assert.match(capturedSource, /from collections import \*/);
  assert.match(capturedSource, /from functools import \*/);
  assert.match(capturedSource, /from heapq import \*/);
  assert.match(capturedSource, /from bisect import \*/);
  assert.match(capturedSource, /import heapq/);
});
