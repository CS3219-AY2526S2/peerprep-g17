import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as ioc, Socket as ClientSocket } from "socket.io-client";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

interface CodeUpdatePayload {
  code: string;
}

import { CollaborationService } from "../services/collaborationService";
import { CollaborationController } from "../controllers/collaborationController";
import { createApp } from "../app";

function createTestApp() {
  const service = new CollaborationService({
    async completeSession(sessionId: string): Promise<void> {
      await fetch(`http://matching-service/api/matches/sessions/${sessionId}/complete`, {
        method: "PATCH",
        headers: { "x-internal-service-token": "dev-internal-service-token" },
      });
    },
  } as any); 

  return createApp(new CollaborationController(service));
}

test("Socket.io collaboration flow", async (t) => {
  let io: Server;
  let clientSocketA: ClientSocket;
  let clientSocketB: ClientSocket;
  const httpServer = createServer();
  io = new Server(httpServer);
  await new Promise<void>((resolve) => {
    httpServer.listen(() => {
      const address = httpServer.address();
      const port = typeof address === "string" ? 0 : address?.port;
      clientSocketA = ioc(`http://localhost:${port}`);
      clientSocketB = ioc(`http://localhost:${port}`);
      clientSocketA.on("connect", () => resolve());
    });
  });

  await t.test("Users in the same room receive each other's code changes", async () => {
    const roomId = "session-1";
    const testCode = "console.log('Hello PeerPrep');";
    clientSocketA.emit("join-room", roomId);
    clientSocketB.emit("join-room", roomId);
    const promise = new Promise<string>((resolve) => {
      clientSocketB.on("code-update", (data: CodeUpdatePayload) => {
        resolve(data.code); 
      });
    });
    clientSocketA.emit("code-change", { roomId, code: testCode });
    const receivedCode = await promise;
    assert.equal(receivedCode, testCode);
  });

  await t.test("Users should NOT receive code changes for rooms they have yet to joined", async () => {
    const authorizedRoom = "session-1";
    const unauthorizedRoom = "session-99"; 
    const secretCode = "console.log('Private Data');";
    clientSocketA.emit("join-room", unauthorizedRoom);
    let receivedUnauthorizedData = false;
    clientSocketB.on("code-update", () => {
      receivedUnauthorizedData = true;
    });
    clientSocketA.emit("code-change", { roomId: unauthorizedRoom, code: secretCode });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.strictEqual(receivedUnauthorizedData, false, "Client B should not have received data from an unjoined room");
  });


  test("Handoff should fail gracefully when Matching Service is down", async () => {
  global.fetch = (async () => ({
    ok: false,
    status: 500,
    async json() { return { error: "Internal Server Error" }; }
  }) as Response) as typeof fetch;

  const app = createTestApp();
  const res = await request(app)
    .post("/api/sessions/handoff")
    .set("x-internal-service-token", "dev-internal-service-token")
    .send({
      sessionId: "fail-session",
      userAId: "user-a",
      userBId: "user-b",
      topic: "Arrays",
      difficulty: "Easy",
      questionId: "q-1",
      language: "Python",
    });
  assert.equal(res.status, 500);
});

  test.after(() => {
    io.close();
    clientSocketA.disconnect();
    clientSocketB.disconnect();
    httpServer.close();
  });
});


