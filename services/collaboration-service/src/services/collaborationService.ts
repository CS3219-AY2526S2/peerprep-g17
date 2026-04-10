import * as Y from "yjs";
import CollaborationSession, {
  ICollaborationSession,
} from "../models/CollaborationSession";
import Attempt, { IAttempt } from "../models/Attempt";
import {
  CollaborationSessionPayload,
  ExecutionRequestBody,
  ExecutionResult,
  ExecutionResultMode,
  SessionQuestionSwitchBody,
} from "../types";
import { MatchingServiceClient } from "./matchingServiceClient";
import { QuestionServiceClient } from "./questionServiceClient";
import { ExecutionService } from "./executionService";
import {
  docs,
  ensureStarterCode,
  getSessionCode,
  replaceSessionCode,
} from "./yjsUtils";
import { sessionSocketManager } from "./sessionSocketManager";
import { config } from "../config";

class NotFoundError extends Error {}
class ConflictError extends Error {}
class ValidationError extends Error {}

const sessionExecutionLocks = new Set<string>();

function findFirstFailingCase(result: ExecutionResult) {
  return result.cases.find((testCase) => testCase.verdict !== "Accepted") || null;
}

function broadcastSessionCompletion(
  sessionId: string,
  completedByUserId: string,
  outcome: "submitted" | "ended",
  completedAt: Date,
): void {
  sessionSocketManager.broadcastToSession(sessionId, {
    type: "session_completed",
    payload: {
      sessionId,
      completedByUserId,
      outcome,
      completedAt: completedAt.toISOString(),
    },
  });
}

export class CollaborationService {
  constructor(
    private readonly matchingServiceClient: MatchingServiceClient,
    private readonly questionServiceClient: QuestionServiceClient = new QuestionServiceClient(),
    private readonly executionService: ExecutionService = new ExecutionService(),
  ) {}

  async handoffSession(
    payload: CollaborationSessionPayload,
  ): Promise<ICollaborationSession> {
    const session = await CollaborationSession.findOneAndUpdate(
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

    const question = await this.questionServiceClient.getQuestionJudge(
      payload.questionId,
    );

    if (question.starterCode?.python?.trim()) {
      const seeded = await ensureStarterCode(
        payload.sessionId,
        question.starterCode.python,
      );

      if (seeded || !session.starterCodeSeededAt) {
        session.starterCodeSeededAt = new Date();
        await session.save();
      }
    }

    return session;
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

  async ensureSessionStarterCode(
    session: ICollaborationSession,
  ): Promise<void> {
    const question = await this.questionServiceClient.getQuestionJudge(
      session.questionId,
    );

    if (!question.starterCode?.python?.trim()) {
      return;
    }

    const seeded = await ensureStarterCode(
      session.sessionId,
      question.starterCode.python,
    );

    if (seeded || !session.starterCodeSeededAt) {
      session.starterCodeSeededAt = new Date();
      await session.save();
    }
  }

  async executeSessionCode(
    sessionId: string,
    userId: string,
    mode: ExecutionResultMode,
    body: ExecutionRequestBody,
  ): Promise<ExecutionResult> {
    const session = await this.getSessionForUser(sessionId, userId);
    if (!session) {
      throw new NotFoundError("Session not found.");
    }

    const code = String(body.code || "");
    if (!code.trim()) {
      throw new ValidationError("No code provided.");
    }

    if (
      Buffer.byteLength(code, "utf8") > config.executionSourceSizeLimitBytes
    ) {
      throw new ValidationError("Submitted code exceeds the maximum size limit.");
    }

    if (sessionExecutionLocks.has(sessionId)) {
      throw new ConflictError(
        "An execution is already running for this collaboration session.",
      );
    }

    sessionExecutionLocks.add(sessionId);
    const startedAt = new Date().toISOString();
    sessionSocketManager.broadcastToSession(sessionId, {
      type: "execution_started",
      payload: {
        mode,
        initiatedByUserId: userId,
        initiatedAt: startedAt,
      },
    });

    try {
      const question = await this.questionServiceClient.getQuestionJudge(
        session.questionId,
      );
      const result = await this.executionService.execute(
        question,
        code,
        mode,
        userId,
        body.customTestCase,
      );

      session.lastExecutionResult = result;
      session.lastExecutionAt = new Date(result.initiatedAt);
      if (mode === "submit") {
        session.lastSubmittedAt = new Date(result.initiatedAt);
      }
      await session.save();

      if (mode === "submit") {
        await Attempt.create({
          userId,
          sessionId,
          questionId: session.questionId,
          topic: session.topic,
          difficulty: session.difficulty,
          language: session.language,
          code,
          attemptedAt: new Date(),
          mode: "submit",
          verdict: result.verdict,
          passedCount: result.passedCount,
          totalCount: result.totalCount,
          runtimeMs: result.runtimeMs,
          memoryKb: result.memoryKb,
          executionMode: result.executionMode,
          firstFailingCase: findFirstFailingCase(result),
          submittedAt: new Date(result.initiatedAt),
        });
      }

      sessionSocketManager.broadcastToSession(sessionId, {
        type: "execution_result",
        payload: result,
      });

      return result;
    } finally {
      sessionExecutionLocks.delete(sessionId);
    }
  }

  async switchSessionQuestion(
    sessionId: string,
    userId: string,
    body: SessionQuestionSwitchBody,
  ): Promise<ICollaborationSession> {
    const session = await this.getSessionForUser(sessionId, userId);
    if (!session) {
      throw new NotFoundError("Session not found.");
    }

    const questionId = String(body.questionId || "").trim();
    if (!questionId) {
      throw new ValidationError("A questionId is required.");
    }

    const question = await this.questionServiceClient.getQuestion(questionId);
    if (question.executionMode === "unsupported") {
      throw new ValidationError(
        "That question is not runnable in the collaboration judge yet.",
      );
    }

    session.questionId = question.id;
    if (question.difficulty && session.difficulty !== question.difficulty) {
      session.difficulty = question.difficulty;
    }

    if (Array.isArray(question.categories) && question.categories.length > 0) {
      session.topic = question.categories[0];
    }

    session.lastExecutionResult = null;
    session.lastExecutionAt = null;
    session.lastSubmittedAt = null;
    session.starterCodeSeededAt = new Date();

    await replaceSessionCode(session.sessionId, question.starterCode?.python || "");
    await session.save();

    sessionSocketManager.broadcastToSession(sessionId, {
      type: "question_switched",
      payload: {
        sessionId: session.sessionId,
        questionId: session.questionId,
        topic: session.topic,
        difficulty: session.difficulty,
        starterCodeSeededAt: session.starterCodeSeededAt.toISOString(),
      },
    });

    return session;
  }

  async completeSession(
    sessionId: string,
    userId: string,
    submittedCode?: string,
  ): Promise<ICollaborationSession | null> {
    const session = await this.getSessionForUser(sessionId, userId);
    if (!session) {
      return null;
    }

    const code = (submittedCode ?? "").trim()
      ? submittedCode
      : await this.resolveSessionCode(sessionId, session);

    const lastSubmit =
      session.lastExecutionResult?.mode === "submit"
        ? session.lastExecutionResult
        : null;

    await Attempt.findOneAndUpdate(
      { userId, sessionId, mode: "session_complete" },
      {
        userId,
        sessionId,
        questionId: session.questionId,
        topic: session.topic,
        difficulty: session.difficulty,
        language: session.language,
        code,
        attemptedAt: new Date(),
        mode: "session_complete",
        verdict: lastSubmit?.verdict,
        passedCount: lastSubmit?.passedCount,
        totalCount: lastSubmit?.totalCount,
        runtimeMs: lastSubmit?.runtimeMs,
        memoryKb: lastSubmit?.memoryKb,
        executionMode: lastSubmit?.executionMode,
        firstFailingCase: lastSubmit ? findFirstFailingCase(lastSubmit) : null,
        submittedAt: session.lastSubmittedAt || null,
      },
      {
        upsert: true,
        returnDocument: "after",
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
    broadcastSessionCompletion(
      sessionId,
      userId,
      "submitted",
      session.completedAt,
    );
    return session;
  }

  async terminateSession(
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

    session.status = "completed";
    session.completedAt = new Date();
    await session.save();
    broadcastSessionCompletion(sessionId, userId, "ended", session.completedAt);
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
      const liveCode = docs.get(sessionId);
      if (liveCode) {
        return liveCode.getText("codemirror").toString();
      }

      const yjsCode = await getSessionCode(sessionId);
      if (yjsCode.trim()) {
        return yjsCode;
      }

      if (session.yjsState) {
        const tempDoc = new Y.Doc();
        Y.applyUpdate(tempDoc, new Uint8Array(session.yjsState));
        const persistedCode = tempDoc.getText("codemirror").toString();
        tempDoc.destroy();
        return persistedCode;
      }
    } catch {
      // Fall through to the empty string return below.
    }

    return "";
  }
}

export { ConflictError, NotFoundError, ValidationError };
