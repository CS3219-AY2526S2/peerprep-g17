import express from "express";
import cors from "cors";
import { config } from "./config";
import { CollaborationController } from "./controllers/collaborationController";
import { createCollaborationRoutes } from "./routes/collaborationRoutes";

export function createApp(controller: CollaborationController) {
  const app = express();

  app.use(cors({ origin: config.allowedOrigins, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ data: { ok: true } });
  });

  app.use("/api/sessions", createCollaborationRoutes(controller));

  return app;
}
