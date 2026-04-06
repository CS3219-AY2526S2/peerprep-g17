import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { verifyTokenString } from "../middleware/authMiddleware";
import { sessionSocketManager } from "./sessionSocketManager";
import CollaborationSession from "../models/CollaborationSession";

const chatRooms = new Map<string, Map<WebSocket, string>>();

export async function handleChatConnection(
  ws: WebSocket,
  req: IncomingMessage,
): Promise<void> {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const sessionId = pathParts[pathParts.length - 1];
  const token = url.searchParams.get("token");
  const username = url.searchParams.get("username") || "User";

  if (!sessionId || !token) {
    ws.close(4001, "Missing params");
    return;
  }

  let userId: string;
  try {
    userId = verifyTokenString(token);
  } catch {
    ws.close(4003, "Invalid token");
    return;
  }

  sessionSocketManager.join(sessionId, `chat:${userId}`, ws);
  if (!chatRooms.has(sessionId)) {
    chatRooms.set(sessionId, new Map());
  }
  const room = chatRooms.get(sessionId)!;
  room.set(ws, username);

  // --- HYDRATION LOGIC (Persists) ---
  try {
    const session = await CollaborationSession.findOne({ sessionId });
    if (session?.messages && session.messages.length > 0) {
      ws.send(JSON.stringify({
        type: "chat_history",
        payload: session.messages,
      }));
    }
  } catch (err) {
    console.error(`[Chat] Failed to fetch history for ${sessionId}:`, err);
  }

  // NOTE: Automatic "Joined" message removed to prevent reload spam.

  console.log(`[Chat] User ${username} (${userId}) connected to session ${sessionId}`);

  ws.on("message", async (data) => {
    try {
      const parsed = JSON.parse(data.toString()) as {
        type: string;
        payload?: { text?: string; username?: string; reason?: string };
      };

      if (parsed.type === "chat_message") {
        sessionSocketManager.recordActivity(sessionId);
        
        const messagePayload = {
          fromUserId: userId,
          text: parsed.payload?.text,
          username: parsed.payload?.username || username,
          timestamp: new Date().toISOString(),
        };

        try {
          await CollaborationSession.findOneAndUpdate(
            { sessionId },
            { 
              $push: { 
                messages: {
                  username: messagePayload.username,
                  text: messagePayload.text || "",
                  timestamp: new Date(messagePayload.timestamp)
                } 
              } 
            }
          );
        } catch (err) {
          console.error(`[Chat] Failed to persist message for ${sessionId}:`, err);
        }

        const outgoing = JSON.stringify({
          type: "chat_message",
          payload: messagePayload,
        });

        room.forEach((_, client) => {
          if (client.readyState === WebSocket.OPEN) client.send(outgoing);
        });
      }

      // --- NEW: Handle Explicit Leave (Button Clicked) ---
      if (parsed.type === "explicit_leave") {
        const leaveMsg = JSON.stringify({
          type: "chat_message",
          payload: {
            fromUserId: "SYSTEM",
            username: "System",
            text: `${username} has ended the session (${parsed.payload?.reason || "Exit"}).`,
            timestamp: new Date().toISOString(),
          },
        });
        room.forEach((_, client) => {
          if (client.readyState === WebSocket.OPEN) client.send(leaveMsg);
        });
      }

      if (parsed.type === "keep_alive") {
        sessionSocketManager.recordActivity(sessionId);
      }

      if (parsed.type === "ping") {
        sessionSocketManager.handlePong(sessionId, userId);
        ws.send(JSON.stringify({ type: "pong", payload: {}, timestamp: new Date().toISOString() }));
      }
    } catch (err) { }
  });

  ws.on("close", () => {
    room.delete(ws);
    sessionSocketManager.leave(sessionId, `chat:${userId}`);
    if (room.size === 0) chatRooms.delete(sessionId);
    // NOTE: Automatic "Left" message removed. Partner only notified via explicit_leave or Peer Status icon.
  });

  ws.on("error", (err) => {
    console.error(`[Chat] Error for user ${userId}:`, err);
    sessionSocketManager.leave(sessionId, `chat:${userId}`);
  });
}