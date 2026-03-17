import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
];

export function createApp() {
  const app = express();

  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use("/api/users", userRoutes);

  return app;
}
