import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes";
import { initializeProfilePhotoBucket } from "./lib/gridfs";

const app = express();

const PORT = process.env.PORT || 8081;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/user-service";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use("/api/users", userRoutes);

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    initializeProfilePhotoBucket();
    console.log("User Service - Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`User Service listening on PORT ${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();
