import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { verifyTokenString } from "../middleware/authMiddleware";
import { sessionSocketManager } from "./sessionSocketManager";

const chatRooms = new Map<string, Map<WebSocket, string>>();

export function handleChatConnection(
  ws: WebSocket,
  req: IncomingMessage,
): void {
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

  sessionSocketManager.join(sessionId, userId, ws);
  if (!chatRooms.has(sessionId)) {
    chatRooms.set(sessionId, new Map());
  }
  const room = chatRooms.get(sessionId)!;
  room.set(ws, username);

  const joinMessage = JSON.stringify({
    type: "chat_message",
    payload: {
      fromUserId: "SYSTEM",
      username: "System",
      text: `${username} has joined the chat`,
      timestamp: new Date().toISOString(),
    },
  });
  room.forEach((_, client) => {
    if (client.readyState === WebSocket.OPEN) client.send(joinMessage);
  });

  console.log(`[Chat] User ${username} (${userId}) joined session ${sessionId}`);

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString()) as {
        type: string;
        payload?: { text?: string; username?: string };
      };
      if (parsed.type === "chat_message") {
        sessionSocketManager.recordActivity(sessionId);
        const outgoing = JSON.stringify({
          type: "chat_message",
          payload: {
            fromUserId: userId,
            text: parsed.payload?.text,
            username: parsed.payload?.username || username,
            timestamp: new Date().toISOString(),
          },
        });
        room.forEach((_, client) => {
          if (client.readyState === WebSocket.OPEN) client.send(outgoing);
        });
      }

      if (parsed.type === "keep_alive") {
        sessionSocketManager.recordActivity(sessionId);
      }

      if (parsed.type === "ping") {
        sessionSocketManager.handlePong(sessionId, userId);
        ws.send(JSON.stringify({
          type: "pong",
          payload: {},
          timestamp: new Date().toISOString(),
        }));
      }
    } catch {
    }
  });

  ws.on("close", () => {
    const leavingUsername = room.get(ws) || "User";
    room.delete(ws);
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
    if (room.size === 0) chatRooms.delete(sessionId);
    sessionSocketManager.leave(sessionId, userId);
    console.log(`[Chat] User ${leavingUsername} left session ${sessionId}`);
  });
  ws.on("error", (err) => {
    console.error(`[Chat] Error for user ${userId}:`, err);
    sessionSocketManager.leave(sessionId, userId);
  });
}