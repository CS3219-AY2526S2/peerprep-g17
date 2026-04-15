import "dotenv/config";
import mongoose from "mongoose";
import { initializeProfilePhotoBucket } from "./lib/gridfs";
import { createApp } from "./app";
import { config } from "./config";

const app = createApp();

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    initializeProfilePhotoBucket();
    console.log("User Service - Connected to MongoDB");

    app.listen(config.port, () => {
      console.log(`User Service listening on PORT ${config.port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();
