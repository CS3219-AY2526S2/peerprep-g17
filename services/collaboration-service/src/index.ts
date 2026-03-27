import "dotenv/config";
import http from "http";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import { createApp } from "./app";
import { config } from "./config";
import { CollaborationController } from "./controllers/collaborationController";
import { CollaborationService } from "./services/collaborationService";
import { MatchingServiceClient } from "./services/matchingServiceClient";
import { handleWebSocketConnection } from "./services/wsHandler";
import { handleChatConnection } from "./services/chatHandler";

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Collaboration Service - Connected to MongoDB");

    const collaborationService = new CollaborationService(new MatchingServiceClient());
    const controller = new CollaborationController(collaborationService);
    const app = createApp(controller);
    const server = http.createServer(app);

    const wss = new WebSocketServer({ noServer: true });
    const chatWss = new WebSocketServer({ noServer: true }); // separate server for chat

    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const pathname = url.pathname;

      if (pathname.startsWith("/ws/sessions")) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else if (pathname.startsWith("/ws/chat")) {
        chatWss.handleUpgrade(request, socket, head, (ws) => {
          chatWss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on("connection", (ws, req) => {
      handleWebSocketConnection(ws, req, collaborationService);
    });

    chatWss.on("connection", (ws, req) => {
      handleChatConnection(ws, req);
    });

    server.listen(config.port, () => {
      console.log(`Collaboration Service listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Collaboration Service - Failed to start:", error);
    process.exit(1);
  }
}

startServer();