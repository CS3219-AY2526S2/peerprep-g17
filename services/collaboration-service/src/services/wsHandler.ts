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
  
  // FIX 1: Extract username from URL params just like we did in Chat
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

      // FIX 2: Now passing 4 arguments to join (session, id, ws, username)
      sessionSocketManager.join(sessionId, `yjs:${userId}`, ws, username);

      await setupYjsConnection(ws, sessionId);

      let isAlive = true;
      const pingTimer = setInterval(() => {
      if (!isAlive) {
        sessionSocketManager.leave(sessionId, `yjs:${userId}`);
        ws.terminate();
        clearInterval(pingTimer);
        return;
      }
      isAlive = false;
      ws.ping();
    }, 10000);
    ws.on("pong", () => { isAlive = true; });
    ws.on("close", (code) => {
      clearInterval(pingTimer);
      console.log(`[WS] User ${userId} disconnected (Code: ${code})`);
    sessionSocketManager.leave(sessionId, `yjs:${userId}`);
});

      console.log(`[WS] User ${username} (${userId}) connected to Yjs session ${sessionId}`);

      ws.on("message", async (data: any, isBinary: boolean) => {
        // Yjs handles binary data, we only handle JSON chat messages here
        if (isBinary) return;

        try {
          const msgString = data.toString();
          if (!msgString.startsWith('{')) return;

          const parsedData = JSON.parse(msgString);

          if (parsedData.type === "chat_message") {
            // FIX 3: Ensure we have fallback if payload username is missing
            const msgUsername = parsedData.payload?.username || username;
            const msgText = parsedData.payload?.text || "";

            await CollaborationSession.updateOne(
              { sessionId },
              { 
                $push: { 
                  messages: { 
                    username: msgUsername, 
                    text: msgText, 
                    timestamp: new Date() 
                  } 
                } 
              }
            );
            sessionSocketManager.broadcastToSession(sessionId, parsedData);
          }
        } catch (err) {
          // Quietly ignore malformed JSON (could be partial Yjs strings)
        }
      });

      ws.on("error", (err) => {
        console.error(`[WS] Error for user ${userId}:`, err);
        sessionSocketManager.leave(sessionId, `yjs:${userId}`);
      });
    })
    .catch((err) => {
      console.error("[WS] Handler error:", err);
      ws.close(4500, "Internal error");
    });
}