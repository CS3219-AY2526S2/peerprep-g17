import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app";
import { CollaborationController } from "../controllers/collaborationController";
import CollaborationSession from "../models/CollaborationSession";
import { CollaborationService } from "../services/collaborationService";

const originalFetch = global.fetch;

let mongoServer: MongoMemoryServer;
const RESULT_START_MARKER = "__PEERPREP_EXECUTION_RESULT_START__";
const RESULT_END_MARKER = "__PEERPREP_EXECUTION_RESULT_END__";

function createFetchMock() {
  return (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "https://api.openai.com/v1/chat/completions") {
      const authHeader = init?.headers
        ? (init.headers as Record<string, string>).Authorization
        : undefined;

      if (authHeader === "Bearer test-openai-key") {
        return {
          ok: true,
          async json() {
            return {
              choices: [
                {
                  message: {
                    content: "## Summary\n\n- This code prints `hello`.",
                  },
                },
              ],
            };
          },
        } as Response;
      }

      return {
        ok: false,
        async json() {
          return { error: { message: "Invalid API key." } };
        },
      } as Response;
    }

    if (url.includes("/api/users/me")) {
      const authHeader = init?.headers
        ? (init.headers as Record<string, string>).Authorization
        : undefined;

      if (authHeader === "Bearer user-a-token") {
        return {
          ok: true,
          async json() {
            return { data: { id: "user-a" } };
          },
        } as Response;
      }

      if (authHeader === "Bearer user-b-token") {
        return {
          ok: true,
          async json() {
            return { data: { id: "user-b" } };
          },
        } as Response;
      }

      return {
        ok: false,
        async json() {
          return { error: "Unauthorized" };
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

    if (url.includes("/api/questions/q-1/judge")) {
      return {
        ok: true,
        async json() {
          return {
            data: {
              id: "q-1",
              title: "Roman to Integer",
              executionMode: "python_function",
              starterCode: {
                python: "class Solution:\n    def romanToInt(self, s):\n        return 0",
              },
              visibleTestCases: [
                { id: "visible-1", args: ["III"], expected: 3 },
              ],
              hiddenTestCases: [
                { id: "hidden-1", args: ["LVIII"], expected: 58 },
              ],
              judgeConfig: {
                className: "Solution",
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

    if (url.includes("/api/v2/execute")) {
      return {
        ok: true,
        async json() {
          return {
            run: {
              stdout: [
                RESULT_START_MARKER,
                JSON.stringify({
                  verdict: "Accepted",
                  stdout: "",
                  stderr: "",
                  runtimeMs: 5,
                  memoryKb: 12,
                  passedCount: 1,
                  totalCount: 1,
                  cases: [
                    {
                      id: "visible-1",
                      verdict: "Accepted",
                      inputPreview: '["III"]',
                      expectedPreview: "3",
                      actualPreview: "3",
                      stdout: "",
                      stderr: "",
                      errorMessage: "",
                    },
                  ],
                }),
                RESULT_END_MARKER,
              ].join("\n"),
              stderr: "",
              output: "",
              code: 0,
            },
          };
        },
      } as Response;
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;
}

function createTestApp() {
  const service = new CollaborationService({
    async completeSession(sessionId: string): Promise<void> {
      const response = await fetch(
        `http://matching-service/api/matches/sessions/${sessionId}/complete`,
        {
          method: "PATCH",
          headers: { "x-internal-service-token": "dev-internal-service-token" },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to notify Matching Service about completion.");
      }
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
  process.env.OPENAI_API_KEY = "test-openai-key";
});

test("GET /health returns ok", async () => {
  const app = createTestApp();
  const res = await request(app).get("/health");

  assert.equal(res.status, 200);
});

test("POST /api/sessions/handoff rejects invalid internal token", async () => {
  const app = createTestApp();

  const res = await request(app)
    .post("/api/sessions/handoff")
    .send({
      sessionId: "session-1",
      userAId: "user-a",
      userBId: "user-b",
      topic: "Arrays",
      difficulty: "Easy",
      questionId: "q-1",
      language: "Python",
    });

  assert.equal(res.status, 401);
});

test("POST /api/sessions/handoff persists a collaboration session", async () => {
  const app = createTestApp();

  const res = await request(app)
    .post("/api/sessions/handoff")
    .set("x-internal-service-token", "dev-internal-service-token")
    .send({
      sessionId: "session-1",
      userAId: "user-a",
      userBId: "user-b",
      topic: "Arrays",
      difficulty: "Easy",
      questionId: "q-1",
      language: "Python",
    });

  assert.equal(res.status, 201);

  const stored = await CollaborationSession.findOne({ sessionId: "session-1" });
  assert.ok(stored);
  assert.equal(stored.status, "active");
});

test("GET /api/sessions/:sessionId only returns sessions for participants", async () => {
  const app = createTestApp();

  await CollaborationSession.create({
    sessionId: "session-1",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const res = await request(app)
    .get("/api/sessions/session-1")
    .set("Authorization", "Bearer user-a-token");

  assert.equal(res.status, 200);

  const forbidden = await request(app)
    .get("/api/sessions/session-1")
    .set("Authorization", "Bearer stranger-token");

  assert.equal(forbidden.status, 401);
});

test("POST /api/sessions/:sessionId/complete completes the session", async () => {
  const app = createTestApp();

  await CollaborationSession.create({
    sessionId: "session-1",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const res = await request(app)
    .post("/api/sessions/session-1/complete")
    .set("Authorization", "Bearer user-a-token");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, "completed");

  const stored = await CollaborationSession.findOne({ sessionId: "session-1" });
  assert.ok(stored);
  assert.equal(stored.status, "completed");
});

test("POST /api/sessions/explain returns an AI explanation", async () => {
  const app = createTestApp();

  const res = await request(app)
    .post("/api/sessions/explain")
    .set("Authorization", "Bearer user-a-token")
    .send({ code: "print('hello')" });

  assert.equal(res.status, 200);
  assert.match(res.body.data.explanation, /Summary/);
});
