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

  assistQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
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
      userPrompt,
      code,
      mode,
      verbosity,
      style,
    } = (req.body ?? {}) as {
      questionTitle?: string;
      questionDescription?: string;
      difficulty?: string;
      topics?: string[];
      language?: string;
      userPrompt?: string;
      code?: string;
      mode?:
        | "rephrase"
        | "beginner_explanation"
        | "test_case_generation"
        | "optimization_hint"
        | "brainstorm";
      verbosity?: "quick" | "detailed";
      style?: "concise_coach" | "teacher" | "beginner_friendly" | "interviewer";
    };

    if (!questionTitle?.trim()) {
      res.status(400).json({ error: "Question title is required." });
      return;
    }

    const allowedModes = new Set([
      "rephrase",
      "beginner_explanation",
      "test_case_generation",
      "optimization_hint",
      "brainstorm",
    ]);

    if (!mode || !allowedModes.has(mode)) {
      res.status(400).json({ error: "A valid AI assistance mode is required." });
      return;
    }

    const responseVerbosity = verbosity === "detailed" ? "detailed" : "quick";
    const responseStyle =
      style === "teacher" ||
      style === "beginner_friendly" ||
      style === "interviewer"
        ? style
        : "concise_coach";

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

    if (!apiKey) {
      res.status(503).json({ error: "AI question helper is not configured." });
      return;
    }

    const modeInstructions: Record<string, string> = {
      rephrase:
        "Rephrase the coding problem in simpler, more direct language. Preserve constraints and goal, but make it easier to understand quickly.",
      beginner_explanation:
        "Explain the problem like the student is a beginner. Clarify the goal, inputs, outputs, and one small example. Do not provide a full implementation unless explicitly requested.",
      test_case_generation:
        "Generate a compact set of useful test cases, including normal cases and edge cases. Prefer bullet points. When feasible, include expected outputs and explain why each case matters.",
      optimization_hint:
        "Give optimization-oriented hints and point out patterns or data structures that may help. Do not provide a full solution unless the user explicitly asks.",
      brainstorm:
        "Answer the student's question conversationally and clearly. Focus on helping them understand the problem or next step. Avoid giving a full solution unless explicitly requested.",
    };
    const styleInstructions: Record<string, string> = {
      concise_coach:
        "Use a concise coaching tone. Be direct, practical, and low-friction.",
      teacher:
        "Use a patient teacher tone. Explain in a guided, step-by-step way without sounding stiff.",
      beginner_friendly:
        "Use beginner-friendly language. Define terms briefly, avoid jargon where possible, and make the response feel approachable.",
      interviewer:
        "Use a light interview-coach tone. Nudge the student toward the key idea with hints and guiding questions before giving conclusions.",
    };

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
                "You are a collaborative coding tutor inside PeerPrep. Respond in concise markdown with short sections and bullets when helpful. Keep explanations supportive and practical. Unless the user explicitly asks for a full solution, do not provide complete code. " +
                (responseVerbosity === "quick"
                  ? "Default to quick-help format: at most 4 short bullets or 2 very short sections, under roughly 120 words, and prioritize immediate clarity over detail. "
                  : "Use a clearer but still skimmable format: short sections, at most 6 bullets total, and keep the answer under roughly 220 words unless necessary. ") +
                styleInstructions[responseStyle] +
                " " +
                modeInstructions[mode],
            },
            {
              role: "user",
              content: JSON.stringify({
                questionTitle,
                questionDescription: questionDescription ?? "",
                difficulty: difficulty ?? "",
                topics: topics ?? [],
                language: language ?? "Python",
                code: code?.trim() ? code : null,
                mode,
                verbosity: responseVerbosity,
                style: responseStyle,
                userPrompt: userPrompt?.trim() || null,
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
          error: result.error?.message || "OpenAI question helper request failed.",
        });
        return;
      }

      const answer = result.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        res.status(502).json({ error: "OpenAI did not return a question helper response." });
        return;
      }

      res.status(200).json({ data: { response: answer } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate question help.";
      res.status(502).json({ error: message });
    }
  };

  getAttemptedQuestionIdsForUsers = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const userIds = Array.isArray(req.body?.userIds)
      ? req.body.userIds.filter((value: unknown): value is string => typeof value === "string")
      : [];

    if (userIds.length === 0) {
      res.status(400).json({ error: "At least one user id is required." });
      return;
    }

    try {
      const questionIds = await this.collaborationService.getAttemptedQuestionIdsForUsers(
        userIds,
      );
      res.status(200).json({ data: { questionIds } });
    } catch {
      res.status(500).json({ error: "Failed to fetch attempted question ids." });
    }
  };

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

    const { code, verbosity, style } = req.body as {
      code?: string;
      verbosity?: "quick" | "detailed";
      style?: "concise_coach" | "teacher" | "beginner_friendly" | "interviewer";
    };

    if (!code?.trim()) {
      res.status(400).json({ error: "No code provided." });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
    const responseVerbosity = verbosity === "detailed" ? "detailed" : "quick";
    const responseStyle =
      style === "teacher" ||
      style === "beginner_friendly" ||
      style === "interviewer"
        ? style
        : "concise_coach";
    const explanationStyleInstructions: Record<string, string> = {
      concise_coach:
        "Use a concise coaching tone. Prioritize the key idea and one or two important observations.",
      teacher:
        "Use a teacher-like tone. Explain the code in a guided sequence, like you are teaching it live.",
      beginner_friendly:
        "Use beginner-friendly language. Briefly explain unfamiliar ideas and keep the wording approachable.",
      interviewer:
        "Use an interview-coach tone. Highlight what the code is doing and what a candidate should notice.",
    };

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
                "You explain code for students in clear markdown. Use short sections, bullet points when helpful, and wrap code identifiers in backticks. " +
                (responseVerbosity === "quick"
                  ? "Default to quick-help format: at most 4 short bullets or 2 tiny sections, under roughly 120 words, and focus on what the code is doing plus one key thing to notice."
                  : "Use a skimmable format with short sections, at most 6 bullets total, and keep the answer under roughly 220 words unless needed.") +
                " " +
                explanationStyleInstructions[responseStyle],
            },
            {
              role: "user",
              content: `Explain this code in ${responseVerbosity} mode with ${responseStyle} style:\n\n\`\`\`\n${code}\n\`\`\``,
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
