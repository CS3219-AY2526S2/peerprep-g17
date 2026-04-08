import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import Session, { ISession } from "../models/Session";
import {
  Difficulty,
  DIFFICULTIES,
  MatchCandidateResult,
  MatchRequestInput,
  MatchStateResponse,
  MatchStatusEvent,
  RequestRecord,
  SelectedQuestion,
} from "../types";
import { config } from "../config";
import {
  bucketLockKey,
  queueKey,
  queueSequenceKey,
  relaxationRecentPartnerZsetKey,
  relaxationT1ZsetKey,
  relaxationT2ZsetKey,
  requestKey,
  timeoutZsetKey,
  userLockKey,
  userRequestKey,
} from "./redisKeys";
import { LockService } from "./lockService";
import { QuestionCatalogService } from "./questionCatalogService";
import { CollaborationClient } from "./collaborationClient";
import { RedisMatchEventBus } from "./redisEventBus";

const ACTIVE_SESSION_STATUSES = ["pending_handoff", "active"] as const;

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

function difficultyDistance(left: Difficulty, right: Difficulty): number {
  return Math.abs(DIFFICULTY_RANK[left] - DIFFICULTY_RANK[right]);
}

function getAllowedDistance(elapsedMs: number): number {
  if (elapsedMs >= config.relaxationT2Ms) {
    return 2;
  }

  if (elapsedMs >= config.relaxationT1Ms) {
    return 1;
  }

  return 0;
}

function buildSearchingState(request: RequestRecord): MatchStateResponse {
  return {
    status: "searching",
    requestId: request.id,
    topic: request.topic,
    difficulty: request.difficulty,
    remainingMs: Math.max(0, request.timeoutAt - Date.now()),
  };
}

function buildMatchedState(
  requestId: string,
  session: ISession,
  currentUserId: string,
): MatchStateResponse {
  const partnerUserId =
    session.userAId === currentUserId ? session.userBId : session.userAId;

  return {
    status: "matched",
    requestId,
    sessionId: session.sessionId,
    partnerUserId,
    topic: session.topic,
    difficulty: session.difficulty,
    questionId: session.questionId,
  };
}

function parseBoolean(value?: string): boolean {
  return value === "1";
}

function buildQueueMember(queueSequence: number, requestId: string): string {
  return `${String(queueSequence).padStart(20, "0")}:${requestId}`;
}

function parseRequestIdFromQueueMember(queueMember: string): string {
  const separatorIndex = queueMember.indexOf(":");
  return separatorIndex === -1
    ? queueMember
    : queueMember.slice(separatorIndex + 1);
}

function parseRequestRecord(
  requestId: string,
  raw: Record<string, string>,
): RequestRecord | null {
  if (
    !raw.userId ||
    !raw.topic ||
    !raw.difficulty ||
    !raw.createdAt ||
    !raw.queueScore ||
    !raw.queueSequence ||
    !raw.queueMember
  ) {
    return null;
  }

  return {
    id: requestId,
    userId: raw.userId,
    topic: raw.topic,
    difficulty: raw.difficulty as Difficulty,
    createdAt: Number(raw.createdAt),
    queueScore: Number(raw.queueScore),
    queueSequence: Number(raw.queueSequence),
    queueMember: raw.queueMember,
    timeoutAt: Number(raw.timeoutAt),
    t1At: Number(raw.t1At),
    t2At: Number(raw.t2At),
    recentPartnerAt: Number(raw.recentPartnerAt || 0),
    status: raw.status as RequestRecord["status"],
    sessionId: raw.sessionId || "",
    cancelRequested: parseBoolean(raw.cancelRequested),
    authHeader: raw.authHeader || "",
  };
}

function serializeRequestRecord(
  request: RequestRecord,
): Record<string, string> {
  return {
    userId: request.userId,
    topic: request.topic,
    difficulty: request.difficulty,
    createdAt: String(request.createdAt),
    queueScore: String(request.queueScore),
    queueSequence: String(request.queueSequence),
    queueMember: request.queueMember,
    timeoutAt: String(request.timeoutAt),
    t1At: String(request.t1At),
    t2At: String(request.t2At),
    recentPartnerAt: String(request.recentPartnerAt),
    status: request.status,
    sessionId: request.sessionId,
    cancelRequested: request.cancelRequested ? "1" : "0",
    authHeader: request.authHeader,
  };
}

function getBucketOrder(difficulty: Difficulty): Difficulty[] {
  return [...DIFFICULTIES].sort((left, right) => {
    const leftDistance = difficultyDistance(left, difficulty);
    const rightDistance = difficultyDistance(right, difficulty);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return DIFFICULTY_RANK[left] - DIFFICULTY_RANK[right];
  });
}

async function isUserInActiveSession(userId: string): Promise<boolean> {
  const existingSession = await Session.exists({
    status: { $in: ACTIVE_SESSION_STATUSES },
    $or: [{ userAId: userId }, { userBId: userId }],
  });

  return Boolean(existingSession);
}

export class MatchService {
  constructor(
    private readonly redis: Redis,
    private readonly lockService: LockService,
    private readonly questionCatalogService: QuestionCatalogService,
    private readonly collaborationClient: CollaborationClient,
    private readonly eventBus: RedisMatchEventBus,
  ) {}

  async createRequest(
    userId: string,
    authHeader: string,
    input: MatchRequestInput,
  ): Promise<MatchCandidateResult> {
    const userLock = await this.lockService.acquire(userLockKey(userId));
    if (!userLock) {
      throw new Error("Unable to acquire user lock.");
    }

    try {
      const topic = String(input.topic || "").trim();
      const difficulty = input.difficulty;

      if (!topic || !difficulty) {
        throw new Error("Topic and difficulty are required.");
      }

      if (!DIFFICULTIES.includes(difficulty)) {
        throw new Error("Invalid difficulty.");
      }

      const validTopic = await this.questionCatalogService.validateTopic(
        authHeader,
        topic,
      );
      if (!validTopic) {
        throw new Error("Invalid topic.");
      }

      const existingRequestId = await this.redis.get(userRequestKey(userId));
      if (existingRequestId) {
        throw new Error(
          "User already has an active matchmaking request or provisional match.",
        );
      }

      if (await isUserInActiveSession(userId)) {
        throw new Error("User already has an active collaboration session.");
      }

      const now = Date.now();
      const queueSequence = await this.redis.incr(queueSequenceKey);
      const requestId = randomUUID();
      const request: RequestRecord = {
        id: requestId,
        userId,
        topic,
        difficulty,
        createdAt: now,
        queueScore: now,
        queueSequence,
        queueMember: buildQueueMember(queueSequence, requestId),
        timeoutAt: now + config.matchRequestTimeoutMs,
        t1At: now + config.relaxationT1Ms,
        t2At: now + config.relaxationT2Ms,
        recentPartnerAt: now + config.recentPartnerRelaxationMs,
        status: "searching",
        sessionId: "",
        cancelRequested: false,
        authHeader,
      };

      await this.persistRequest(request);

      const matchedState = await this.tryMatchRequest(request, authHeader);
      if (matchedState) {
        return { matched: true, state: matchedState };
      }

      await this.enqueueRequest(request);
      await this.publishStatus(userId, buildSearchingState(request));

      return { matched: false, state: buildSearchingState(request) };
    } finally {
      await this.lockService.release(userLock);
    }
  }

  async getUserState(userId: string): Promise<MatchStateResponse | null> {
    const activeRequestId = await this.redis.get(userRequestKey(userId));
    if (activeRequestId) {
      const request = await this.getRequest(activeRequestId);
      if (request) {
        return buildSearchingState(request);
      }
    }

    const activeSession = await Session.findOne({
      status: { $in: ACTIVE_SESSION_STATUSES },
      $or: [{ userAId: userId }, { userBId: userId }],
    }).sort({ createdAt: -1 });

    if (!activeSession) {
      return null;
    }

    return buildMatchedState(activeSession.sessionId, activeSession, userId);
  }

 async removeActiveSession(userId: string): Promise<void> {
  await Session.deleteMany({
    status: { $in: ACTIVE_SESSION_STATUSES },
    $or: [{ userAId: userId }, { userBId: userId }],
  });
  await this.redis.del(userRequestKey(userId));
}

  async cancelRequest(userId: string): Promise<boolean> {
    const userLock = await this.lockService.acquire(userLockKey(userId));
    if (!userLock) {
      throw new Error("Unable to acquire user lock.");
    }

    try {
      const activeRequestId = await this.redis.get(userRequestKey(userId));
      if (!activeRequestId) {
        return false;
      }

      const request = await this.getRequest(activeRequestId);
      if (!request) {
        await this.cleanupRequest(activeRequestId, userId);
        return false;
      }

      if (request.status === "matching") {
        await this.redis.hset(requestKey(request.id), "cancelRequested", "1");
        return true;
      }

      await this.removeRequestFromQueue(request);
      await this.cleanupRequest(request.id, request.userId);
      await this.publishStatus(request.userId, {
        status: "cancelled",
        requestId: request.id,
        topic: request.topic,
        difficulty: request.difficulty,
      });

      return true;
    } finally {
      await this.lockService.release(userLock);
    }
  }

  async completeSession(sessionId: string): Promise<ISession | null> {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return null;
    }

    session.status = "completed";
    session.completedAt = new Date();
    await session.save();

    return session;
  }

  async processDueTimeouts(now = Date.now()): Promise<number> {
    const requestIds = await this.redis.zrangebyscore(
      timeoutZsetKey,
      0,
      now,
      "LIMIT",
      0,
      100,
    );

    let processed = 0;

    for (const requestId of requestIds) {
      const request = await this.getRequest(requestId);
      if (!request) {
        await this.removeRequestIndexes(requestId, undefined);
        continue;
      }

      if (request.status !== "searching" || request.timeoutAt > now) {
        continue;
      }

      const userLock = await this.lockService.acquire(
        userLockKey(request.userId),
      );
      if (!userLock) {
        continue;
      }

      try {
        const fresh = await this.getRequest(requestId);
        if (!fresh || fresh.status !== "searching" || fresh.timeoutAt > now) {
          continue;
        }

        await this.removeRequestFromQueue(fresh);
        await this.cleanupRequest(fresh.id, fresh.userId);
        await this.publishStatus(fresh.userId, {
          status: "timed_out",
          requestId: fresh.id,
          topic: fresh.topic,
          difficulty: fresh.difficulty,
        });
        processed += 1;
      } finally {
        await this.lockService.release(userLock);
      }
    }

    return processed;
  }

  async processDueRelaxations(now = Date.now()): Promise<number> {
    let matched = 0;
    matched += await this.processRelaxationTier(relaxationT1ZsetKey, now);
    matched += await this.processRelaxationTier(relaxationT2ZsetKey, now);
    matched += await this.processRelaxationTier(
      relaxationRecentPartnerZsetKey,
      now,
    );
    return matched;
  }

  private async processRelaxationTier(
    zsetKey: string,
    now: number,
  ): Promise<number> {
    const requestIds = await this.redis.zrangebyscore(
      zsetKey,
      0,
      now,
      "LIMIT",
      0,
      50,
    );

    let matched = 0;

    for (const requestId of requestIds) {
      const removed = await this.redis.zrem(zsetKey, requestId);
      if (!removed) {
        continue;
      }

      const request = await this.getRequest(requestId);
      if (!request || request.status !== "searching") {
        continue;
      }

      const userLock = await this.lockService.acquire(
        userLockKey(request.userId),
      );
      if (!userLock) {
        continue;
      }

      try {
        const fresh = await this.getRequest(requestId);
        if (!fresh || fresh.status !== "searching") {
          continue;
        }

        await this.removeRequestFromQueue(fresh);

        const matchedState = await this.tryMatchRequest(
          fresh,
          fresh.authHeader,
        );

        if (matchedState) {
          matched += 1;
        } else {
          await this.enqueueRequest(fresh);
        }
      } finally {
        await this.lockService.release(userLock);
      }
    }

    return matched;
  }

  async markUserDisconnected(userId: string): Promise<void> {
    const userLock = await this.lockService.acquire(userLockKey(userId));
    if (!userLock) {
      return;
    }

    try {
      const activeRequestId = await this.redis.get(userRequestKey(userId));
      if (!activeRequestId) {
        return;
      }

      const request = await this.getRequest(activeRequestId);
      if (!request) {
        await this.cleanupRequest(activeRequestId, userId);
        return;
      }

      if (request.status === "matching") {
        await this.redis.hset(requestKey(request.id), "cancelRequested", "1");
        return;
      }

      await this.removeRequestFromQueue(request);
      await this.cleanupRequest(request.id, request.userId);
      await this.publishStatus(request.userId, {
        status: "cancelled",
        requestId: request.id,
        topic: request.topic,
        difficulty: request.difficulty,
      });
    } finally {
      await this.lockService.release(userLock);
    }
  }

  private async persistRequest(request: RequestRecord): Promise<void> {
    const multi = this.redis.multi();
    multi.hmset(requestKey(request.id), serializeRequestRecord(request));
    multi.set(userRequestKey(request.userId), request.id);
    multi.zadd(timeoutZsetKey, String(request.timeoutAt), request.id);
    multi.zadd(relaxationT1ZsetKey, String(request.t1At), request.id);
    multi.zadd(relaxationT2ZsetKey, String(request.t2At), request.id);
    multi.zadd(
      relaxationRecentPartnerZsetKey,
      String(request.recentPartnerAt),
      request.id,
    );
    await multi.exec();
  }

  private async enqueueRequest(request: RequestRecord): Promise<void> {
    await this.redis.zadd(
      queueKey(request.topic, request.difficulty),
      String(request.queueScore),
      request.queueMember,
    );
  }

  private async getRequest(requestId: string): Promise<RequestRecord | null> {
    const raw = await this.redis.hgetall(requestKey(requestId));
    if (Object.keys(raw).length === 0) {
      return null;
    }

    return parseRequestRecord(requestId, raw);
  }

  private async tryMatchRequest(
    requester: RequestRecord,
    authHeader: string,
  ): Promise<MatchStateResponse | null> {
    const recentPartnerId = await this.getMostRecentPartnerId(requester.userId);
    const bucketOrder = getBucketOrder(requester.difficulty);

    for (const bucketDifficulty of bucketOrder) {
      const bucketLock = await this.lockService.acquire(
        bucketLockKey(requester.topic, bucketDifficulty),
      );
      if (!bucketLock) {
        continue;
      }

      try {
        const candidate = await this.consumeEligibleHeadCandidate(
          requester,
          bucketDifficulty,
          recentPartnerId,
        );

        if (!candidate) {
          continue;
        }

        const matchedState = await this.completeProvisionalMatch(
          requester,
          candidate,
          authHeader,
        );

        if (matchedState) {
          return matchedState;
        }
      } finally {
        await this.lockService.release(bucketLock);
      }
    }

    return null;
  }

  private async consumeEligibleHeadCandidate(
    requester: RequestRecord,
    bucketDifficulty: Difficulty,
    recentPartnerId: string | null,
  ): Promise<RequestRecord | null> {
    while (true) {
      const bucket = queueKey(requester.topic, bucketDifficulty);
      const [headQueueMember] = await this.redis.zrange(bucket, 0, 0);
      if (!headQueueMember) {
        return null;
      }
      const headRequestId = parseRequestIdFromQueueMember(headQueueMember);

      const candidate = await this.getRequest(headRequestId);
      if (!candidate || candidate.status !== "searching") {
        await this.redis.zrem(bucket, headQueueMember);
        continue;
      }

      if (candidate.userId === requester.userId) {
        return null;
      }

      const elapsedRequesterMs = Date.now() - requester.createdAt;
      const elapsedCandidateMs = Date.now() - candidate.createdAt;
      const requiredDistance = difficultyDistance(
        requester.difficulty,
        candidate.difficulty,
      );
      const allowedDistance = Math.max(
        getAllowedDistance(elapsedRequesterMs),
        getAllowedDistance(elapsedCandidateMs),
      );
      const recentPartnerRelaxed =
        Date.now() >=
        Math.min(requester.recentPartnerAt, candidate.recentPartnerAt);

      if (
        recentPartnerId &&
        candidate.userId === recentPartnerId &&
        !recentPartnerRelaxed
      ) {
        return null;
      }

      if (requiredDistance > allowedDistance) {
        return null;
      }

      const candidateUserLock = await this.lockService.acquire(
        userLockKey(candidate.userId),
      );
      if (!candidateUserLock) {
        return null;
      }

      try {
        const freshCandidate = await this.getRequest(candidate.id);
        const [freshHead] = await this.redis.zrange(bucket, 0, 0);
        if (
          !freshCandidate ||
          freshCandidate.status !== "searching" ||
          freshHead !== candidate.queueMember
        ) {
          continue;
        }

        await this.redis.zrem(bucket, candidate.queueMember);
        freshCandidate.status = "matching";
        await this.redis.hmset(
          requestKey(freshCandidate.id),
          serializeRequestRecord(freshCandidate),
        );
        return freshCandidate;
      } finally {
        await this.lockService.release(candidateUserLock);
      }
    }
  }

  private async completeProvisionalMatch(
    requester: RequestRecord,
    candidate: RequestRecord,
    authHeader: string,
  ): Promise<MatchStateResponse | null> {
    const sessionId = randomUUID();

    requester.status = "matching";
    requester.sessionId = sessionId;
    candidate.sessionId = sessionId;

    await this.redis.hmset(requestKey(requester.id), serializeRequestRecord(requester));
    await this.redis.hmset(requestKey(candidate.id), serializeRequestRecord(candidate));

    const session = await Session.create({
      sessionId,
      userAId: candidate.userId,
      userBId: requester.userId,
      topic: requester.topic,
      difficulty: requester.difficulty,
      questionId: "",
      status: "pending_handoff",
    });

    try {
      const selectedQuestion = await this.questionCatalogService.selectQuestion(
        authHeader,
        requester.topic,
        requester.difficulty,
      );

      if (!selectedQuestion) {
        throw new Error("No suitable question found for matched topic.");
      }

      if (await this.anyCancelRequested(requester.id, candidate.id)) {
        throw new Error("Match cancelled before commit.");
      }

      session.questionId = selectedQuestion.id;
      await session.save();

      await this.collaborationClient.handoffMatch({
        sessionId,
        userAId: candidate.userId,
        userBId: requester.userId,
        topic: requester.topic,
        difficulty: requester.difficulty,
        questionId: selectedQuestion.id,
        language: "Python",
      });

      if (await this.anyCancelRequested(requester.id, candidate.id)) {
        throw new Error("Match cancelled before commit.");
      }

      session.status = "active";
      await session.save();

      await this.cleanupRequest(requester.id, requester.userId);
      await this.cleanupRequest(candidate.id, candidate.userId);

      const requesterState = buildMatchedState(requester.id, session, requester.userId);
      const candidateState = buildMatchedState(candidate.id, session, candidate.userId);

      await this.publishStatus(requester.userId, requesterState);
      await this.publishStatus(candidate.userId, candidateState);

      return requesterState;
    } catch (error) {
      const cancelled = await this.anyCancelRequested(requester.id, candidate.id);
      session.status = cancelled ? "cancelled" : "failed";
      await session.save();

      await this.rollbackProvisionalMatch(requester, candidate);
      return null;
    }
  }

  private async rollbackProvisionalMatch(
    requester: RequestRecord,
    candidate: RequestRecord,
  ): Promise<void> {
    const requests = [requester, candidate];

    for (const request of requests) {
      const current = await this.getRequest(request.id);
      if (!current) {
        continue;
      }

      if (current.cancelRequested) {
        await this.cleanupRequest(current.id, current.userId);
        await this.publishStatus(current.userId, {
          status: "cancelled",
          requestId: current.id,
          topic: current.topic,
          difficulty: current.difficulty,
        });
        continue;
      }

      current.status = "searching";
      current.sessionId = "";
      current.cancelRequested = false;
      await this.redis.hmset(requestKey(current.id), serializeRequestRecord(current));
      await this.redis.zadd(
        queueKey(current.topic, current.difficulty),
        String(current.queueScore),
        current.queueMember,
      );
      await this.publishStatus(current.userId, buildSearchingState(current));
    }
  }

  private async anyCancelRequested(...requestIds: string[]): Promise<boolean> {
    for (const requestId of requestIds) {
      const request = await this.getRequest(requestId);
      if (request?.cancelRequested) {
        return true;
      }
    }

    return false;
  }

  private async removeRequestFromQueue(request: RequestRecord): Promise<void> {
    await this.redis.zrem(
      queueKey(request.topic, request.difficulty),
      request.queueMember,
    );
  }

  private async cleanupRequest(
    requestId: string,
    userId: string,
  ): Promise<void> {
    const multi = this.redis.multi();
    multi.del(requestKey(requestId));
    multi.del(userRequestKey(userId));
    multi.zrem(timeoutZsetKey, requestId);
    multi.zrem(relaxationT1ZsetKey, requestId);
    multi.zrem(relaxationT2ZsetKey, requestId);
    multi.zrem(relaxationRecentPartnerZsetKey, requestId);
    await multi.exec();
  }

  private async removeRequestIndexes(
    requestId: string,
    userId?: string,
  ): Promise<void> {
    const multi = this.redis.multi();
    multi.zrem(timeoutZsetKey, requestId);
    multi.zrem(relaxationT1ZsetKey, requestId);
    multi.zrem(relaxationT2ZsetKey, requestId);
    multi.zrem(relaxationRecentPartnerZsetKey, requestId);
    if (userId) {
      multi.del(userRequestKey(userId));
    }
    await multi.exec();
  }

  private async getMostRecentPartnerId(userId: string): Promise<string | null> {
    const lastCompletedSession = await Session.findOne({
      status: "completed",
      $or: [{ userAId: userId }, { userBId: userId }],
    }).sort({ completedAt: -1, updatedAt: -1 });

    if (!lastCompletedSession) {
      return null;
    }

    return lastCompletedSession.userAId === userId
      ? lastCompletedSession.userBId
      : lastCompletedSession.userAId;
  }

  private async publishStatus(
    userId: string,
    event: MatchStatusEvent,
  ): Promise<void> {
    await this.eventBus.publish(userId, event);
  }
}
