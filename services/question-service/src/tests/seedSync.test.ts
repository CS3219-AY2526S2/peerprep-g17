import test from "node:test";
import assert from "node:assert/strict";
import Question from "../models/Question";
import { SEED_QUESTIONS } from "../data/seedQuestions";
import { syncSeedQuestionExecutionMetadata } from "../utils/seedSync";

const originalFind = Question.find;
const originalBulkWrite = Question.bulkWrite;

test.afterEach(() => {
  Question.find = originalFind;
  Question.bulkWrite = originalBulkWrite;
});

test("syncSeedQuestionExecutionMetadata returns 0 when there are no matching seed questions", async () => {
  Question.find = (() => ({
    lean: async () => [
      {
        _id: "question-1",
        title: "Custom Interview Question",
        executionMode: "python_function",
        starterCode: { python: "def solve():\n    pass\n" },
        visibleTestCases: [],
        hiddenTestCases: [],
        judgeConfig: null,
      },
    ],
  })) as typeof Question.find;

  let bulkWriteCalled = false;
  Question.bulkWrite = (async () => {
    bulkWriteCalled = true;
    return { modifiedCount: 0 } as never;
  }) as typeof Question.bulkWrite;

  const updated = await syncSeedQuestionExecutionMetadata();

  assert.equal(updated, 0);
  assert.equal(bulkWriteCalled, false);
});

test("syncSeedQuestionExecutionMetadata returns 0 when matching seed metadata is already up to date", async () => {
  const seed = SEED_QUESTIONS[0];
  assert.ok(seed);

  Question.find = (() => ({
    lean: async () => [
      {
        _id: "question-2",
        title: seed.title,
        executionMode: seed.executionMode,
        starterCode: seed.starterCode,
        visibleTestCases: seed.visibleTestCases,
        hiddenTestCases: seed.hiddenTestCases,
        judgeConfig: seed.judgeConfig,
      },
    ],
  })) as typeof Question.find;

  let bulkWriteCalled = false;
  Question.bulkWrite = (async () => {
    bulkWriteCalled = true;
    return { modifiedCount: 0 } as never;
  }) as typeof Question.bulkWrite;

  const updated = await syncSeedQuestionExecutionMetadata();

  assert.equal(updated, 0);
  assert.equal(bulkWriteCalled, false);
});

test("syncSeedQuestionExecutionMetadata writes updates when execution metadata drifted", async () => {
  const seed = SEED_QUESTIONS.find(
    (entry) => entry.executionMode && entry.executionMode !== "unsupported",
  );
  assert.ok(seed);

  Question.find = (() => ({
    lean: async () => [
      {
        _id: "question-3",
        title: seed.title,
        executionMode:
          seed.executionMode === "python_function"
            ? "python_class"
            : "python_function",
        starterCode: { python: "# stale starter code" },
        visibleTestCases: [],
        hiddenTestCases: [],
        judgeConfig: null,
      },
    ],
  })) as typeof Question.find;

  let capturedOperations: unknown[] = [];
  Question.bulkWrite = (async (operations: unknown[]) => {
    capturedOperations = operations;
    return { modifiedCount: 1 } as never;
  }) as typeof Question.bulkWrite;

  const updated = await syncSeedQuestionExecutionMetadata();

  assert.equal(updated, 1);
  assert.equal(capturedOperations.length, 1);
});
