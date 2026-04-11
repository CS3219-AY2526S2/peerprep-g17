import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  buildFilterQuery,
  findInvalidCategories,
  formatQuestionJudgeResponse,
  formatQuestionResponse,
  isValidDifficulty,
  isValidObjectId,
} from "../utils/questionHelpers";

test("query helpers build the expected filters", () => {
  const filter = buildFilterQuery({
    difficulty: "Easy",
    categories: "Arrays, Hash Table",
    search: "two sum",
    executionModes: "python_function,unsupported,not-real",
  });

  assert.deepEqual(filter, {
    difficulty: "Easy",
    categories: { $all: ["Arrays", "Hash Table"] },
    title: { $regex: "two sum", $options: "i" },
    executionMode: { $in: ["python_function", "unsupported"] },
  });
});

test("validation helpers recognize invalid categories, difficulty, and ids", () => {
  assert.deepEqual(findInvalidCategories(["Arrays", "Unknown"]), ["Unknown"]);
  assert.equal(isValidDifficulty("Medium"), true);
  assert.equal(isValidDifficulty("Impossible"), false);
  assert.equal(isValidObjectId(new mongoose.Types.ObjectId().toString()), true);
  assert.equal(isValidObjectId("not-an-id"), false);
});

test("format helpers expose API-safe question shapes", () => {
  const id = new mongoose.Types.ObjectId();
  const now = new Date("2026-04-11T00:00:00.000Z");

  const formatted = formatQuestionResponse({
    _id: id,
    title: "Two Sum",
    difficulty: "Easy",
    categories: ["Arrays", "Hash Table"],
    description: "Find two values that sum to a target.",
    examples: [{ input: "[2,7,11,15]", output: "[0,1]" }],
    link: "https://leetcode.com/problems/two-sum/",
    executionMode: "python_function",
    starterCode: { python: "def twoSum(nums, target):\n    pass\n" },
    visibleTestCases: [{ id: "visible-1", args: [[2, 7, 11, 15], 9], expected: [0, 1] }],
    judgeConfig: null,
    createdAt: now,
    updatedAt: now,
  });

  const judgeFormatted = formatQuestionJudgeResponse({
    ...formatted,
    hiddenTestCases: [{ id: "hidden-1", args: [[3, 2, 4], 6], expected: [1, 2] }],
  });

  assert.equal(formatted.id, String(id));
  assert.equal(judgeFormatted.hiddenTestCases.length, 1);
});
