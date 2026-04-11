import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app";
import { MatchController } from "../controllers/matchController";
import { resolveUserFromAuthHeader } from "../middleware/authMiddleware";

type MatchServiceStub = {
  createRequest: MatchController["createRequest"] extends (...args: never[]) => never
    ? never
    : (userId: string, authHeader: string, input: { topic: string; difficulty: "Easy" | "Medium" | "Hard" }) => Promise<{ matched: boolean; state: Record<string, unknown> }>;
  getUserState: (userId: string) => Promise<Record<string, unknown> | null>;
  cancelRequest: (userId: string) => Promise<boolean>;
  removeActiveSession: (userId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<{ sessionId: string; status: string; completedAt?: Date } | null>;
};

function createMatchServiceStub(): MatchServiceStub {
  return {
    async createRequest(_userId, _authHeader, input) {
      return {
        matched: false,
        state: {
          status: "searching",
          requestId: "request-branch",
          topic: input.topic,
          difficulty: input.difficulty,
          remainingMs: 1000,
        },
      };
    },
    async getUserState() {
      return null;
    },
    async cancelRequest() {
      return false;
    },
    async removeActiveSession() {
      return;
    },
    async completeSession(sessionId) {
      return { sessionId, status: "completed", completedAt: new Date() };
    },
  };
}

const originalFetch = global.fetch;

test.after(() => {
  global.fetch = originalFetch;
});

test("resolveUserFromAuthHeader covers malformed, unauthorized, and invalid-payload responses", async () => {
  assert.equal(await resolveUserFromAuthHeader(undefined), null);
  assert.equal(await resolveUserFromAuthHeader("Basic nope"), null);

  global.fetch = (async () =>
    ({
      ok: false,
      async json() {
        return {};
      },
    }) as Response) as typeof fetch;
  assert.equal(await resolveUserFromAuthHeader("Bearer bad"), null);

  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { data: {} };
      },
    }) as Response) as typeof fetch;
  assert.equal(await resolveUserFromAuthHeader("Bearer missing-id"), null);
});

test("POST /api/matches/requests returns 400 when topic or difficulty is missing", async () => {
  const app = createApp(
    new MatchController(createMatchServiceStub() as unknown as never),
  );

  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { data: { id: "user-1" } };
      },
    }) as Response) as typeof fetch;

  const response = await request(app)
    .post("/api/matches/requests")
    .set("Authorization", "Bearer valid-token")
    .send({ topic: "Arrays" });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /topic and difficulty are required/i);
});

test("POST /api/matches/requests maps unexpected service failures to 502", async () => {
  const stub = createMatchServiceStub();
  stub.createRequest = async () => {
    throw new Error("upstream boom");
  };

  const app = createApp(new MatchController(stub as unknown as never));
  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { data: { id: "user-1" } };
      },
    }) as Response) as typeof fetch;

  const response = await request(app)
    .post("/api/matches/requests")
    .set("Authorization", "Bearer valid-token")
    .send({ topic: "Arrays", difficulty: "Easy" });

  assert.equal(response.status, 502);
});

test("DELETE /api/matches/requests/me/session maps clear-state failures to 500", async () => {
  const stub = createMatchServiceStub();
  stub.removeActiveSession = async () => {
    throw new Error("cannot clear");
  };

  const app = createApp(new MatchController(stub as unknown as never));
  global.fetch = (async () =>
    ({
      ok: true,
      async json() {
        return { data: { id: "user-1" } };
      },
    }) as Response) as typeof fetch;

  const response = await request(app)
    .delete("/api/matches/requests/me/session")
    .set("Authorization", "Bearer valid-token");

  assert.equal(response.status, 500);
  assert.equal(response.body.error, "Failed to clear match state.");
});
