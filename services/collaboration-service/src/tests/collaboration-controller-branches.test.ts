import test from "node:test";
import assert from "node:assert/strict";
import type { AuthRequest } from "../middleware/authMiddleware";
import { CollaborationController } from "../controllers/collaborationController";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../services/collaborationService";

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
}

function createSession() {
  return {
    sessionId: "session-1",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
    messages: [],
    createdAt: new Date("2026-04-11T00:00:00.000Z"),
    completedAt: null,
    starterCodeSeededAt: null,
    lastExecutionResult: null,
    lastExecutionAt: null,
    lastSubmittedAt: null,
  };
}

test("explainCode covers missing api key, upstream empty explanation, and thrown errors", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const controller = new CollaborationController({} as never);

  const missingKeyRes = createMockResponse();
  await controller.explainCode(
    { userId: "user-1", body: { code: "print('hi')" } } as AuthRequest,
    missingKeyRes as never,
  );
  assert.equal(missingKeyRes.statusCode, 503);

  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: "   " } }] };
      },
    }) as Response) as typeof fetch;

  const emptyRes = createMockResponse();
  await controller.explainCode(
    { userId: "user-1", body: { code: "print('hi')" } } as AuthRequest,
    emptyRes as never,
  );
  assert.equal(emptyRes.statusCode, 502);

  global.fetch = (async () => {
    throw new Error("openai offline");
  }) as typeof fetch;

  const thrownRes = createMockResponse();
  await controller.explainCode(
    { userId: "user-1", body: { code: "print('hi')" } } as AuthRequest,
    thrownRes as never,
  );
  assert.equal(thrownRes.statusCode, 502);
  assert.match(String((thrownRes.body as { error?: string }).error), /openai offline/i);

  process.env.OPENAI_API_KEY = originalKey;
  global.fetch = originalFetch;
});

test("assistQuestion covers missing api key, invalid mode, upstream empty response, and thrown errors", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const controller = new CollaborationController({} as never);

  const missingKeyRes = createMockResponse();
  await controller.assistQuestion(
    {
      userId: "user-1",
      body: {
        questionTitle: "Two Sum",
        mode: "rephrase",
      },
    } as AuthRequest,
    missingKeyRes as never,
  );
  assert.equal(missingKeyRes.statusCode, 503);

  const invalidModeRes = createMockResponse();
  await controller.assistQuestion(
    {
      userId: "user-1",
      body: {
        questionTitle: "Two Sum",
        mode: "unknown",
      },
    } as AuthRequest,
    invalidModeRes as never,
  );
  assert.equal(invalidModeRes.statusCode, 400);

  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { choices: [{ message: { content: "   " } }] };
      },
    }) as Response) as typeof fetch;

  const emptyRes = createMockResponse();
  await controller.assistQuestion(
    {
      userId: "user-1",
      body: {
        questionTitle: "Two Sum",
        mode: "brainstorm",
      },
    } as AuthRequest,
    emptyRes as never,
  );
  assert.equal(emptyRes.statusCode, 502);

  global.fetch = (async () => {
    throw new Error("openai offline");
  }) as typeof fetch;

  const thrownRes = createMockResponse();
  await controller.assistQuestion(
    {
      userId: "user-1",
      body: {
        questionTitle: "Two Sum",
        mode: "test_case_generation",
      },
    } as AuthRequest,
    thrownRes as never,
  );
  assert.equal(thrownRes.statusCode, 502);
  assert.match(String((thrownRes.body as { error?: string }).error), /openai offline/i);

  process.env.OPENAI_API_KEY = originalKey;
  global.fetch = originalFetch;
});

test("session execution endpoints map not found, validation, and conflict errors", async () => {
  const service = {
    async executeSessionCode(_sessionId: string, _userId: string, mode: "run" | "submit") {
      if (mode === "run") {
        throw new ValidationError("No code provided.");
      }
      throw new ConflictError("Already running.");
    },
  };
  const controller = new CollaborationController(service as never);

  const runRes = createMockResponse();
  await controller.runSessionCode(
    { userId: "user-1", params: { sessionId: "session-1" }, body: {} } as unknown as AuthRequest,
    runRes as never,
  );
  assert.equal(runRes.statusCode, 400);

  const submitRes = createMockResponse();
  await controller.submitSessionCode(
    { userId: "user-1", params: { sessionId: "session-1" }, body: {} } as unknown as AuthRequest,
    submitRes as never,
  );
  assert.equal(submitRes.statusCode, 409);

  const notFoundService = {
    async executeSessionCode() {
      throw new NotFoundError("Session not found.");
    },
  };
  const notFoundController = new CollaborationController(notFoundService as never);
  const notFoundRes = createMockResponse();
  await notFoundController.runSessionCode(
    { userId: "user-1", params: { sessionId: "missing" }, body: {} } as unknown as AuthRequest,
    notFoundRes as never,
  );
  assert.equal(notFoundRes.statusCode, 404);
});

test("switchSessionQuestion and history cover mapped service failures", async () => {
  const controller = new CollaborationController({
    async switchSessionQuestion() {
      throw new ValidationError("A questionId is required.");
    },
    async getAttemptHistory() {
      throw new Error("db down");
    },
  } as never);

  const switchRes = createMockResponse();
  await controller.switchSessionQuestion(
    { userId: "user-1", params: { sessionId: "session-1" }, body: {} } as unknown as AuthRequest,
    switchRes as never,
  );
  assert.equal(switchRes.statusCode, 400);

  const historyRes = createMockResponse();
  await controller.getAttemptHistory(
    { userId: "user-1" } as AuthRequest,
    historyRes as never,
  );
  assert.equal(historyRes.statusCode, 500);
});

test("getSession and terminateSession cover unauthorized, missing, and thrown failures", async () => {
  const service = {
    async getSessionForUser(sessionId: string) {
      return sessionId === "session-1" ? createSession() : null;
    },
    async ensureSessionStarterCode() {
      return;
    },
    async terminateSession() {
      throw new Error("cannot terminate");
    },
  };

  const controller = new CollaborationController(service as never);

  const unauthorizedRes = createMockResponse();
  await controller.getSession({} as AuthRequest, unauthorizedRes as never);
  assert.equal(unauthorizedRes.statusCode, 401);

  const missingRes = createMockResponse();
  await controller.getSession(
    { userId: "user-1", params: { sessionId: "missing" } } as unknown as AuthRequest,
    missingRes as never,
  );
  assert.equal(missingRes.statusCode, 404);

  const terminateRes = createMockResponse();
  await controller.terminateSession(
    { userId: "user-1", params: { sessionId: "session-1" } } as unknown as AuthRequest,
    terminateRes as never,
  );
  assert.equal(terminateRes.statusCode, 500);
});
