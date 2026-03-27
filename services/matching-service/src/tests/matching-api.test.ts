import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app";
import { MatchController } from "../controllers/matchController";
import { MatchStateResponse } from "../types";

type MatchServiceStub = {
  createRequest: (
    userId: string,
    authHeader: string,
    input: { topic: string; difficulty: "Easy" | "Medium" | "Hard" },
  ) => Promise<{ matched: boolean; state: MatchStateResponse }>;
  getUserState: (userId: string) => Promise<MatchStateResponse | null>;
  cancelRequest: (userId: string) => Promise<boolean>;
  completeSession: (
    sessionId: string,
  ) => Promise<{ sessionId: string; status: string; completedAt?: Date } | null>;
};

function createMatchServiceStub(): MatchServiceStub {
  return {
    async createRequest(_userId, _authHeader, input) {
      return {
        matched: false,
        state: {
          status: "searching",
          requestId: "request-1",
          topic: input.topic,
          difficulty: input.difficulty,
          remainingMs: 1000,
        },
      };
    },
    async getUserState() {
      return {
        status: "searching",
        requestId: "request-1",
        topic: "Arrays",
        difficulty: "Easy",
        remainingMs: 1000,
      };
    },
    async cancelRequest() {
      return true;
    },
    async completeSession(sessionId) {
      return {
        sessionId,
        status: "completed",
        completedAt: new Date("2026-03-26T00:00:00.000Z"),
      };
    },
  };
}

const originalFetch = global.fetch;

test.after(() => {
  global.fetch = originalFetch;
});

test("GET /health returns ok", async () => {
  const app = createApp(
    new MatchController(createMatchServiceStub() as unknown as never),
  );

  const res = await request(app).get("/health");

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { data: { ok: true } });
});

test("POST /api/matches/requests requires auth", async () => {
  const app = createApp(
    new MatchController(createMatchServiceStub() as unknown as never),
  );

  const res = await request(app)
    .post("/api/matches/requests")
    .send({ topic: "Arrays", difficulty: "Easy" });

  assert.equal(res.status, 401);
});

test("POST /api/matches/requests creates a queued request for an authenticated user", async () => {
  const stub = createMatchServiceStub();
  const app = createApp(new MatchController(stub as unknown as never));
  let capturedAuthHeader = "";
  let capturedUserId = "";

  stub.createRequest = async (userId, authHeader, input) => {
    capturedUserId = userId;
    capturedAuthHeader = authHeader;
    return {
      matched: false,
      state: {
        status: "searching",
        requestId: "request-1",
        topic: input.topic,
        difficulty: input.difficulty,
        remainingMs: 1000,
      },
    };
  };

  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { data: { id: "user-1" } };
      },
    }) as Response) as typeof fetch;

  const res = await request(app)
    .post("/api/matches/requests")
    .set("Authorization", "Bearer valid-token")
    .send({ topic: "Arrays", difficulty: "Easy" });

  assert.equal(res.status, 201);
  assert.equal(capturedUserId, "user-1");
  assert.equal(capturedAuthHeader, "Bearer valid-token");
  assert.equal(res.body.data.status, "searching");
});

test("POST /api/matches/requests maps duplicate-request errors to 409", async () => {
  const stub = createMatchServiceStub();
  stub.createRequest = async () => {
    throw new Error("User already has an active matchmaking request.");
  };

  const app = createApp(new MatchController(stub as unknown as never));
  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { data: { id: "user-1" } };
      },
    }) as Response) as typeof fetch;

  const res = await request(app)
    .post("/api/matches/requests")
    .set("Authorization", "Bearer valid-token")
    .send({ topic: "Arrays", difficulty: "Easy" });

  assert.equal(res.status, 409);
});

test("GET /api/matches/requests/me returns 404 when the user has no active state", async () => {
  const stub = createMatchServiceStub();
  stub.getUserState = async () => null;

  const app = createApp(new MatchController(stub as unknown as never));
  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { data: { id: "user-1" } };
      },
    }) as Response) as typeof fetch;

  const res = await request(app)
    .get("/api/matches/requests/me")
    .set("Authorization", "Bearer valid-token");

  assert.equal(res.status, 404);
});

test("DELETE /api/matches/requests/me cancels the active request", async () => {
  let cancelledUserId = "";
  const stub = createMatchServiceStub();
  stub.cancelRequest = async (userId) => {
    cancelledUserId = userId;
    return true;
  };

  const app = createApp(new MatchController(stub as unknown as never));
  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { data: { id: "user-1" } };
      },
    }) as Response) as typeof fetch;

  const res = await request(app)
    .delete("/api/matches/requests/me")
    .set("Authorization", "Bearer valid-token");

  assert.equal(res.status, 200);
  assert.equal(cancelledUserId, "user-1");
});

test("PATCH /api/matches/sessions/:sessionId/complete requires the internal service token", async () => {
  const app = createApp(
    new MatchController(createMatchServiceStub() as unknown as never),
  );

  const res = await request(app).patch(
    "/api/matches/sessions/session-1/complete",
  );

  assert.equal(res.status, 401);
});

test("PATCH /api/matches/sessions/:sessionId/complete marks the session complete", async () => {
  const stub = createMatchServiceStub();
  let completedSessionId = "";
  stub.completeSession = async (sessionId) => {
    completedSessionId = sessionId;
    return {
      sessionId,
      status: "completed",
      completedAt: new Date("2026-03-26T00:00:00.000Z"),
    };
  };

  const app = createApp(new MatchController(stub as unknown as never));

  const res = await request(app)
    .patch("/api/matches/sessions/session-1/complete")
    .set("x-internal-service-token", "dev-internal-service-token");

  assert.equal(res.status, 200);
  assert.equal(completedSessionId, "session-1");
  assert.equal(res.body.data.status, "completed");
});
