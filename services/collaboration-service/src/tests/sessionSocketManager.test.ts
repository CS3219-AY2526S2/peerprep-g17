import test from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { SessionSocketManager } from "../services/sessionSocketManager";

class FakeSocket {
  public readyState = WebSocket.OPEN;
  public sent: string[] = [];
  public closedWith: Array<number | string> = [];

  send(message: string): void {
    this.sent.push(message);
  }

  close(code?: number, reason?: string): void {
    if (code !== undefined) {
      this.closedWith.push(code);
    }
    if (reason !== undefined) {
      this.closedWith.push(reason);
    }
  }
}

test("acknowledging the warning cancels the active countdown for the session", () => {
  const manager = new SessionSocketManager();
  const socketA = new FakeSocket();
  const socketB = new FakeSocket();

  manager.join("session-1", "chat:user-a", socketA as unknown as WebSocket, "User A");
  manager.join("session-1", "chat:user-b", socketB as unknown as WebSocket, "User B");

  const room = (manager as any).rooms.get("session-1");
  assert.ok(room);

  room.warningActive = true;
  room.terminationTimer = setTimeout(() => undefined, 1000);

  manager.acknowledgeWarning("session-1");

  assert.equal(room.warningActive, false);
  const lastMessage = JSON.parse(socketA.sent.at(-1) || "{}");
  assert.equal(lastMessage.type, "session_warning");
  assert.equal(lastMessage.payload.cancelled, true);

  (manager as any).cleanupRoom("session-1");
  manager.reset();
});

test("regular activity does not reset the timer after the warning is already active", () => {
  const manager = new SessionSocketManager();
  const socketA = new FakeSocket();
  const socketB = new FakeSocket();

  manager.join("session-2", "chat:user-a", socketA as unknown as WebSocket, "User A");
  manager.join("session-2", "chat:user-b", socketB as unknown as WebSocket, "User B");

  const room = (manager as any).rooms.get("session-2");
  assert.ok(room);

  room.warningActive = true;
  room.lastActivityAt = 123;

  manager.recordActivity("session-2");

  assert.equal(room.lastActivityAt, 123);

  (manager as any).cleanupRoom("session-2");
  manager.reset();
});

test("leave broadcasts disconnect reasons and peer helpers reflect current connections", () => {
  const manager = new SessionSocketManager();
  const socketA = new FakeSocket();
  const socketB = new FakeSocket();

  manager.join("session-3", "chat:user-a", socketA as unknown as WebSocket, "User A");
  manager.join("session-3", "chat:user-b", socketB as unknown as WebSocket, "User B");

  assert.equal(manager.isUserConnected("session-3", "chat:user-a"), true);
  assert.deepEqual(manager.getConnectedPeerIds("session-3", "chat:user-a"), ["user-b"]);

  manager.leave("session-3", "chat:user-b", true);

  const lastMessage = JSON.parse(socketA.sent.at(-1) || "{}");
  assert.equal(lastMessage.type, "peer_status_change");
  assert.equal(lastMessage.payload.reason, "manual");

  (manager as any).cleanupRoom("session-3");
  manager.reset();
});

test("joining a terminated session forces a termination notification", async () => {
  const manager = new SessionSocketManager();
  const socket = new FakeSocket();

  (manager as any).terminatedSessions.add("session-terminated");
  manager.join(
    "session-terminated",
    "chat:user-a",
    socket as unknown as WebSocket,
    "User A",
  );

  const firstMessage = JSON.parse(socket.sent[0] || "{}");
  assert.equal(firstMessage.type, "session_terminated");

  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(socket.closedWith.includes(4000), true);

  manager.reset();
});
