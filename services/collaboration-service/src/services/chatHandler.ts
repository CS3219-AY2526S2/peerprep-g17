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

  // FIXED: Passing all 4 arguments to match the new SessionSocketManager.join
  sessionSocketManager.join(sessionId, `chat:${userId}`, ws, username);

  if (!chatRooms.has(sessionId)) {
    chatRooms.set(sessionId, new Map());
  }
  const room = chatRooms.get(sessionId)!;
  room.set(ws, username);

  // HYDRATION: Load previous messages from MongoDB
  try {
    const session = await CollaborationSession.findOne({ sessionId });
    if (session?.messages && session.messages.length > 0) {
      ws.send(JSON.stringify({
        type: "chat_history",
        payload: session.messages,
      }));
    }
  } catch (err) {
    console.error(`[Chat] History load failed:`, err);
  }

  // NO AUTOMATIC JOIN MESSAGE (Quiet Join)

  ws.on("message", async (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === "chat_message") {
        sessionSocketManager.recordActivity(sessionId);
        
        const messagePayload = {
          fromUserId: userId,
          text: parsed.payload?.text,
          username: parsed.payload?.username || username,
          timestamp: new Date().toISOString(),
        };

        await CollaborationSession.findOneAndUpdate(
          { sessionId },
          { $push: { messages: { 
              username: messagePayload.username, 
              text: messagePayload.text || "", 
              timestamp: new Date(messagePayload.timestamp) 
          } } }
        );

        const outgoing = JSON.stringify({ type: "chat_message", payload: messagePayload });
        room.forEach((_, client) => {
          if (client.readyState === WebSocket.OPEN) client.send(outgoing);
        });
      }

      if (parsed.type === "explicit_leave") {
        const leaveMsg = JSON.stringify({
          type: "chat_message",
          payload: {
            fromUserId: "SYSTEM",
            username: "System",
            text: `${username} has ended the session.`,
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
    const leavingUsername = room.get(ws) || username;
    room.delete(ws);
    sessionSocketManager.leave(sessionId, `chat:${userId}`);

    // QUIET RELOAD: Wait 3 seconds to check if they reconnected before announcing departure
    setTimeout(() => {
      const reconnected = sessionSocketManager.isUserConnected(sessionId, `chat:${userId}`);
      if (!reconnected) {
        const leaveMsg = JSON.stringify({
          type: "chat_message",
          payload: {
            fromUserId: "SYSTEM",
            username: "System",
            text: `${leavingUsername} has left the chat`,
            timestamp: new Date().toISOString(),
          },
        });
        room.forEach((_, client) => {
          if (client.readyState === WebSocket.OPEN) client.send(leaveMsg);
        });
      }
      if (room.size === 0) chatRooms.delete(sessionId);
    }, 3000);
  });

  ws.on("error", (err) => {
    console.error(`[Chat] Error for user ${userId}:`, err);
    sessionSocketManager.leave(sessionId, `chat:${userId}`);
  });
}