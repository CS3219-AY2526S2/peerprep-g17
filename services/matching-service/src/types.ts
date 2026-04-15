export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

export type PublicMatchStatus =
  | "searching"
  | "matched"
  | "timed_out"
  | "cancelled";

export interface MatchRequestInput {
  topic: string;
  difficulty: Difficulty;
}

export interface MatchStatusEvent {
  status: PublicMatchStatus;
  requestId: string;
  sessionId?: string;
  remainingMs?: number;
  partnerUserId?: string;
  topic?: string;
  difficulty?: string;
  questionId?: string;
}

export interface MatchStateResponse extends MatchStatusEvent {}

export interface SelectedQuestion {
  id: string;
  difficulty: Difficulty;
  title: string;
}

export interface MatchHandoffPayload {
  sessionId: string;
  userAId: string;
  userBId: string;
  topic: string;
  difficulty: Difficulty;
  questionId: string;
  language: "Python";
}

export interface AttemptedQuestionIdsResponse {
  questionIds: string[];
}

export interface RequestRecord {
  id: string;
  userId: string;
  topic: string;
  difficulty: Difficulty;
  createdAt: number;
  queueScore: number;
  queueSequence: number;
  queueMember: string;
  timeoutAt: number;
  t1At: number;
  t2At: number;
  recentPartnerAt: number;
  status: "searching" | "matching";
  sessionId: string;
  cancelRequested: boolean;
  authHeader: string;
}

export interface MatchCandidateResult {
  matched: boolean;
  state: MatchStateResponse;
}

export interface MatchEventEnvelope {
  userId: string;
  event: MatchStatusEvent;
}
