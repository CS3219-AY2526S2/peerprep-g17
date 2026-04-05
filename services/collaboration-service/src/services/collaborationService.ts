import * as Y from "yjs";
import CollaborationSession, {
  ICollaborationSession,
} from "../models/CollaborationSession";
import Attempt from "../models/Attempt";
import { CollaborationSessionPayload } from "../types";
import { MatchingServiceClient } from "./matchingServiceClient";
import { docs } from "./yjsUtils";
import { IAttempt } from "../models/Attempt";

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

    await Attempt.findOneAndUpdate(
      { sessionId, userId },
      { ...attemptData, userId },
      { upsert: true, new: true }
    );

  const attemptCount = await Attempt.countDocuments({ sessionId });
  if (attemptCount >= 2) {
    try {
      await this.matchingServiceClient.completeSession(sessionId);
      session.completedAt = new Date();
      await session.save();
    } catch (err) {
      console.error(`[Collab] Failed to notify matching service:`, err);
    }
  }
  return session;
}
  async getAttemptHistory(userId: string): Promise<IAttempt[]> {
    return Attempt.find({ userId }).sort({ attemptedAt: -1 }).limit(50);
  }
}

