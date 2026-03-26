import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Redis from "ioredis-mock";
import { MongoMemoryServer } from "mongodb-memory-server";
import Session from "../models/Session";
import { LockService } from "../services/lockService";
import { MatchService } from "../services/matchService";
import { RedisMatchEventBus } from "../services/redisEventBus";
import { Difficulty, MatchHandoffPayload, MatchStatusEvent, SelectedQuestion } from "../types";

class FakeQuestionCatalogService {
  constructor(
    private readonly topics: string[],
    private readonly questions: Record<string, SelectedQuestion[]>,
  ) {}

  async validateTopic(_authHeader: string, topic: string): Promise<boolean> {
    return this.topics.includes(topic);
  }

  async selectQuestion(
    _authHeader: string,
    topic: string,
    difficulty: Difficulty,
  ): Promise<SelectedQuestion | null> {
    const questions = this.questions[topic] || [];
    const order: Difficulty[] =
      difficulty === "Easy"
        ? ["Easy", "Medium", "Hard"]
        : difficulty === "Medium"
          ? ["Medium", "Easy", "Hard"]
          : ["Hard", "Medium", "Easy"];

    for (const currentDifficulty of order) {
      const question = questions.find((entry) => entry.difficulty === currentDifficulty);
      if (question) {
        return question;
      }
    }

    return null;
  }
}

class FakeCollaborationClient {
  public shouldFail = false;
  public payloads: MatchHandoffPayload[] = [];

  async handoffMatch(payload: MatchHandoffPayload): Promise<void> {
    this.payloads.push(payload);
    if (this.shouldFail) {
      throw new Error("handoff failed");
    }
  }
}

class FakeEventBus {
  public events: Array<{ userId: string; event: MatchStatusEvent }> = [];

  async publish(userId: string, event: MatchStatusEvent): Promise<void> {
    this.events.push({ userId, event });
  }
}

let mongoServer: MongoMemoryServer;
let redis: InstanceType<typeof Redis>;
let matchService: MatchService;
let questionCatalogService: FakeQuestionCatalogService;
let collaborationClient: FakeCollaborationClient;
let eventBus: FakeEventBus;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { ip: "127.0.0.1" },
  });
  await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  redis = new Redis();
  questionCatalogService = new FakeQuestionCatalogService(
    ["Arrays", "Dynamic Programming"],
    {
      Arrays: [
        { id: "q-arrays-easy", difficulty: "Easy", title: "Two Sum" },
        { id: "q-arrays-medium", difficulty: "Medium", title: "3Sum" },
      ],
    },
  );
  collaborationClient = new FakeCollaborationClient();
  eventBus = new FakeEventBus();

  matchService = new MatchService(
    redis as unknown as never,
    new LockService(redis as unknown as never, 5000),
    questionCatalogService as unknown as never,
    collaborationClient as unknown as never,
    eventBus as unknown as never,
  );
});

test.afterEach(async () => {
  await redis.flushall();
  await redis.quit();
});

test("queues a valid request and exposes searching state", async () => {
  const result = await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  assert.equal(result.matched, false);
  assert.equal(result.state.status, "searching");

  const state = await matchService.getUserState("user-a");
  assert.ok(state);
  assert.equal(state.status, "searching");
  assert.equal(eventBus.events.at(-1)?.event.status, "searching");
});

test("matches exact difficulty FIFO and creates an active session", async () => {
  await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  const result = await matchService.createRequest("user-b", "Bearer token-b", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  assert.equal(result.matched, true);
  assert.equal(result.state.status, "matched");
  assert.equal(collaborationClient.payloads.length, 1);

  const session = await Session.findOne({ sessionId: result.state.sessionId });
  assert.ok(session);
  assert.equal(session.status, "active");

  const matchedEvent = eventBus.events.at(-1);
  assert.equal(matchedEvent?.event.status, "matched");
});

test("rejects duplicate active requests for the same user", async () => {
  await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  await assert.rejects(
    () =>
      matchService.createRequest("user-a", "Bearer token-a", {
        topic: "Arrays",
        difficulty: "Medium",
      }),
    /active matchmaking request/i,
  );
});

test("rejects requests with a topic that is not in the question catalog", async () => {
  await assert.rejects(
    () =>
      matchService.createRequest("user-a", "Bearer token-a", {
        topic: "Graphs",
        difficulty: "Easy",
      }),
    /invalid topic/i,
  );
});

test("rejects new matchmaking requests while the user has an active session", async () => {
  await Session.create({
    sessionId: "existing-session",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-arrays-easy",
    status: "active",
  });

  await assert.rejects(
    () =>
      matchService.createRequest("user-a", "Bearer token-a", {
        topic: "Arrays",
        difficulty: "Easy",
      }),
    /active collaboration session/i,
  );
});

test("falls back to the closest available question difficulty", async () => {
  const resultA = await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Hard",
  });
  assert.equal(resultA.matched, false);

  await redis.hset(
    "match:request:" + (await redis.get("match:user-request:user-a")),
    "createdAt",
    String(Date.now() - 61000),
  );

  const resultB = await matchService.createRequest("user-b", "Bearer token-b", {
    topic: "Arrays",
    difficulty: "Medium",
  });

  assert.equal(resultB.matched, true);
  assert.equal(collaborationClient.payloads[0]?.questionId, "q-arrays-medium");
});

test("does not match the immediate previous partner when they are at the FIFO head", async () => {
  await Session.create({
    sessionId: "completed-session",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-arrays-easy",
    status: "completed",
    completedAt: new Date(),
  });

  await matchService.createRequest("user-b", "Bearer token-b", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  const result = await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  assert.equal(result.matched, false);
  assert.equal(result.state.status, "searching");

  const activeSession = await Session.findOne({ status: "active" });
  assert.equal(activeSession, null);
});

test("cancels a queued request and removes it from active state", async () => {
  await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  const cancelled = await matchService.cancelRequest("user-a");
  assert.equal(cancelled, true);

  const state = await matchService.getUserState("user-a");
  assert.equal(state, null);
  assert.equal(eventBus.events.at(-1)?.event.status, "cancelled");
});

test("rolls both users back to searching when collaboration handoff fails", async () => {
  await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  collaborationClient.shouldFail = true;

  const result = await matchService.createRequest("user-b", "Bearer token-b", {
    topic: "Arrays",
    difficulty: "Easy",
  });

  assert.equal(result.matched, false);
  assert.equal(result.state.status, "searching");

  const stateA = await matchService.getUserState("user-a");
  const stateB = await matchService.getUserState("user-b");
  assert.equal(stateA?.status, "searching");
  assert.equal(stateB?.status, "searching");

  const session = await Session.findOne().sort({ createdAt: -1 });
  assert.ok(session);
  assert.equal(session.status, "failed");
});

test("rolls the provisional match back when no question exists for the matched topic", async () => {
  await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Dynamic Programming",
    difficulty: "Easy",
  });

  const result = await matchService.createRequest("user-b", "Bearer token-b", {
    topic: "Dynamic Programming",
    difficulty: "Easy",
  });

  assert.equal(result.matched, false);
  assert.equal(result.state.status, "searching");

  const stateA = await matchService.getUserState("user-a");
  const stateB = await matchService.getUserState("user-b");
  assert.equal(stateA?.status, "searching");
  assert.equal(stateB?.status, "searching");

  const session = await Session.findOne().sort({ createdAt: -1 });
  assert.ok(session);
  assert.equal(session.status, "failed");
});

test("marks expired queued requests as timed out", async () => {
  const result = await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Easy",
  });
  assert.equal(result.matched, false);

  const requestId = await redis.get("match:user-request:user-a");
  assert.ok(requestId);
  await redis.hset(`match:request:${requestId}`, "timeoutAt", String(Date.now() - 1));
  await redis.zadd("match:timeouts", String(Date.now() - 1), requestId);

  const processed = await matchService.processDueTimeouts(Date.now());
  assert.equal(processed, 1);

  const state = await matchService.getUserState("user-a");
  assert.equal(state, null);
  assert.equal(eventBus.events.at(-1)?.event.status, "timed_out");
});

test("session completion releases the user for a new request", async () => {
  await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Arrays",
    difficulty: "Easy",
  });
  const result = await matchService.createRequest("user-b", "Bearer token-b", {
    topic: "Arrays",
    difficulty: "Easy",
  });
  assert.equal(result.matched, true);

  const completed = await matchService.completeSession(result.state.sessionId!);
  assert.ok(completed);
  assert.equal(completed.status, "completed");

  const newRequest = await matchService.createRequest("user-a", "Bearer token-a", {
    topic: "Dynamic Programming",
    difficulty: "Easy",
  });
  assert.equal(newRequest.state.status, "searching");
});
