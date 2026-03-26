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

export interface RequestRecord {
  id: string;
  userId: string;
  topic: string;
  difficulty: Difficulty;
  createdAt: number;
  timeoutAt: number;
  t1At: number;
  t2At: number;
  status: "searching" | "matching";
  sessionId: string;
  cancelRequested: boolean;
}

export interface MatchCandidateResult {
  matched: boolean;
  state: MatchStateResponse;
}

export interface MatchEventEnvelope {
  userId: string;
  event: MatchStatusEvent;
}

