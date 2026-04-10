import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { CollaborationService } from "./collaborationService";
import { verifyTokenString } from "../middleware/authMiddleware";
import { setupYjsConnection } from "./yjsUtils";
import { sessionSocketManager } from "./sessionSocketManager";

const HEARTBEAT_INTERVAL_MS = 10000;

export function handleWebSocketConnection(
  ws: WebSocket,
  req: IncomingMessage,
  collaborationService: CollaborationService,
): void {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const sessionId = pathParts[pathParts.length - 1];
  const token = url.searchParams.get("token");
  const username = url.searchParams.get("username") || "User";

  if (!sessionId || !token) {
    ws.close(4001, "Missing sessionId or token");
    return;
  }

  let userId: string;
  try {
    userId = verifyTokenString(token);
  } catch {
    ws.close(4003, "Invalid or expired token");
    return;
  }

  collaborationService
    .getSessionForUser(sessionId, userId)
    .then(async (session) => {
      if (!session) {
        ws.close(4004, "Session not found or access denied");
        return;
      }

      await collaborationService.ensureSessionStarterCode(session);
      sessionSocketManager.join(sessionId, `yjs:${userId}`, ws, username);
      await setupYjsConnection(ws, sessionId);

      let isAlive = true;
      const pingTimer = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }
        if (!isAlive) {
          ws.terminate();
          return;
        }
        isAlive = false;
        ws.ping();
      }, HEARTBEAT_INTERVAL_MS);

      ws.on("pong", () => {
        isAlive = true;
      });

      ws.on("message", (data: Buffer, isBinary: boolean) => {
        if (isBinary) {
          return;
        }

        try {
          const message = JSON.parse(data.toString());
          if (message.type === "keep_alive") {
            sessionSocketManager.acknowledgeWarning(sessionId);
          }
          if (message.type === "activity") {
            sessionSocketManager.recordActivity(sessionId);
          }
        } catch {
          // Ignore malformed JSON and any Yjs transport noise.
        }
      });

      ws.on("close", (code) => {
        clearInterval(pingTimer);
        console.log(
          `[WS] User ${username} (${userId}) disconnected (Code: ${code}) from session ${sessionId}`,
        );
        sessionSocketManager.leave(sessionId, `yjs:${userId}`);
      });

      ws.on("error", (err) => {
        console.error(`[WS] Error for user ${userId}:`, err);
        sessionSocketManager.leave(sessionId, `yjs:${userId}`);
      });

      console.log(
        `[WS] User ${username} (${userId}) connected to Yjs session ${sessionId}`,
      );
    })
    .catch((err) => {
      console.error("[WS] Handler error:", err);
      ws.close(4500, "Internal error");
    });
}
