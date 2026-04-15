import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import http from "node:http";
import { WebSocketGateway } from "../services/websocketGateway";

class FakeEventBus {
  async subscribe(
    _listener: (payload: { userId: string; event: unknown }) => void,
  ): Promise<void> {}
}

class FakeMatchService {
  public disconnectedUsers: string[] = [];

  async markUserDisconnected(userId: string): Promise<void> {
    this.disconnectedUsers.push(userId);
  }
}

class FakeSocket extends EventEmitter {}

test("closing the last websocket connection does not cancel the user's queued request", () => {
  const server = http.createServer();
  const matchService = new FakeMatchService();
  const gateway = new WebSocketGateway(
    server,
    new FakeEventBus() as unknown as never,
    matchService as unknown as never,
  );
  const socket = new FakeSocket();

  (gateway as any).registerConnection("user-a", socket);
  socket.emit("close");

  assert.deepEqual(matchService.disconnectedUsers, ["user-a"]);
  server.close();
});

test("closing one of multiple websocket connections does not notify disconnect", () => {
  const server = http.createServer();
  const matchService = new FakeMatchService();
  const gateway = new WebSocketGateway(
    server,
    new FakeEventBus() as unknown as never,
    matchService as unknown as never,
  );
  const socketA = new FakeSocket();
  const socketB = new FakeSocket();

  (gateway as any).registerConnection("user-a", socketA);
  (gateway as any).registerConnection("user-a", socketB);
  socketA.emit("close");

  assert.deepEqual(matchService.disconnectedUsers, []);
  server.close();
});
