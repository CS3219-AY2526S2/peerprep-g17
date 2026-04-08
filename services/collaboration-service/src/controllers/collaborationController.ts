import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { CollaborationService } from "../services/collaborationService";
import { CollaborationSessionPayload, DIFFICULTIES } from "../types";

function formatSessionResponse(session: any) {
  return {
    sessionId: session.sessionId,
    userAId: session.userAId,
    userBId: session.userBId,
    topic: session.topic,
    difficulty: session.difficulty,
    questionId: session.questionId,
    language: session.language,
    status: session.status,
    messages: session.messages || [], 
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

  terminateSession = async (req: AuthRequest, res: Response) => {
    try {
      const sessionId = String(req.params.sessionId);
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized." });
        return;
      }

      const session = await this.collaborationService.terminateSession(
        sessionId,
        req.userId,
      );

      if (!session) {
        res.status(404).json({ error: "Session not found." });
        return;
      }

      res.status(200).json({ data: formatSessionResponse(session) });
    } catch (error) {
      res.status(500).json({ error: "Failed to end session." });
    }
  };

  executeCode = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const { code, language = "python", version = "3.10.0" } = req.body as {
      code?: string;
      language?: string;
      version?: string;
    };

    if (!code?.trim()) {
      res.status(400).json({ error: "No code provided." });
      return;
    }

    try {
      const pistonUrl = process.env.PISTON_URL || "http://localhost:2000";
      const response = await fetch(`${pistonUrl}/api/v2/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          version,
          files: [{ content: code }],
        }),
      });
      if (!response.ok) {
        res.status(502).json({ error: "Code execution service unavailable." });
        return;
      }
      const result = await response.json();
      res.status(200).json({ data: result });
    } catch (error) {
      res.status(502).json({ error: "Failed to execute code." });
    }
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

    const { code } = req.body as {
      code?: string;
    };

    try {
      const session = await this.collaborationService.completeSession(
        String(req.params.sessionId),
        req.userId,
        code,
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

  getAttemptHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const attempts = await this.collaborationService.getAttemptHistory(req.userId);
      res.status(200).json({ data: attempts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attempt history." });
    }
  };
}
