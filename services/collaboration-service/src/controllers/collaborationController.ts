import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  CollaborationService,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../services/collaborationService";
import {
  CollaborationSessionPayload,
  DIFFICULTIES,
  ExecutionRequestBody,
} from "../types";
import SessionModel from "../models/CollaborationSession"; 
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
    starterCodeSeededAt: session.starterCodeSeededAt?.toISOString(),
    lastExecutionResult: session.lastExecutionResult || null,
    lastExecutionAt: session.lastExecutionAt?.toISOString(),
    lastSubmittedAt: session.lastSubmittedAt?.toISOString(),
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
      const { sessionId } = req.params;
      await SessionModel.deleteOne({ sessionId }); 
      res.status(200).json({ message: "Session ended." });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete session." });
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

  runCode = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    try {
      const result = await this.collaborationService.executeSessionCode(
        String(req.params.sessionId),
        req.userId,
        "run",
        req.body as ExecutionRequestBody,
      );
      res.status(200).json({ data: result });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(502).json({
        error:
          error instanceof Error ? error.message : "Failed to run submitted code.",
      });
    }
  };

  submitCode = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    try {
      const result = await this.collaborationService.executeSessionCode(
        String(req.params.sessionId),
        req.userId,
        "submit",
        req.body as ExecutionRequestBody,
      );
      res.status(200).json({ data: result });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit code to the judge.",
      });
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
    await this.collaborationService.ensureSessionStarterCode(session);
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
