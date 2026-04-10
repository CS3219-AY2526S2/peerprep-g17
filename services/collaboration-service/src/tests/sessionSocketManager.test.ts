import test from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { SessionSocketManager } from "../services/sessionSocketManager";

class FakeSocket {
  public readyState = WebSocket.OPEN;
  public sent: string[] = [];

  send(message: string): void {
    this.sent.push(message);
  }

  close(): void {}
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
});
