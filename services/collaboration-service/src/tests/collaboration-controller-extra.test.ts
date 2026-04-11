import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app";
import { CollaborationController } from "../controllers/collaborationController";
import CollaborationSession from "../models/CollaborationSession";
import Attempt from "../models/Attempt";
import { CollaborationService } from "../services/collaborationService";
import { config } from "../config";

let mongoServer: MongoMemoryServer;

const originalFetch = global.fetch;

function tokenFor(userId: string): string {
  return jwt.sign({ id: userId }, config.jwtSecret);
}

function createFetchMock() {
  return (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/questions/q-1/judge")) {
      return {
        ok: true,
        async json() {
          return {
            data: {
              id: "q-1",
              title: "Roman to Integer",
              difficulty: "Easy",
              categories: ["Arrays"],
              executionMode: "python_function",
              starterCode: {
                python: "def romanToInt(s):\n    return 0\n",
              },
              visibleTestCases: [
                { id: "visible-1", args: ["III"], expected: 3 },
              ],
              hiddenTestCases: [
                { id: "hidden-1", args: ["LVIII"], expected: 58 },
              ],
              judgeConfig: {
                methodName: "romanToInt",
                comparisonMode: "exact_json",
                timeLimitMs: 4000,
                memoryLimitMb: 256,
              },
            },
          };
        },
      } as Response;
    }

    if (url.includes("/api/questions/q-2")) {
      return {
        ok: true,
        async json() {
          return {
            data: {
              id: "q-2",
              title: "Two Sum",
              difficulty: "Easy",
              categories: ["Hash Table"],
              executionMode: "python_function",
              starterCode: { python: "def twoSum(nums, target):\n    return []\n" },
              visibleTestCases: [
                { id: "visible-2", args: [[2, 7, 11, 15], 9], expected: [0, 1] },
              ],
              hiddenTestCases: [],
              judgeConfig: {
                methodName: "twoSum",
                comparisonMode: "exact_json",
                timeLimitMs: 4000,
                memoryLimitMb: 256,
              },
            },
          };
        },
      } as Response;
    }

    if (url.includes("/api/questions/q-2/judge")) {
      return {
        ok: true,
        async json() {
          return {
            data: {
              id: "q-2",
              title: "Two Sum",
              difficulty: "Easy",
              categories: ["Hash Table"],
              executionMode: "python_function",
              starterCode: { python: "def twoSum(nums, target):\n    return []\n" },
              visibleTestCases: [
                { id: "visible-2", args: [[2, 7, 11, 15], 9], expected: [0, 1] },
              ],
              hiddenTestCases: [],
              judgeConfig: {
                methodName: "twoSum",
                comparisonMode: "exact_json",
                timeLimitMs: 4000,
                memoryLimitMb: 256,
              },
            },
          };
        },
      } as Response;
    }

    if (url.includes("/api/v2/execute")) {
      return {
        ok: true,
        async json() {
          return {
            run: {
              stdout: "",
              stderr: "",
              code: 0,
            },
          };
        },
      } as Response;
    }

    if (url.includes("/api/matches/sessions/")) {
      return {
        ok: true,
        async json() {
          return { data: { status: "completed" } };
        },
      } as Response;
    }

    if (url.includes("/api/openai")) {
      throw new Error("Unexpected OpenAI call");
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;
}

function createTestApp() {
  const service = new CollaborationService({
    async completeSession(): Promise<void> {
      return;
    },
  } as never);

  return createApp(new CollaborationController(service));
}

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
  global.fetch = createFetchMock();
});

test("GET /api/sessions/history requires authentication", async () => {
  const app = createTestApp();
  const response = await request(app).get("/api/sessions/history");
  assert.equal(response.status, 401);
});

test("GET /api/sessions/:sessionId seeds starter code and returns shared session data", async () => {
  const app = createTestApp();
  await CollaborationSession.create({
    sessionId: "session-seeded",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const response = await request(app)
    .get("/api/sessions/session-seeded")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`);

  assert.equal(response.status, 200);
  assert.match(response.body.data.sharedCode, /romanToInt/);
});

test("PATCH /api/sessions/:sessionId/question switches the active question", async () => {
  const app = createTestApp();
  await CollaborationSession.create({
    sessionId: "session-switch",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const response = await request(app)
    .patch("/api/sessions/session-switch/question")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({ questionId: "q-2" });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.questionId, "q-2");
  assert.equal(response.body.data.topic, "Hash Table");
});

test("POST /api/sessions/:sessionId/run returns execution results", async () => {
  const app = createTestApp();
  await CollaborationSession.create({
    sessionId: "session-run",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const response = await request(app)
    .post("/api/sessions/session-run/run")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({ code: "print('hello')" });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.mode, "run");
});

test("POST /api/sessions/:sessionId/submit creates a submit attempt", async () => {
  const app = createTestApp();
  await CollaborationSession.create({
    sessionId: "session-submit",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const response = await request(app)
    .post("/api/sessions/session-submit/submit")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({ code: "print('submitted')" });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.mode, "submit");

  const attempts = await Attempt.find({ sessionId: "session-submit", mode: "submit" });
  assert.equal(attempts.length, 1);
});

test("POST /api/sessions/handoff rejects missing fields", async () => {
  const app = createTestApp();
  const response = await request(app)
    .post("/api/sessions/handoff")
    .set("x-internal-service-token", "dev-internal-service-token")
    .send({
      sessionId: "missing-fields",
      userAId: "user-a",
    });

  assert.equal(response.status, 400);
});
