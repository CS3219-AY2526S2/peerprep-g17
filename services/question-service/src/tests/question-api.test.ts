import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import Question from "../models/Question";

const originalFetch = global.fetch;

let mongoServer: MongoMemoryServer;

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

test("GET /api/questions requires authentication", async () => {
  const response = await request(app).get("/api/questions");
  assert.equal(response.status, 401);
});

test("GET /api/questions returns sorted questions and filtered metadata", async () => {
  await Question.create([
    {
      ...baseQuestion,
      title: "Two Sum",
      difficulty: "Easy",
      categories: ["Arrays", "Hash Table"],
    },
    {
      ...baseQuestion,
      title: "Median of Two Sorted Arrays",
      difficulty: "Hard",
      categories: ["Binary Search"],
    },
    {
      ...baseQuestion,
      title: "Longest Increasing Subsequence",
      difficulty: "Medium",
      categories: ["Dynamic Programming"],
      executionMode: "python_class",
    },
  ]);

  const response = await request(app)
    .get("/api/questions?executionModes=python_function")
    .set("Authorization", "Bearer user-token");

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.data.map((question: { title: string }) => question.title),
    ["Two Sum", "Median of Two Sorted Arrays"],
  );
  assert.deepEqual(response.body.meta.categories, ["Arrays", "Binary Search", "Hash Table"]);
});

test("POST /api/questions creates a question for admins", async () => {
  const response = await request(app)
    .post("/api/questions")
    .set("Authorization", "Bearer admin-token")
    .send(baseQuestion);

  assert.equal(response.status, 201);
  assert.equal(response.body.data.title, "Roman to Integer");
});

test("POST /api/questions rejects invalid categories", async () => {
  const response = await request(app)
    .post("/api/questions")
    .set("Authorization", "Bearer admin-token")
    .send({
      ...baseQuestion,
      title: "Invalid Category Question",
      categories: ["Made Up"],
    });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /invalid categories/i);
});

test("GET /api/questions/:id/judge enforces the internal token and returns hidden testcases", async () => {
  const createdQuestion = await Question.create(baseQuestion);

  const unauthorized = await request(app)
    .get(`/api/questions/${String(createdQuestion._id)}/judge`);
  assert.equal(unauthorized.status, 401);

  const authorized = await request(app)
    .get(`/api/questions/${String(createdQuestion._id)}/judge`)
    .set("x-internal-service-token", "dev-internal-service-token");

  assert.equal(authorized.status, 200);
  assert.equal(authorized.body.data.hiddenTestCases.length, 1);
});

test("PATCH /api/questions/:id rejects duplicate titles", async () => {
  const existingQuestion = await Question.create(baseQuestion);
  const toUpdate = await Question.create({
    ...baseQuestion,
    title: "Another Question",
  });

  const response = await request(app)
    .patch(`/api/questions/${String(toUpdate._id)}`)
    .set("Authorization", "Bearer admin-token")
    .send({ title: existingQuestion.title });

  assert.equal(response.status, 409);
});

test("DELETE /api/questions/:id returns 404 when the question is missing", async () => {
  const response = await request(app)
    .delete(`/api/questions/${new mongoose.Types.ObjectId().toString()}`)
    .set("Authorization", "Bearer admin-token");

  assert.equal(response.status, 404);
});
