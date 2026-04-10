import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { verifyTokenString } from "../middleware/authMiddleware";
import { sessionSocketManager } from "./sessionSocketManager";
import CollaborationSession from "../models/CollaborationSession";

const chatRooms = new Map<string, Map<WebSocket, string>>();
const HEARTBEAT_INTERVAL_MS = 10000;

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

  sessionSocketManager.join(sessionId, `chat:${userId}`, ws, username);

  if (!chatRooms.has(sessionId)) {
    chatRooms.set(sessionId, new Map());
  }
  const room = chatRooms.get(sessionId)!;
  room.set(ws, username);

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

  try {
    const session = await CollaborationSession.findOne({ sessionId });
    if (session?.messages && session.messages.length > 0) {
      ws.send(
        JSON.stringify({
          type: "chat_history",
          payload: session.messages,
        }),
      );
    }

    ws.send(
      JSON.stringify({
        type: "peer_status_snapshot",
        payload: {
          onlineUserIds: sessionSocketManager.getConnectedPeerIds(
            sessionId,
            `chat:${userId}`,
          ),
        },
      }),
    );
  } catch (err) {
    console.error("[Chat] History load failed:", err);
  }

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
          {
            $push: {
              messages: {
                username: messagePayload.username,
                text: messagePayload.text || "",
                timestamp: new Date(messagePayload.timestamp),
              },
            },
          },
        );

        const outgoing = JSON.stringify({
          type: "chat_message",
          payload: messagePayload,
        });
        room.forEach((_, client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(outgoing);
          }
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
          if (client.readyState === WebSocket.OPEN) {
            client.send(leaveMsg);
          }
        });
      }

      if (parsed.type === "keep_alive") {
        sessionSocketManager.acknowledgeWarning(sessionId);
      }

      if (parsed.type === "activity") {
        sessionSocketManager.recordActivity(sessionId);
      }

      if (parsed.type === "ping") {
        sessionSocketManager.handlePong(sessionId, `chat:${userId}`);
        ws.send(
          JSON.stringify({
            type: "pong",
            payload: {},
            timestamp: new Date().toISOString(),
          }),
        );
      }
    } catch {
      // Ignore malformed chat messages.
    }
  });

  ws.on("close", () => {
    clearInterval(pingTimer);
    room.delete(ws);
    sessionSocketManager.leave(sessionId, `chat:${userId}`);

    setTimeout(() => {
      if (room.size === 0) {
        chatRooms.delete(sessionId);
      }
    }, 3000);
  });

  ws.on("error", (err) => {
    console.error(`[Chat] Error for user ${userId}:`, err);
    sessionSocketManager.leave(sessionId, `chat:${userId}`);
  });
}
