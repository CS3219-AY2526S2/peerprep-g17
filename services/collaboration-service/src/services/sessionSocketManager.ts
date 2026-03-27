import { WebSocket } from "ws";

interface ConnectedUser {
  ws: WebSocket;
  userId: string;
  heartbeatTimer?: ReturnType<typeof setTimeout>;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

interface SessionRoom {
  sessionId: string;
  users: Map<string, ConnectedUser>; 
}

export type ClientMessageType =
  | "ping"
  | "chat_message";

export type ServerEventType =
  | "session_state"
  | "user_joined"
  | "user_left"
  | "user_reconnected"
  | "pong"
  | "chat_message"
  | "error";

export interface ServerMessage {
  type: ServerEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const DISCONNECT_GRACE_MS = 30_000;   

export class SessionSocketManager {
  private rooms = new Map<string, SessionRoom>();


  join(sessionId: string, userId: string, ws: WebSocket): void {
    if (!this.rooms.has(sessionId)) {
      this.rooms.set(sessionId, { sessionId, users: new Map() });
    }

    const room = this.rooms.get(sessionId)!;
    const wasAlreadyConnected = room.users.has(userId);

    const existing = room.users.get(userId);
    if (existing) {
      clearTimeout(existing.heartbeatTimer);
      clearTimeout(existing.disconnectTimer);
      existing.ws.terminate();
    }

    const connectedUser: ConnectedUser = { ws, userId };
    room.users.set(userId, connectedUser);

    this.scheduleHeartbeat(sessionId, userId);

    const eventType: ServerEventType = wasAlreadyConnected
      ? "user_reconnected"
      : "user_joined";

    this.broadcastToOthers(sessionId, userId, {
      type: eventType,
      payload: { userId },
      timestamp: new Date().toISOString(),
    });
  }

  leave(sessionId: string, userId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    const user = room.users.get(userId);
    if (!user) return;

    clearTimeout(user.heartbeatTimer);

    user.disconnectTimer = setTimeout(() => {
      room.users.delete(userId);
      this.broadcastToOthers(sessionId, userId, {
        type: "user_left",
        payload: { userId },
        timestamp: new Date().toISOString(),
      });
      this.cleanupRoomIfEmpty(sessionId);
    }, DISCONNECT_GRACE_MS);
  }

  handlePong(sessionId: string, userId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    const user = room.users.get(userId);
    if (!user) return;

    clearTimeout(user.heartbeatTimer);
    this.scheduleHeartbeat(sessionId, userId);
  }

  sendToUser(sessionId: string, userId: string, message: ServerMessage): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    const user = room.users.get(userId);
    if (!user || user.ws.readyState !== WebSocket.OPEN) return;
    user.ws.send(JSON.stringify(message));
  }

  broadcastToSession(sessionId: string, message: ServerMessage): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    for (const user of room.users.values()) {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify(message));
      }
    }
  }

  broadcastToOthers(
    sessionId: string,
    excludeUserId: string,
    message: ServerMessage,
  ): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    for (const [userId, user] of room.users.entries()) {
      if (userId !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify(message));
      }
    }
  }

  getOnlineUsers(sessionId: string): string[] {
    const room = this.rooms.get(sessionId);
    if (!room) return [];
    return [...room.users.keys()];
  }

  private scheduleHeartbeat(sessionId: string, userId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    const user = room.users.get(userId);
    if (!user) return;

    user.heartbeatTimer = setTimeout(() => {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(
          JSON.stringify({
            type: "pong" as ServerEventType,
            payload: {},
            timestamp: new Date().toISOString(),
          } satisfies ServerMessage),
        );
      }
      this.scheduleHeartbeat(sessionId, userId);
    }, HEARTBEAT_INTERVAL_MS);
  }

  private cleanupRoomIfEmpty(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (room && room.users.size === 0) {
      this.rooms.delete(sessionId);
    }
  }
}

export const sessionSocketManager = new SessionSocketManager();