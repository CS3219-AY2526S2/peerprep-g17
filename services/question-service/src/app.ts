import express from "express";
import cors from "cors";
import { config } from "./config";
import questionRoutes from "./routes/questionRoutes";

const app = express();

app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json());
app.use("/api/questions", questionRoutes);

export default app;
