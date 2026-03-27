import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { sessionSocketManager } from "./sessionSocketManager";
import { CollaborationService } from "./collaborationService";
import { verifyTokenString } from "../middleware/authMiddleware";
import { setupYjsConnection } from "./yjsUtils";

interface ParsedMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export function handleWebSocketConnection(
  ws: WebSocket,
  req: IncomingMessage,
  collaborationService: CollaborationService,
): void {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const sessionId = pathParts[pathParts.length - 1];
  const token = url.searchParams.get("token");

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
    .then((session) => {
      if (!session) {
        ws.close(4004, "Session not found or access denied");
        return;
      }
      setupYjsConnection(ws, sessionId);

      console.log(`[WS] User ${userId} connected to session ${sessionId}`);

      ws.on("close", () => {
        console.log(`[WS] User ${userId} disconnected from session ${sessionId}`);
      });
    })
    .catch((err) => {
      console.error("[WS] Handler error:", err);
      ws.close(4500, "Internal error");
    });
}