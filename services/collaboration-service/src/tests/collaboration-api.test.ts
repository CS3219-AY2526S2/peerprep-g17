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

const originalFetch = global.fetch;

let mongoServer: MongoMemoryServer;

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

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;
}

function tokenFor(userId: string): string {
  return jwt.sign({ id: userId }, config.jwtSecret);
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

test("POST /api/sessions/handoff rejects invalid difficulty", async () => {
  const app = createTestApp();

  const res = await request(app)
    .post("/api/sessions/handoff")
    .set("x-internal-service-token", "dev-internal-service-token")
    .send({
      sessionId: "session-invalid-difficulty",
      userAId: "user-a",
      userBId: "user-b",
      topic: "Arrays",
      difficulty: "Impossible",
      questionId: "q-1",
      language: "Python",
    });

  assert.equal(res.status, 400);
});

test("POST /api/sessions/handoff rejects invalid language", async () => {
  const app = createTestApp();

  const res = await request(app)
    .post("/api/sessions/handoff")
    .set("x-internal-service-token", "dev-internal-service-token")
    .send({
      sessionId: "session-invalid-language",
      userAId: "user-a",
      userBId: "user-b",
      topic: "Arrays",
      difficulty: "Easy",
      questionId: "q-1",
      language: "Java",
    });

  assert.equal(res.status, 400);
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
    .set("Authorization", `Bearer ${tokenFor("user-a")}`);

  assert.equal(res.status, 200);

  const forbidden = await request(app)
    .get("/api/sessions/session-1")
    .set("Authorization", `Bearer ${tokenFor("stranger")}`);

  assert.equal(forbidden.status, 404);
});

test("GET /api/sessions/:sessionId returns 404 for a missing session", async () => {
  const app = createTestApp();

  const res = await request(app)
    .get("/api/sessions/missing-session")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`);

  assert.equal(res.status, 404);
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
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({});

  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, "completed");

  const stored = await CollaborationSession.findOne({ sessionId: "session-1" });
  assert.ok(stored);
  assert.equal(stored.status, "completed");
});

test("POST /api/sessions/:sessionId/complete returns 404 for a non-participant", async () => {
  const app = createTestApp();

  await CollaborationSession.create({
    sessionId: "session-404",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const res = await request(app)
    .post("/api/sessions/session-404/complete")
    .set("Authorization", `Bearer ${tokenFor("stranger")}`)
    .send({ code: "print('nope')" });

  assert.equal(res.status, 404);
});

test("POST /api/sessions/:sessionId/complete saves an attempt only for the submitting user", async () => {
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
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({ code: "print('saved by user a')" });

  assert.equal(res.status, 200);

  const attempts = await Attempt.find({ sessionId: "session-1" }).sort({ userId: 1 });
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0]?.userId, "user-a");
  assert.equal(attempts[0]?.code, "print('saved by user a')");
});

test("DELETE /api/sessions/:sessionId ends the session without creating an attempt", async () => {
  const app = createTestApp();

  await CollaborationSession.create({
    sessionId: "session-2",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const res = await request(app)
    .delete("/api/sessions/session-2")
    .set("Authorization", `Bearer ${tokenFor("user-b")}`)
    .send({ code: "print('should not be saved')" });

  assert.equal(res.status, 200);

  const stored = await CollaborationSession.findOne({ sessionId: "session-2" });
  assert.ok(stored);
  assert.equal(stored.status, "completed");

  const attempts = await Attempt.find({ sessionId: "session-2" });
  assert.equal(attempts.length, 0);
});

test("GET /api/sessions/history only returns attempts for the authenticated user", async () => {
  const app = createTestApp();

  await Attempt.create([
    {
      userId: "user-a",
      sessionId: "session-a",
      questionId: "q-1",
      topic: "Arrays",
      difficulty: "Easy",
      language: "Python",
      code: "print('a')",
      attemptedAt: new Date("2026-04-01T00:00:00.000Z"),
    },
    {
      userId: "user-b",
      sessionId: "session-b",
      questionId: "q-2",
      topic: "Graphs",
      difficulty: "Medium",
      language: "Python",
      code: "print('b')",
      attemptedAt: new Date("2026-04-02T00:00:00.000Z"),
    },
  ]);

  const res = await request(app)
    .get("/api/sessions/history")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].userId, "user-a");
  assert.equal(res.body.data[0].sessionId, "session-a");
});

test("POST /api/sessions/execute requires authentication", async () => {
  const app = createTestApp();

  const res = await request(app)
    .post("/api/sessions/execute")
    .send({ code: "print('hi')" });

  assert.equal(res.status, 401);
});

test("POST /api/sessions/execute rejects an empty code payload", async () => {
  const app = createTestApp();

  const res = await request(app)
    .post("/api/sessions/execute")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({ code: "   " });

  assert.equal(res.status, 400);
});

test("POST /api/sessions/execute returns runtime output from piston", async () => {
  const app = createTestApp();
  global.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/users/me")) {
      return createFetchMock()(input, init);
    }

    if (url.includes("/api/v2/execute")) {
      return {
        ok: true,
        async json() {
          return { run: { stdout: "hello\n", stderr: "" } };
        },
      } as Response;
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;

  const res = await request(app)
    .post("/api/sessions/execute")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({ code: "print('hello')" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.run.stdout, "hello\n");
});

test("POST /api/sessions/execute maps piston failures to 502", async () => {
  const app = createTestApp();
  global.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/users/me")) {
      return createFetchMock()(input, init);
    }

    if (url.includes("/api/v2/execute")) {
      return {
        ok: false,
        async json() {
          return { error: "piston unavailable" };
        },
      } as Response;
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;

  const res = await request(app)
    .post("/api/sessions/execute")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({ code: "print('hello')" });

  assert.equal(res.status, 502);
});

test("POST /api/sessions/explain returns an AI explanation", async () => {
  const app = createTestApp();

  const res = await request(app)
    .post("/api/sessions/explain")
    .set("Authorization", `Bearer ${tokenFor("user-a")}`)
    .send({ code: "print('hello')" });

  assert.equal(res.status, 200);
  assert.match(res.body.data.explanation, /Summary/);
});
