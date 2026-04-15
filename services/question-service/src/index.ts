import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import { config } from "./config";
import { syncSeedQuestionExecutionMetadata } from "./utils/seedSync";

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Question Service — Connected to MongoDB");
    const syncedCount = await syncSeedQuestionExecutionMetadata();
    if (syncedCount > 0) {
      console.log(
        `Question Service — Backfilled execution metadata for ${syncedCount} questions`,
      );
    }

    app.listen(config.port, () => {
      console.log(`Question Service listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Question Service — Failed to start:", error);
    process.exit(1);
  }
}

startServer();
