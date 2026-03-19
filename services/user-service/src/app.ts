import express from "express";
import cors from "cors";
import { config } from "./config";
import userRoutes from "./routes/userRoutes";
import passport from "./config/passport";
import "dotenv/config";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.allowedOrigins, credentials: true }));
  app.use(express.json());
  app.use(passport.initialize());
  app.use("/api/users", userRoutes);

  return app;
}
