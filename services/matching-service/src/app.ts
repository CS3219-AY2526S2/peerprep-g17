import express from "express";
import cors from "cors";
import { config } from "./config";
import { MatchController } from "./controllers/matchController";
import { createMatchRoutes } from "./routes/matchRoutes";

export function createApp(controller: MatchController) {
  const app = express();

  app.use(cors({ origin: config.allowedOrigins, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ data: { ok: true } });
  });

  app.use("/api/matches", createMatchRoutes(controller));

  return app;
}
