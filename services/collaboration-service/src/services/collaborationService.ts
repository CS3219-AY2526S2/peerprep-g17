import CollaborationSession, {
  ICollaborationSession,
} from "../models/CollaborationSession";
import { CollaborationSessionPayload } from "../types";
import { MatchingServiceClient } from "./matchingServiceClient";

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
    if (!session) {
      return null;
    }

    if (session.status === "completed") {
      return session;
    }

    await this.matchingServiceClient.completeSession(sessionId);
    session.status = "completed";
    session.completedAt = new Date();
    await session.save();

    return session;
  }
}
