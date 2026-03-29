import { useEffect, useRef, useState, useCallback } from "react";
import { COLLABORATION_WS_URL } from "@/config";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface ChatMessage {
  fromUserId: string;
  text: string;
  timestamp: string;
}

export interface CollaborationSocketState {
  connectionStatus: ConnectionStatus;
  onlineUsers: string[];
  chatMessages: ChatMessage[];
  sendChat: (text: string) => void;
}

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useCollaborationSocket(
  sessionId: string | undefined,
  token: string | null,
): CollaborationSocketState {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const connect = useCallback(() => {
    if (!sessionId || !token || !isMounted.current) return;

    const url = `${COLLABORATION_WS_URL}/${sessionId}?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      reconnectAttempts.current = 0;
      setConnectionStatus("connected");
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          payload: Record<string, unknown>;
          timestamp: string;
        };

        switch (msg.type) {
          case "session_state":
            setOnlineUsers((msg.payload.onlineUsers as string[]) ?? []);
            break;

          case "user_joined":
          case "user_reconnected":
            setOnlineUsers((prev) => {
              const userId = msg.payload.userId as string;
              return prev.includes(userId) ? prev : [...prev, userId];
            });
            break;

          case "user_left":
            setOnlineUsers((prev) =>
              prev.filter((id) => id !== (msg.payload.userId as string)),
            );
            break;

          case "chat_message":
            setChatMessages((prev) => [
              ...prev,
              {
                fromUserId: msg.payload.fromUserId as string,
                text: msg.payload.text as string,
                timestamp: msg.timestamp,
              },
            ]);
            break;

          case "pong":
            // Server heartbeat — send ping back
            ws.send(JSON.stringify({ type: "ping", payload: {} }));
            break;

          default:
            break;
        }
      } catch {
      }
    };

    ws.onclose = () => {
      if (!isMounted.current) return;
      wsRef.current = null;

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus("reconnecting");
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY_MS * reconnectAttempts.current);
      } else {
        setConnectionStatus("disconnected");
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId, token]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendChat = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat_message", payload: { text } }));
    }
  }, []);

  return { connectionStatus, onlineUsers, chatMessages, sendChat };
}