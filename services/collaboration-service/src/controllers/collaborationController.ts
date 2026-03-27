import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { CollaborationService } from "../services/collaborationService";
import { CollaborationSessionPayload, DIFFICULTIES } from "../types";

function formatSessionResponse(session: {
  sessionId: string;
  userAId: string;
  userBId: string;
  topic: string;
  difficulty: string;
  questionId: string;
  language: string;
  status: string;
  createdAt: Date;
  completedAt?: Date | null;
}) {
  return {
    sessionId: session.sessionId,
    userAId: session.userAId,
    userBId: session.userBId,
    topic: session.topic,
    difficulty: session.difficulty,
    questionId: session.questionId,
    language: session.language,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    completedAt: session.completedAt?.toISOString(),
  };
}

export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  handoffSession = async (req: Request, res: Response): Promise<void> => {
    const payload = req.body as Partial<CollaborationSessionPayload>;

    if (
      !payload.sessionId ||
      !payload.userAId ||
      !payload.userBId ||
      !payload.topic ||
      !payload.difficulty ||
      !payload.questionId ||
      !payload.language
    ) {
      res.status(400).json({ error: "All handoff fields are required." });
      return;
    }

    if (!DIFFICULTIES.includes(payload.difficulty)) {
      res.status(400).json({ error: "Invalid difficulty." });
      return;
    }

    if (payload.language !== "Python") {
      res.status(400).json({ error: "Invalid language." });
      return;
    }

    const session = await this.collaborationService.handoffSession(
      payload as CollaborationSessionPayload,
    );

    res.status(201).json({ data: formatSessionResponse(session) });
  };

  getSession = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const session = await this.collaborationService.getSessionForUser(
      String(req.params.sessionId),
      req.userId,
    );

    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }

    res.status(200).json({ data: formatSessionResponse(session) });
  };

  completeSession = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    try {
      const session = await this.collaborationService.completeSession(
        String(req.params.sessionId),
        req.userId,
      );

      if (!session) {
        res.status(404).json({ error: "Session not found." });
        return;
      }

      res.status(200).json({ data: formatSessionResponse(session) });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to complete collaboration session.";

      res.status(502).json({ error: message });
    }
  };
}
