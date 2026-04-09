import { WebSocket } from "ws";
import { config } from "../config"; 

interface ConnectedUser {
  ws: WebSocket;
  userId: string;
  socketType: "chat" | "yjs";
}

interface SessionRoom {
  sessionId: string;
  users: Map<string, ConnectedUser>;
  lastActivityAt: number;
  inactivityCheckTimer?: ReturnType<typeof setInterval>;
  terminationTimer?: ReturnType<typeof setTimeout>;
  warningActive: boolean;
}

export class SessionSocketManager {
  private rooms = new Map<string, SessionRoom>();
  private terminatedSessions = new Set<string>(); 
  join(
    sessionId: string,
    userId: string,
    ws: WebSocket,
    socketType: "chat" | "yjs",
  ): void {
    if (this.terminatedSessions.has(sessionId)) {
      console.log(`[WS] Hard Blocking User ${userId} from Terminated Session ${sessionId}`);
      try {
        ws.send(JSON.stringify({ 
          type: "session_terminated", 
          payload: { reason: "expired" },
          timestamp: new Date().toISOString()
        }));
      } catch (_) { }
      setTimeout(() => ws.close(4000, "Session terminated"), 150);
      return;
    }
    if (!this.rooms.has(sessionId)) {
      this.rooms.set(sessionId, {
        sessionId,
        users: new Map(),
        lastActivityAt: Date.now(),
        warningActive: false,
      });
      this.startInactivityCheck(sessionId);
    }

    const room = this.rooms.get(sessionId)!;
    room.users.set(userId, { ws, userId, socketType });
  }
  leave(sessionId: string, userId: string, isManual: boolean = false): void {
  const room = this.rooms.get(sessionId);
  if (!room) return;
  console.log(`[Inactivity] User left, room size: ${room.users.size}, lastActivityAt: ${room.lastActivityAt}`);
  room.users.delete(userId);
  this.broadcastToSession(sessionId, {
    type: "peer_status_change",
    payload: { userId, isConnected: false, reason: isManual ? "manual" : "disconnect" }
  });
  if (room.users.size === 0) {
    setTimeout(() => {
      const r = this.rooms.get(sessionId);
      if (r && r.users.size === 0) {
        this.cleanupRoom(sessionId);
      }
    }, 30000);
  }
}

  handlePong(sessionId: string, userId: string): void {
    const room = this.rooms.get(sessionId);
    if (room && room.users.has(userId)) {
      room.lastActivityAt = Date.now();
    }
  }

  recordActivity(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    room.lastActivityAt = Date.now();
    if (room.warningActive) {
      room.warningActive = false;
      clearTimeout(room.terminationTimer);
     this.broadcastToSession(sessionId, {
  type: "session_warning",
  payload: { countdownSeconds: 60, cancelled: false },
});
    }
  }

  private startInactivityCheck(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    room.inactivityCheckTimer = setInterval(() => {
      const r = this.rooms.get(sessionId);
      if (!r || r.users.size === 0) return;
      const idleMs = Date.now() - r.lastActivityAt;
      console.log(`[Inactivity] Session ${sessionId} idle ${idleMs}ms, warningActive: ${r.warningActive}`);
      if (idleMs > 25 * 60 * 1000  && !r.warningActive) { 
        r.warningActive = true;
        this.broadcastToSession(sessionId, {
          type: "session_warning",
          payload: { countdownSeconds: 300, cancelled: false },
          timestamp: new Date().toISOString()
        });
      r.terminationTimer = setTimeout(() => this.terminateSession(sessionId), 5 *60 * 1000);
      }
    }, 10000);

  }

  private async terminateSession(sessionId: string): Promise<void> {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    this.terminatedSessions.add(sessionId);
    try {
     await fetch(`${config.matchingServiceUrl}/api/matches/sessions/${sessionId}/complete`, {
  method: 'PATCH',
  headers: { 
    'x-internal-service-token': config.internalServiceToken,
    'Content-Type': 'application/json'
  } 
});
      console.log(`[Sync] Matching Service: Session ${sessionId} cleared.`);
    } catch (_) {
      console.error("[Sync] Failed to notify Matching Service of termination");
    }

    this.broadcastToSession(sessionId, {
      type: "session_terminated",
      payload: { reason: "inactivity" },
      timestamp: new Date().toISOString()
    });

    await new Promise(r => setTimeout(r, 1000));
    for (const user of room.users.values()) {
      if (user.ws.readyState === WebSocket.OPEN) user.ws.close(4000);
    }
    this.cleanupRoom(sessionId);
    setTimeout(() => this.terminatedSessions.delete(sessionId), 60000);
  }

  private cleanupRoom(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    clearInterval(room.inactivityCheckTimer);
    clearTimeout(room.terminationTimer);
    this.rooms.delete(sessionId);
  }

  public broadcastToSession(
    sessionId: string,
    message: any,
    socketTypes: Array<"chat" | "yjs"> = ["chat"],
  ): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    room.users.forEach(u => {
      if (
        u.ws.readyState === WebSocket.OPEN &&
        socketTypes.includes(u.socketType)
      ) {
        u.ws.send(JSON.stringify(message));
      }
    });
  }
}

export const sessionSocketManager = new SessionSocketManager();
