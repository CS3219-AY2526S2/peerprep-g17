import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as ioc, Socket as ClientSocket } from "socket.io-client";
import test from "node:test";
import assert from "node:assert/strict";

test("Socket.io collaboration flow", async (t) => {
  let io: Server, serverSocket: any, clientSocketA: ClientSocket, clientSocketB: ClientSocket;
  const httpServer = createServer();
  io = new Server(httpServer);
  
  await new Promise<void>((resolve) => {
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocketA = ioc(`http://localhost:${port}`);
      clientSocketB = ioc(`http://localhost:${port}`);
      clientSocketA.on("connect", resolve);
    });
  });

  await t.test("Users in the same room receive each other's code changes", async () => {
    const roomId = "session-1";
    const testCode = "console.log('Hello PeerPrep');";
    clientSocketA.emit("join-room", roomId);
    clientSocketB.emit("join-room", roomId);
    const promise = new Promise<string>((resolve) => {
      clientSocketB.on("code-update", (data) => resolve(data.code));
    });
    clientSocketA.emit("code-change", { roomId, code: testCode });
    const receivedCode = await promise;
    assert.equal(receivedCode, testCode);
  });

  test.after(() => {
    io.close();
    clientSocketA.disconnect();
    clientSocketB.disconnect();
  });
});