import { WebSocket } from "ws";
import { config } from "../config"; 

interface ConnectedUser {
  ws: WebSocket;
  userId: string;
  username: string;
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
  join(sessionId: string, userId: string, ws: WebSocket, username: string): void {
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
    const baseUserId = userId.replace(/^(yjs:|chat:)/, "");
    const wasAlreadyConnected =
      room.users.has(`yjs:${baseUserId}`) ||
      room.users.has(`chat:${baseUserId}`);
    room.users.set(userId, { ws, userId, username });
    if (!wasAlreadyConnected) {
      room.users.forEach((u, id) => {
        if (id !== userId && u.ws.readyState === WebSocket.OPEN) {
          u.ws.send(JSON.stringify({
            type: "peer_status_change",
            payload: { userId: baseUserId, isConnected: true }
          }));
        }
      });
    }
    if (userId.startsWith("chat:")) {
      const onlineUsers = new Set<string>();
      room.users.forEach((_, id) => {
        const base = id.replace(/^(yjs:|chat:)/, "");
        if (base !== baseUserId) onlineUsers.add(base);
      });
      onlineUsers.forEach(peerId => {
        try {
          ws.send(JSON.stringify({
            type: "peer_status_change",
            payload: { userId: peerId, isConnected: true }
          }));
        } catch (_) {}
      });
    }
  }
  leave(sessionId: string, userId: string, isManual: boolean = false): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    room.users.delete(userId);
    const baseUserId = userId.replace(/^(yjs:|chat:)/, "");
    const stillConnected =
      room.users.has(`yjs:${baseUserId}`) ||
      room.users.has(`chat:${baseUserId}`);
    console.log(`[Inactivity] User left, room size: ${room.users.size}, lastActivityAt: ${room.lastActivityAt}`);
    if (!stillConnected) {
      this.broadcastToSession(sessionId, {
        type: "peer_status_change",
        payload: { userId: baseUserId, isConnected: false, reason: isManual ? "manual" : "disconnect" }
      });
    }

    if (room.users.size === 0) {
      setTimeout(() => {
        const r = this.rooms.get(sessionId);
        if (r && r.users.size === 0) this.cleanupRoom(sessionId);
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
        payload: { countdownSeconds: 60, cancelled: true },
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
      if (idleMs > 25 * 60 * 1000 && !r.warningActive) { 
        r.warningActive = true;
        this.broadcastToSession(sessionId, {
          type: "session_warning",
          payload: { countdownSeconds: 300, cancelled: false },
          timestamp: new Date().toISOString()
        });
        r.terminationTimer = setTimeout(() => this.terminateSession(sessionId), 5 * 60 * 1000);
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

  public broadcastToSession(sessionId: string, message: any): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    room.users.forEach(u => {
      if (u.ws.readyState === WebSocket.OPEN) u.ws.send(JSON.stringify(message));
    });
  }

  public isUserConnected(sessionId: string, userId: string): boolean {
    const room = this.rooms.get(sessionId);
    return !!(room && room.users.has(userId));
  }
}

export const sessionSocketManager = new SessionSocketManager();