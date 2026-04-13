import test from "node:test";
import assert from "node:assert/strict";
import { MatchController } from "../controllers/matchController";
import type { AuthRequest } from "../middleware/authMiddleware";

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function createControllerStub() {
  return {
    async createRequest(_userId: string, _authHeader: string, _input: { topic: string; difficulty: "Easy" | "Medium" | "Hard" }) {
      return { matched: false, state: {} };
    },
    async getUserState(_userId: string): Promise<Record<string, unknown> | null> {
      return null;
    },
    async cancelRequest(_userId: string): Promise<boolean> {
      return false;
    },
    async removeActiveSession(_userId: string): Promise<void> {
      return;
    },
    async completeSession(
      sessionId: string,
    ): Promise<{ sessionId: string; status: string; completedAt?: Date } | null> {
      return {
        sessionId,
        status: "completed",
        completedAt: new Date("2026-04-11T00:00:00.000Z"),
      };
    },
  };
}

test("getMyRequestState handles unauthorized, missing, and found states", async () => {
  const stub = createControllerStub();
  stub.getUserState = async (userId: string) =>
    userId === "user-1" ? { status: "searching" } : null;

  const controller = new MatchController(stub as never);

  const unauthorizedRes = createMockResponse();
  await controller.getMyRequestState({} as AuthRequest, unauthorizedRes as never);
  assert.equal(unauthorizedRes.statusCode, 401);

  const missingRes = createMockResponse();
  await controller.getMyRequestState(
    { userId: "missing-user" } as AuthRequest,
    missingRes as never,
  );
  assert.equal(missingRes.statusCode, 404);

  const foundRes = createMockResponse();
  await controller.getMyRequestState(
    { userId: "user-1" } as AuthRequest,
    foundRes as never,
  );
  assert.equal(foundRes.statusCode, 200);
  assert.deepEqual((foundRes.body as { data: { status: string } }).data, {
    status: "searching",
  });
});

test("cancelMyRequest handles unauthorized, missing, and successful cancellation", async () => {
  const stub = createControllerStub();
  stub.cancelRequest = async (userId: string) => userId === "user-1";

  const controller = new MatchController(stub as never);

  const unauthorizedRes = createMockResponse();
  await controller.cancelMyRequest({} as AuthRequest, unauthorizedRes as never);
  assert.equal(unauthorizedRes.statusCode, 401);

  const missingRes = createMockResponse();
  await controller.cancelMyRequest(
    { userId: "missing-user" } as AuthRequest,
    missingRes as never,
  );
  assert.equal(missingRes.statusCode, 404);

  const successRes = createMockResponse();
  await controller.cancelMyRequest(
    { userId: "user-1" } as AuthRequest,
    successRes as never,
  );
  assert.equal(successRes.statusCode, 200);
});

test("completeSession returns 404 for unknown sessions and 200 for completed sessions", async () => {
  const stub = createControllerStub();
  stub.completeSession = async (sessionId: string) =>
    sessionId === "known"
      ? {
          sessionId,
          status: "completed",
          completedAt: new Date("2026-04-11T00:00:00.000Z"),
        }
      : null;

  const controller = new MatchController(stub as never);

  const missingRes = createMockResponse();
  await controller.completeSession(
    { params: { sessionId: "missing" } } as unknown as AuthRequest,
    missingRes as never,
  );
  assert.equal(missingRes.statusCode, 404);

  const successRes = createMockResponse();
  await controller.completeSession(
    { params: { sessionId: "known" } } as unknown as AuthRequest,
    successRes as never,
  );
  assert.equal(successRes.statusCode, 200);
});
