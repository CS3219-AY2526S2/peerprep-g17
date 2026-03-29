import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { MatchService } from "../services/matchService";
import { DIFFICULTIES } from "../types";

export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId || !req.authHeader) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const { topic, difficulty } = req.body as {
      topic?: string;
      difficulty?: string;
    };

    if (!topic || !difficulty) {
      res.status(400).json({ error: "Topic and difficulty are required." });
      return;
    }

    if (!DIFFICULTIES.includes(difficulty as (typeof DIFFICULTIES)[number])) {
      res.status(400).json({ error: "Invalid difficulty." });
      return;
    }

    try {
      const result = await this.matchService.createRequest(req.userId, req.authHeader, {
        topic,
        difficulty: difficulty as (typeof DIFFICULTIES)[number],
      });

      res.status(result.matched ? 200 : 201).json({ data: result.state });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create match request.";

      if (message.includes("already has")) {
        res.status(409).json({ error: message });
        return;
      }

      if (message.includes("Invalid") || message.includes("required")) {
        res.status(400).json({ error: message });
        return;
      }

      res.status(502).json({ error: message });
    }
  };

 terminateMatch = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  try {
    await this.matchService.removeActiveSession(req.userId);
    res.status(200).json({ data: { message: "Match state cleared." } });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear match state." });
  }
};

  getMyRequestState = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const state = await this.matchService.getUserState(req.userId);
    if (!state) {
      res.status(404).json({ error: "No active matchmaking request or session." });
      return;
    }

    res.status(200).json({ data: state });
  };

  cancelMyRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const cancelled = await this.matchService.cancelRequest(req.userId);
    if (!cancelled) {
      res.status(404).json({ error: "No active matchmaking request found." });
      return;
    }

    res.status(200).json({ data: { message: "Matchmaking request cancelled." } });
  };

  completeSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const sessionId = String(req.params.sessionId);
    const session = await this.matchService.completeSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }

    res.status(200).json({
      data: {
        sessionId: session.sessionId,
        status: session.status,
        completedAt: session.completedAt?.toISOString(),
      },
    });
  };
}
