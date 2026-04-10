import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as Y from "yjs";
import CollaborationSession from "../models/CollaborationSession";
import Attempt from "../models/Attempt";
import { CollaborationService } from "../services/collaborationService";
import { docs } from "../services/yjsUtils";

class FakeMatchingServiceClient {
  public completedSessionIds: string[] = [];

  async completeSession(sessionId: string): Promise<void> {
    this.completedSessionIds.push(sessionId);
  }
}

let mongoServer: MongoMemoryServer;
let matchingServiceClient: FakeMatchingServiceClient;
let collaborationService: CollaborationService;

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
  docs.clear();
  matchingServiceClient = new FakeMatchingServiceClient();
  collaborationService = new CollaborationService(
    matchingServiceClient as unknown as never,
  );
});

test("completeSession prefers the submitted code and saves attempts for both participants", async () => {
  await CollaborationSession.create({
    sessionId: "session-1",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const session = await collaborationService.completeSession(
    "session-1",
    "user-a",
    "print('submitted')",
  );

  assert.ok(session);
  assert.equal(session.status, "completed");
  assert.deepEqual(matchingServiceClient.completedSessionIds, ["session-1"]);

  const attempts = await Attempt.find({ sessionId: "session-1" }).sort({ userId: 1 });
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0]?.userId, "user-a");
  assert.equal(attempts[0]?.code, "print('submitted')");
  assert.equal(attempts[1]?.userId, "user-b");
  assert.equal(attempts[1]?.code, "print('submitted')");
});

test("completeSession falls back to the in-memory Yjs doc and saves for both users", async () => {
  await CollaborationSession.create({
    sessionId: "session-2",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const doc = new Y.Doc();
  doc.getText("codemirror").insert(0, "print('from-doc')");
  docs.set("session-2", doc);

  await collaborationService.completeSession("session-2", "user-a");

  const attempts = await Attempt.find({ sessionId: "session-2" }).sort({ userId: 1 });
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0]?.code, "print('from-doc')");
  assert.equal(attempts[1]?.code, "print('from-doc')");
});

test("completeSession falls back to persisted Yjs state and saves for both users", async () => {
  const doc = new Y.Doc();
  doc.getText("codemirror").insert(0, "print('persisted-state')");
  const yjsState = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();

  await CollaborationSession.create({
    sessionId: "session-3",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
    yjsState,
  });

  await collaborationService.completeSession("session-3", "user-a");

  const attempts = await Attempt.find({ sessionId: "session-3" }).sort({ userId: 1 });
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0]?.code, "print('persisted-state')");
  assert.equal(attempts[1]?.code, "print('persisted-state')");
});

test("terminateSession completes the session without creating an attempt", async () => {
  await CollaborationSession.create({
    sessionId: "session-4",
    userAId: "user-a",
    userBId: "user-b",
    topic: "Arrays",
    difficulty: "Easy",
    questionId: "q-1",
    language: "Python",
    status: "active",
  });

  const session = await collaborationService.terminateSession("session-4", "user-b");

  assert.ok(session);
  assert.equal(session.status, "completed");
  assert.equal(matchingServiceClient.completedSessionIds.length, 0);

  const attempts = await Attempt.find({ sessionId: "session-4" });
  assert.equal(attempts.length, 0);
});

test("getAttemptHistory returns newest attempts first", async () => {
  await Attempt.create([
    {
      userId: "user-a",
      sessionId: "older-session",
      questionId: "q-1",
      topic: "Arrays",
      difficulty: "Easy",
      language: "Python",
      code: "print('older')",
      attemptedAt: new Date("2026-04-01T00:00:00.000Z"),
    },
    {
      userId: "user-a",
      sessionId: "newer-session",
      questionId: "q-2",
      topic: "Graphs",
      difficulty: "Medium",
      language: "Python",
      code: "print('newer')",
      attemptedAt: new Date("2026-04-02T00:00:00.000Z"),
    },
  ]);

  const attempts = await collaborationService.getAttemptHistory("user-a");

  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].sessionId, "newer-session");
  assert.equal(attempts[1].sessionId, "older-session");
});
