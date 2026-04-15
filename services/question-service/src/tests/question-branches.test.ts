import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import Question from "../models/Question";

const originalFetch = global.fetch;

let mongoServer: MongoMemoryServer;

const baseQuestion = {
  title: "Roman to Integer",
  difficulty: "Easy",
  categories: ["Arrays"],
  description: "Convert a roman numeral string into an integer value.",
  examples: [{ input: "III", output: "3" }],
  link: "https://leetcode.com/problems/roman-to-integer/",
  executionMode: "python_function",
  starterCode: {
    python: "def romanToInt(s):\n    return 0\n",
  },
  visibleTestCases: [{ id: "visible-1", args: ["III"], expected: 3 }],
  hiddenTestCases: [{ id: "hidden-1", args: ["LVIII"], expected: 58 }],
  judgeConfig: {
    methodName: "romanToInt",
    comparisonMode: "exact_json",
    timeLimitMs: 4000,
    memoryLimitMb: 256,
  },
};

function createAuthFetchMock() {
  return (async (_input: string | URL, init?: RequestInit) => {
    const authHeader = init?.headers
      ? (init.headers as Record<string, string>).Authorization
      : undefined;

    if (authHeader === "Bearer admin-token") {
      return {
        ok: true,
        async json() {
          return { data: { id: "admin-1", role: "admin" } };
        },
      } as Response;
    }

    if (authHeader === "Bearer user-token") {
      return {
        ok: true,
        async json() {
          return { data: { id: "user-1", role: "user" } };
        },
      } as Response;
    }

    return {
      ok: false,
      async json() {
        return { error: "Unauthorized" };
      },
    } as Response;
  }) as typeof fetch;
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
  global.fetch = createAuthFetchMock();
});

test("GET /api/questions returns 401 for an invalid token", async () => {
  const response = await request(app)
    .get("/api/questions")
    .set("Authorization", "Bearer bad-token");

  assert.equal(response.status, 401);
});

test("GET /api/questions returns 502 when the auth service cannot be reached", async () => {
  global.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  const response = await request(app)
    .get("/api/questions")
    .set("Authorization", "Bearer user-token");

  assert.equal(response.status, 502);
});

test("POST /api/questions returns 403 for non-admin users", async () => {
  const response = await request(app)
    .post("/api/questions")
    .set("Authorization", "Bearer user-token")
    .send(baseQuestion);

  assert.equal(response.status, 403);
});

test("POST /api/questions rejects missing required fields", async () => {
  const response = await request(app)
    .post("/api/questions")
    .set("Authorization", "Bearer admin-token")
    .send({
      categories: ["Arrays"],
      description: "Missing title and difficulty",
    });

  assert.equal(response.status, 400);
});

test("POST /api/questions rejects invalid difficulty values", async () => {
  const response = await request(app)
    .post("/api/questions")
    .set("Authorization", "Bearer admin-token")
    .send({
      ...baseQuestion,
      title: "Invalid Difficulty Question",
      difficulty: "Impossible",
    });

  assert.equal(response.status, 400);
});

test("POST /api/questions surfaces mongoose validation errors", async () => {
  const response = await request(app)
    .post("/api/questions")
    .set("Authorization", "Bearer admin-token")
    .send({
      ...baseQuestion,
      title: "Bad Example Shape",
      examples: [{ input: "missing output" }],
    });

  assert.equal(response.status, 400);
});

test("GET /api/questions/:id rejects invalid object ids", async () => {
  const response = await request(app)
    .get("/api/questions/not-a-valid-id")
    .set("Authorization", "Bearer user-token");

  assert.equal(response.status, 400);
});

test("GET /api/questions/:id returns 404 for missing questions", async () => {
  const response = await request(app)
    .get(`/api/questions/${new mongoose.Types.ObjectId().toString()}`)
    .set("Authorization", "Bearer user-token");

  assert.equal(response.status, 404);
});

test("GET /api/questions/:id/judge rejects invalid ids and missing questions", async () => {
  const invalid = await request(app)
    .get("/api/questions/not-a-valid-id/judge")
    .set("x-internal-service-token", "dev-internal-service-token");
  assert.equal(invalid.status, 400);

  const missing = await request(app)
    .get(`/api/questions/${new mongoose.Types.ObjectId().toString()}/judge`)
    .set("x-internal-service-token", "dev-internal-service-token");
  assert.equal(missing.status, 404);
});

test("PATCH /api/questions/:id rejects invalid ids", async () => {
  const response = await request(app)
    .patch("/api/questions/not-a-valid-id")
    .set("Authorization", "Bearer admin-token")
    .send({ title: "Updated title" });

  assert.equal(response.status, 400);
});

test("PATCH /api/questions/:id requires at least one field", async () => {
  const created = await Question.create(baseQuestion);

  const response = await request(app)
    .patch(`/api/questions/${String(created._id)}`)
    .set("Authorization", "Bearer admin-token")
    .send({});

  assert.equal(response.status, 400);
});

test("PATCH /api/questions/:id rejects invalid category updates", async () => {
  const created = await Question.create(baseQuestion);

  const response = await request(app)
    .patch(`/api/questions/${String(created._id)}`)
    .set("Authorization", "Bearer admin-token")
    .send({ categories: ["Made Up"] });

  assert.equal(response.status, 400);
});

test("PATCH /api/questions/:id rejects invalid difficulty and empty category arrays", async () => {
  const created = await Question.create(baseQuestion);

  const invalidDifficulty = await request(app)
    .patch(`/api/questions/${String(created._id)}`)
    .set("Authorization", "Bearer admin-token")
    .send({ difficulty: "Impossible" });
  assert.equal(invalidDifficulty.status, 400);

  const emptyCategories = await request(app)
    .patch(`/api/questions/${String(created._id)}`)
    .set("Authorization", "Bearer admin-token")
    .send({ categories: [] });
  assert.equal(emptyCategories.status, 400);
});

test("PATCH /api/questions/:id returns 404 when the question does not exist", async () => {
  const response = await request(app)
    .patch(`/api/questions/${new mongoose.Types.ObjectId().toString()}`)
    .set("Authorization", "Bearer admin-token")
    .send({ title: "Updated title" });

  assert.equal(response.status, 404);
});

test("DELETE /api/questions/:id rejects invalid ids", async () => {
  const response = await request(app)
    .delete("/api/questions/not-a-valid-id")
    .set("Authorization", "Bearer admin-token");

  assert.equal(response.status, 400);
});

test("POST /api/questions/seed returns 200 when the second sync has no new inserts", async () => {
  const firstResponse = await request(app)
    .post("/api/questions/seed")
    .set("Authorization", "Bearer admin-token");

  assert.ok(firstResponse.status === 200 || firstResponse.status === 201);

  const secondResponse = await request(app)
    .post("/api/questions/seed")
    .set("Authorization", "Bearer admin-token");

  assert.equal(secondResponse.status, 200);
  assert.equal(secondResponse.body.data.inserted, 0);
  assert.ok(typeof secondResponse.body.data.updated === "number");
  assert.match(
    secondResponse.body.data.message,
    /Seed sync complete\. Inserted 0, updated \d+\.|already exist and are up to date/i,
  );
});
