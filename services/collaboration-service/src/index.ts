import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app";
import { config } from "./config";
import { CollaborationController } from "./controllers/collaborationController";
import { CollaborationService } from "./services/collaborationService";
import { MatchingServiceClient } from "./services/matchingServiceClient";

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Collaboration Service - Connected to MongoDB");

    const collaborationService = new CollaborationService(
      new MatchingServiceClient(),
    );
    const controller = new CollaborationController(collaborationService);
    const app = createApp(controller);

    app.listen(config.port, () => {
      console.log(`Collaboration Service listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Collaboration Service - Failed to start:", error);
    process.exit(1);
  }
}

startServer();
