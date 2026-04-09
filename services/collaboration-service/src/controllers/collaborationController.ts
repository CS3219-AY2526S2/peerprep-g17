import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { CollaborationService } from "../services/collaborationService";
import { CollaborationSessionPayload, DIFFICULTIES } from "../types";
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

  explainCode = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const { code } = req.body as { code?: string };

    if (!code?.trim()) {
      res.status(400).json({ error: "No code provided." });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

    if (!apiKey) {
      res.status(503).json({ error: "AI explanation service is not configured." });
      return;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You explain code for students in clear markdown. Use short sections, bullet points when helpful, and wrap code identifiers in backticks. Keep the explanation concise but useful.",
            },
            {
              role: "user",
              content: `Explain this code:\n\n\`\`\`\n${code}\n\`\`\``,
            },
          ],
        }),
      });

      const result = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      if (!response.ok) {
        res.status(502).json({
          error:
            result.error?.message || "OpenAI explanation request failed.",
        });
        return;
      }

      const explanation = result.choices?.[0]?.message?.content?.trim();

      if (!explanation) {
        res.status(502).json({ error: "OpenAI did not return an explanation." });
        return;
      }

      res.status(200).json({ data: { explanation } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate explanation.";
      res.status(502).json({ error: message });
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
