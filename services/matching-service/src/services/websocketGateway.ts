import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { RedisMatchEventBus } from "./redisEventBus";
import { config } from "../config";
import { resolveUserFromAuthHeader } from "../middleware/authMiddleware";
import { MatchService } from "./matchService";

function extractTokenFromRequest(request: http.IncomingMessage): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader) {
    return authHeader;
  }

  const host = request.headers.host;
  if (!host || !request.url) {
    return null;
  }

  const url = new URL(request.url, `http://${host}`);
  const token = url.searchParams.get("token");
  if (!token) {
    return null;
  }

  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

export class WebSocketGateway {
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly clients = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly server: http.Server,
    private readonly eventBus: RedisMatchEventBus,
    private readonly matchService: MatchService,
  ) {}

  async start(): Promise<void> {
    await this.eventBus.subscribe(({ userId, event }) => {
      const sockets = this.clients.get(userId);
      if (!sockets) {
        return;
      }

      const payload = JSON.stringify(event);
      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        }
      }
    });

    this.server.on("upgrade", async (request, socket, head) => {
      const host = request.headers.host;
      if (!host || !request.url) {
        socket.destroy();
        return;
      }

      const url = new URL(request.url, `http://${host}`);
      if (url.pathname !== config.wsPath) {
        socket.destroy();
        return;
      }

      const authHeader = extractTokenFromRequest(request);
      if (!authHeader) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      try {
        const resolved = await resolveUserFromAuthHeader(authHeader);
        if (!resolved) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.registerConnection(resolved.userId, ws);
        });
      } catch {
        socket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
        socket.destroy();
      }
    });
  }

  private registerConnection(userId: string, ws: WebSocket): void {
    const existing = this.clients.get(userId) || new Set<WebSocket>();
    existing.add(ws);
    this.clients.set(userId, existing);

    ws.on("close", () => {
      const sockets = this.clients.get(userId);
      if (!sockets) {
        return;
      }

      sockets.delete(ws);
      if (sockets.size === 0) {
        this.clients.delete(userId);
      }
    });
  }
}
