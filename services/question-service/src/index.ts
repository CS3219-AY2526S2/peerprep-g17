import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import questionRoutes from "./routes/questionRoutes";

const app = express();

const PORT = process.env.PORT || 8080;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/question-service";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use("/api/questions", questionRoutes);

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Question Service — Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Question Service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();
