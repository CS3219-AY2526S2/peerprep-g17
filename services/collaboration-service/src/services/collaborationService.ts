import * as Y from "yjs";
import CollaborationSession, {
  ICollaborationSession,
} from "../models/CollaborationSession";
import Attempt from "../models/Attempt";
import { CollaborationSessionPayload } from "../types";
import { MatchingServiceClient } from "./matchingServiceClient";
import { docs } from "./yjsUtils";

export class CollaborationService {
  constructor(
    private readonly matchingServiceClient: MatchingServiceClient,
  ) {}

  async handoffSession(
    payload: CollaborationSessionPayload,
  ): Promise<ICollaborationSession> {
    return CollaborationSession.findOneAndUpdate(
      { sessionId: payload.sessionId },
      {
        ...payload,
        status: "active",
        completedAt: null,
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  async getSessionForUser(
    sessionId: string,
    userId: string,
  ): Promise<ICollaborationSession | null> {
    return CollaborationSession.findOne({
      sessionId,
      $or: [{ userAId: userId }, { userBId: userId }],
    });
  }

  async completeSession(
    sessionId: string,
    userId: string,
  ): Promise<ICollaborationSession | null> {
    const session = await this.getSessionForUser(sessionId, userId);
    if (!session) return null;
    if (session.status === "completed") return session;
    let code = "";
    try {
      const doc = docs.get(sessionId);
      if (doc) {
        code = doc.getText("codemirror").toString();
      } else if (session.yjsState) {
        const tempDoc = new Y.Doc();
        Y.applyUpdate(tempDoc, new Uint8Array(session.yjsState));
        code = tempDoc.getText("codemirror").toString();
        tempDoc.destroy();
      }
    } catch (_) {}

    const attemptData = {
      sessionId,
      questionId: session.questionId,
      topic: session.topic,
      difficulty: session.difficulty,
      language: session.language,
      code,
      attemptedAt: new Date(),
    };

    await Attempt.insertMany([
      { ...attemptData, userId: session.userAId },
      { ...attemptData, userId: session.userBId },
    ]);

    try {
      await this.matchingServiceClient.completeSession(sessionId);
      console.log(`[Collab] Notified matching service for session ${sessionId}`);
    } catch (err) {
      console.error(`[Collab] Failed to notify matching service:`, err);
    }
    session.status = "completed";
    session.completedAt = new Date();
    await session.save();
    return session;
  }
  async getAttemptHistory(userId: string): Promise<IAttempt[]> {
    return Attempt.find({ userId }).sort({ attemptedAt: -1 }).limit(50);
  }
}

import { IAttempt } from "../models/Attempt";