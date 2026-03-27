import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { verifyTokenString } from "../middleware/authMiddleware";

const chatRooms = new Map<string, Set<WebSocket>>();

export function handleChatConnection(
  ws: WebSocket,
  req: IncomingMessage,
): void {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const sessionId = pathParts[pathParts.length - 1];
  const token = url.searchParams.get("token");

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

  if (!chatRooms.has(sessionId)) chatRooms.set(sessionId, new Set());
  const room = chatRooms.get(sessionId)!;
  room.add(ws);

  console.log(`[Chat] User ${userId} joined session ${sessionId}`);

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString()) as {
        type: string;
        payload?: { text?: string };
      };

      if (parsed.type === "chat_message") {
        const outgoing = JSON.stringify({
          type: "chat_message",
          payload: { fromUserId: userId, text: parsed.payload?.text },
          timestamp: new Date().toISOString(),
        });

        for (const client of room) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(outgoing);
          }
        }
      }
    } catch {
    }
  });

  ws.on("close", () => {
    room.delete(ws);
    if (room.size === 0) chatRooms.delete(sessionId);
    console.log(`[Chat] User ${userId} left session ${sessionId}`);
  });

  ws.on("error", (err) => {
    console.error(`[Chat] Error for user ${userId}:`, err);
  });
}