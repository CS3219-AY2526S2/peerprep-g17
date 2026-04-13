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
  SessionQuestionSwitchBody,
} from "../types";
import { getSessionCode } from "../services/yjsUtils";

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

async function formatSessionResponseWithSharedCode(session: any) {
  let sharedCode = "";
  try {
    sharedCode = await getSessionCode(String(session.sessionId));
  } catch {
    sharedCode = "";
  }

  return {
    ...formatSessionResponse(session),
    sharedCode,
    sharedYjsState: session.yjsState
      ? Buffer.from(session.yjsState).toString("base64")
      : null,
  };
}

export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  updateAttemptReflection = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const { note, checked } = (req.body ?? {}) as {
      note?: string;
      checked?: boolean;
    };

    try {
      const updatedAttempt = await this.collaborationService.updateAttemptReflection(
        req.userId,
        String(req.params.attemptId),
        { note, checked },
      );

      if (!updatedAttempt) {
        res.status(404).json({ error: "Attempt not found." });
        return;
      }

      res.status(200).json({ data: updatedAttempt });
    } catch {
      res.status(500).json({ error: "Failed to save reflection note." });
    }
  };

  suggestAttemptImprovement = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const {
      questionTitle,
      questionDescription,
      difficulty,
      topics,
      language,
      userCode,
      verdict,
      passedCount,
      totalCount,
      firstFailingCase,
    } = (req.body ?? {}) as {
      questionTitle?: string;
      questionDescription?: string;
      difficulty?: string;
      topics?: string[];
      language?: string;
      userCode?: string;
      verdict?: string;
      passedCount?: number;
      totalCount?: number;
      firstFailingCase?: unknown;
    };

    if (!questionTitle?.trim()) {
      res.status(400).json({ error: "Question title is required." });
      return;
    }

    if (!userCode?.trim()) {
      res.status(400).json({ error: "Submitted code is required." });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

    if (!apiKey) {
      res.status(503).json({ error: "AI suggestion service is not configured." });
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
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content:
                "You are a supportive technical interview coach. Return valid JSON only with exactly these string keys: hint, improvementAreas, approach, solution, takeaway. Keep `hint` concise and avoid revealing the full answer. Put the complete answer only in `solution`. Tailor feedback to the student's submitted code and be honest but encouraging.",
            },
            {
              role: "user",
              content: JSON.stringify({
                questionTitle,
                questionDescription: questionDescription ?? "",
                difficulty: difficulty ?? "",
                topics: topics ?? [],
                language: language ?? "Python",
                userCode,
                verdict: verdict ?? null,
                passedCount: typeof passedCount === "number" ? passedCount : null,
                totalCount: typeof totalCount === "number" ? totalCount : null,
                firstFailingCase: firstFailingCase ?? null,
              }),
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
          error: result.error?.message || "OpenAI suggestion request failed.",
        });
        return;
      }

      const rawContent = result.choices?.[0]?.message?.content?.trim();
      if (!rawContent) {
        res.status(502).json({ error: "OpenAI did not return a suggestion." });
        return;
      }

      const normalized = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");

      const parsed = JSON.parse(normalized) as {
        hint?: unknown;
        improvementAreas?: unknown;
        approach?: unknown;
        solution?: unknown;
        takeaway?: unknown;
      };

      res.status(200).json({
        data: {
          hint:
            typeof parsed.hint === "string" && parsed.hint.trim()
              ? parsed.hint.trim()
              : "Review your data flow and edge cases before looking at the full answer.",
          improvementAreas:
            typeof parsed.improvementAreas === "string"
              ? parsed.improvementAreas.trim()
              : "",
          approach:
            typeof parsed.approach === "string" ? parsed.approach.trim() : "",
          solution:
            typeof parsed.solution === "string" ? parsed.solution.trim() : "",
          takeaway:
            typeof parsed.takeaway === "string" ? parsed.takeaway.trim() : "",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate suggestion.";
      res.status(502).json({ error: message });
    }
  };

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

  terminateSession = async (req: AuthRequest, res: Response): Promise<void> => {
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
    } catch {
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
    } catch {
      res.status(502).json({ error: "Failed to execute code." });
    }
  };

  runSessionCode = async (req: AuthRequest, res: Response): Promise<void> => {
    await this.handleSessionExecution("run", req, res);
  };

  submitSessionCode = async (req: AuthRequest, res: Response): Promise<void> => {
    await this.handleSessionExecution("submit", req, res);
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
          error: result.error?.message || "OpenAI explanation request failed.",
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

    await this.collaborationService.ensureSessionStarterCode(session);
    res.status(200).json({
      data: await formatSessionResponseWithSharedCode(session),
    });
  };

  switchSessionQuestion = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    try {
      const session = await this.collaborationService.switchSessionQuestion(
        String(req.params.sessionId),
        req.userId,
        req.body as SessionQuestionSwitchBody,
      );

      res.status(200).json({
        data: await formatSessionResponseWithSharedCode(session),
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
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
            : "Failed to switch collaboration question.",
      });
    }
  };

  completeSession = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const { code } = (req.body ?? {}) as { code?: string };

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
    } catch {
      res.status(500).json({ error: "Failed to fetch attempt history." });
    }
  };

  private handleSessionExecution = async (
    mode: "run" | "submit",
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    try {
      const result = await this.collaborationService.executeSessionCode(
        String(req.params.sessionId),
        req.userId,
        mode,
        req.body as ExecutionRequestBody,
      );
      res.status(200).json({ data: result });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : `Failed to ${mode} collaboration code.`,
      });
    }
  };
}
