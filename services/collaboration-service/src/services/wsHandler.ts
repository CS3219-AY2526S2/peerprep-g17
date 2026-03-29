import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { CollaborationService } from "./collaborationService";
import { verifyTokenString } from "../middleware/authMiddleware";
import { setupYjsConnection } from "./yjsUtils";
import { sessionSocketManager } from "./sessionSocketManager"; 
import CollaborationSession from "../models/CollaborationSession";

export function handleWebSocketConnection(
  ws: WebSocket,
  req: IncomingMessage,
  collaborationService: CollaborationService,
): void {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const sessionId = pathParts[pathParts.length - 1];
  const token = url.searchParams.get("token");

  if (!sessionId || !token) { ws.close(4001, "Missing sessionId or token"); return; }

  let userId: string;
  try {
    userId = verifyTokenString(token);
  } catch {
    ws.close(4003, "Invalid or expired token"); return;
  }

  collaborationService
    .getSessionForUser(sessionId, userId)
    .then(async (session) => {
      if (!session) { ws.close(4004, "Session not found or access denied"); return; }
      sessionSocketManager.join(sessionId, userId, ws);

      await setupYjsConnection(ws, sessionId);

      console.log(`[WS] User ${userId} connected to session ${sessionId}`);

ws.on("message", async (data: any, isBinary: boolean) => {
  if (isBinary) {
    return;
  }

  try {
    const msgString = data.toString();
    if (!msgString.startsWith('{')) {
      return;
    }

    const parsedData = JSON.parse(msgString);

    if (parsedData.type === "chat_message") {
      const { text, username } = parsedData.payload;
      await CollaborationSession.updateOne(
        { sessionId },
        { 
          $push: { 
            messages: { 
              username, 
              text, 
              timestamp: new Date() 
            } 
          } 
        }
      );
      sessionSocketManager.broadcastToSession(sessionId, parsedData);
    }
  } catch (err) {
    console.error("[WS] Silently skipped malformed JSON or Yjs noise.");
  }
});
      ws.on("close", (code) => {
        console.log(`[WS] User ${userId} disconnected (Code: ${code}) from session ${sessionId}`);
        const wasGraceful = code === 1000;
        sessionSocketManager.leave(sessionId, userId, wasGraceful);
      });

      ws.on("error", (err) => {
        console.error(`[WS] Error for user ${userId}:`, err);
        sessionSocketManager.leave(sessionId, userId, false);
      });
    })
    .catch((err) => {
      console.error("[WS] Handler error:", err);
      ws.close(4500, "Internal error");
    });
}