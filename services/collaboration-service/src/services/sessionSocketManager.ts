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

  private getDistinctConnectedUserCount(room: SessionRoom): number {
    const baseUsers = new Set<string>();
    room.users.forEach((_, id) => {
      baseUsers.add(id.replace(/^(yjs:|chat:)/, ""));
    });
    return baseUsers.size;
  }

  private cancelWarning(sessionId: string, room: SessionRoom): void {
    if (!room.warningActive) {
      return;
    }

    room.warningActive = false;
    clearTimeout(room.terminationTimer);
    room.terminationTimer = undefined;
    this.broadcastToSession(sessionId, {
      type: "session_warning",
      payload: { countdownSeconds: 0, cancelled: true },
    });
  }

  join(sessionId: string, userId: string, ws: WebSocket, username: string): void {
    if (this.terminatedSessions.has(sessionId)) {
      console.log(
        `[WS] Hard Blocking User ${userId} from Terminated Session ${sessionId}`,
      );
      try {
        ws.send(
          JSON.stringify({
            type: "session_terminated",
            payload: { reason: "expired" },
            timestamp: new Date().toISOString(),
          }),
        );
      } catch {
        // Ignore send failures during forced termination.
      }
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
    room.lastActivityAt = Date.now();

    if (!wasAlreadyConnected) {
      room.users.forEach((connectedUser, id) => {
        if (id !== userId && connectedUser.ws.readyState === WebSocket.OPEN) {
          connectedUser.ws.send(
            JSON.stringify({
              type: "peer_status_change",
              payload: { userId: baseUserId, isConnected: true },
            }),
          );
        }
      });
    }

    if (userId.startsWith("chat:")) {
      const onlineUsers = new Set<string>();
      room.users.forEach((_, id) => {
        const peerId = id.replace(/^(yjs:|chat:)/, "");
        if (peerId !== baseUserId) {
          onlineUsers.add(peerId);
        }
      });

      onlineUsers.forEach((peerId) => {
        try {
          ws.send(
            JSON.stringify({
              type: "peer_status_change",
              payload: { userId: peerId, isConnected: true },
            }),
          );
        } catch {
          // Ignore send failures during snapshot sync.
        }
      });
    }
  }

  leave(sessionId: string, userId: string, isManual = false): void {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }

    room.users.delete(userId);
    const baseUserId = userId.replace(/^(yjs:|chat:)/, "");
    const stillConnected =
      room.users.has(`yjs:${baseUserId}`) ||
      room.users.has(`chat:${baseUserId}`);

    console.log(
      `[Inactivity] User left, room size: ${room.users.size}, lastActivityAt: ${room.lastActivityAt}`,
    );

    if (!stillConnected) {
      this.broadcastToSession(sessionId, {
        type: "peer_status_change",
        payload: {
          userId: baseUserId,
          isConnected: false,
          reason: isManual ? "manual" : "disconnect",
        },
      });
    }

    if (room.users.size === 0) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(sessionId);
        if (currentRoom && currentRoom.users.size === 0) {
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
    if (!room) {
      return;
    }
    if (room.warningActive) {
      return;
    }
    room.lastActivityAt = Date.now();
  }

  acknowledgeWarning(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }
    room.lastActivityAt = Date.now();
    this.cancelWarning(sessionId, room);
  }

  private startInactivityCheck(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }

    room.inactivityCheckTimer = setInterval(() => {
      const currentRoom = this.rooms.get(sessionId);
      if (!currentRoom || currentRoom.users.size === 0) {
        return;
      }
      if (this.getDistinctConnectedUserCount(currentRoom) < 2) {
        return;
      }

      const idleMs = Date.now() - currentRoom.lastActivityAt;
      if (idleMs > 25 * 60 * 1000 && !currentRoom.warningActive) {
        currentRoom.warningActive = true;
        this.broadcastToSession(sessionId, {
          type: "session_warning",
          payload: { countdownSeconds: 300, cancelled: false },
          timestamp: new Date().toISOString(),
        });
        currentRoom.terminationTimer = setTimeout(
          () => this.terminateSession(sessionId),
          5 * 60 * 1000,
        );
      }
    }, 1000);
  }

  private async terminateSession(sessionId: string): Promise<void> {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }

    this.terminatedSessions.add(sessionId);

    try {
      await fetch(
        `${config.matchingServiceUrl}/api/matches/sessions/${sessionId}/complete`,
        {
          method: "PATCH",
          headers: {
            "x-internal-service-token": config.internalServiceToken,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(`[Sync] Matching Service: Session ${sessionId} cleared.`);
    } catch {
      console.error("[Sync] Failed to notify Matching Service of termination");
    }

    this.broadcastToSession(sessionId, {
      type: "session_terminated",
      payload: { reason: "inactivity" },
      timestamp: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const user of room.users.values()) {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.close(4000);
      }
    }
    this.cleanupRoom(sessionId);
    setTimeout(() => this.terminatedSessions.delete(sessionId), 60000);
  }

  private cleanupRoom(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }
    clearInterval(room.inactivityCheckTimer);
    clearTimeout(room.terminationTimer);
    this.rooms.delete(sessionId);
  }

  public broadcastToSession(sessionId: string, message: unknown): void {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }
    room.users.forEach((user) => {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify(message));
      }
    });
  }

  public isUserConnected(sessionId: string, userId: string): boolean {
    const room = this.rooms.get(sessionId);
    return !!(room && room.users.has(userId));
  }

  public getConnectedPeerIds(sessionId: string, userId: string): string[] {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return [];
    }

    const baseUserId = userId.replace(/^(yjs:|chat:)/, "");
    const peerIds = new Set<string>();

    room.users.forEach((_, id) => {
      const peerId = id.replace(/^(yjs:|chat:)/, "");
      if (peerId !== baseUserId) {
        peerIds.add(peerId);
      }
    });

    return Array.from(peerIds);
  }
}

export const sessionSocketManager = new SessionSocketManager();
