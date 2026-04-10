import * as Y from "yjs";
import CollaborationSession, {
  ICollaborationSession,
} from "../models/CollaborationSession";
import Attempt, { IAttempt } from "../models/Attempt";
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
    submittedCode?: string,
  ): Promise<ICollaborationSession | null> {
    const session = await this.getSessionForUser(sessionId, userId);
    if (!session) return null;

    const code = (submittedCode ?? "").trim()
      ? submittedCode
      : await this.resolveSessionCode(sessionId, session);

    await Attempt.findOneAndUpdate(
      { userId, sessionId },
      {
        userId,
        sessionId,
        questionId: session.questionId,
        topic: session.topic,
        difficulty: session.difficulty,
        language: session.language,
        code,
        attemptedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    if (session.status === "completed") {
      return session;
    }

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

  async terminateSession(
    sessionId: string,
    userId: string,
  ): Promise<ICollaborationSession | null> {
    const session = await this.getSessionForUser(sessionId, userId);
    if (!session) return null;
    if (session.status === "completed") return session;

    session.status = "completed";
    session.completedAt = new Date();
    await session.save();
    return session;
  }

  async getAttemptHistory(userId: string): Promise<IAttempt[]> {
    return Attempt.find({ userId }).sort({ attemptedAt: -1 }).limit(50);
  }

  private async resolveSessionCode(
    sessionId: string,
    session: ICollaborationSession,
  ): Promise<string> {
    try {
      const doc = docs.get(sessionId);
      if (doc) {
        return doc.getText("codemirror").toString();
      }

      if (session.yjsState) {
        const tempDoc = new Y.Doc();
        Y.applyUpdate(tempDoc, new Uint8Array(session.yjsState));
        const code = tempDoc.getText("codemirror").toString();
        tempDoc.destroy();
        return code;
      }
    } catch (_) {}

    return "";
  }
}
