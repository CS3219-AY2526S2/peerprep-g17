import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import CollaborationSession from "../models/CollaborationSession";
import { CollaborationService, ConflictError, ValidationError } from "../services/collaborationService";
import { QuestionServiceClient } from "../services/questionServiceClient";

const originalFetch = global.fetch;

let mongoServer: MongoMemoryServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { ip: "127.0.0.1" },
  });
  await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
  global.fetch = originalFetch;
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

test("QuestionServiceClient maps missing data and upstream failures to errors", async () => {
  const client = new QuestionServiceClient();

  global.fetch = (async () =>
    ({
      ok: false,
      async json() {
        return { error: "question missing" };
      },
    }) as Response) as typeof fetch;

  await assert.rejects(() => client.getQuestion("q-1"), /question missing/i);

  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return {};
      },
    }) as Response) as typeof fetch;

  await assert.rejects(
    () => client.getQuestionJudge("q-1"),
    /failed to fetch question judge metadata/i,
  );
});

test("CollaborationService executeSessionCode rejects oversize code and concurrent executions", async () => {
  await CollaborationSession.create({
    sessionId: "session-lock-test",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  let releaseExecution!: () => void;
  let notifyExecutionStarted!: () => void;
  const executionStarted = new Promise<void>((resolve) => {
    notifyExecutionStarted = resolve;
  });

  const service = new CollaborationService(
    { async completeSession() { return; } } as never,
    {
      async getQuestionJudge() {
        return {
          id: "q-1",
          title: "Two Sum",
          difficulty: "Easy",
          categories: ["Arrays"],
          executionMode: "python_function",
          starterCode: { python: "def solve():\n    pass\n" },
          visibleTestCases: [],
          hiddenTestCases: [],
          judgeConfig: {
            methodName: "solve",
            comparisonMode: "exact_json",
            timeLimitMs: 4000,
            memoryLimitMb: 256,
          },
        };
      },
    } as never,
    {
      async execute() {
        notifyExecutionStarted();
        return new Promise((resolve) => {
          releaseExecution = () =>
            resolve({
              mode: "run",
              executionMode: "python_function",
              verdict: "Accepted",
              status: "finished",
              stdout: "",
              stderr: "",
              runtimeMs: 1,
              memoryKb: 1,
              passedCount: 1,
              totalCount: 1,
              cases: [],
              initiatedByUserId: "user-a",
              initiatedAt: new Date().toISOString(),
            });
        });
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.executeSessionCode("session-lock-test", "user-a", "run", {
        code: "x".repeat(300_000),
      }),
    ValidationError,
  );

  const firstExecution = service.executeSessionCode(
    "session-lock-test",
    "user-a",
    "run",
    {
      code: "print('hello')",
    },
  );

  await executionStarted;

  await assert.rejects(
    () =>
      service.executeSessionCode("session-lock-test", "user-a", "run", {
        code: "print('again')",
      }),
    ConflictError,
  );

  assert.equal(typeof releaseExecution, "function");
  releaseExecution();
  await firstExecution;
});
