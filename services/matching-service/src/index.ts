import "dotenv/config";
import http from "node:http";
import mongoose from "mongoose";
import Redis from "ioredis";
import { createApp } from "./app";
import { config } from "./config";
import { MatchController } from "./controllers/matchController";
import { CollaborationClient } from "./services/collaborationClient";
import { LockService } from "./services/lockService";
import { MatchService } from "./services/matchService";
import { QuestionCatalogService } from "./services/questionCatalogService";
import { RedisMatchEventBus } from "./services/redisEventBus";
import { TimeoutWorker } from "./services/timeoutWorker";
import { WebSocketGateway } from "./services/websocketGateway";

async function startServer(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Matching Service - Connected to MongoDB");

    const redis = new Redis(config.redisUrl);
    const publisher = new Redis(config.redisUrl);
    const subscriber = new Redis(config.redisUrl);

    const lockService = new LockService(redis, config.lockTtlMs);
    const eventBus = new RedisMatchEventBus(
      publisher,
      subscriber,
      config.matchEventChannel,
    );
    const questionCatalogService = new QuestionCatalogService();
    const collaborationClient = new CollaborationClient();
    const matchService = new MatchService(
      redis,
      lockService,
      questionCatalogService,
      collaborationClient,
      eventBus,
    );

    const controller = new MatchController(matchService);
    const app = createApp(controller);
    const server = http.createServer(app);
    const websocketGateway = new WebSocketGateway(server, eventBus, matchService);
    const timeoutWorker = new TimeoutWorker(
      matchService,
      config.timeoutPollIntervalMs,
    );

    await websocketGateway.start();
    timeoutWorker.start();

    server.listen(config.port, () => {
      console.log(`Matching Service listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Matching Service - Failed to start:", error);
    process.exit(1);
  }
}

startServer();
