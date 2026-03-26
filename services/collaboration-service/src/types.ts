export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export const LANGUAGES = ["Python"] as const;
export const COLLABORATION_SESSION_STATUSES = ["active", "completed"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];
export type Language = (typeof LANGUAGES)[number];
export type CollaborationSessionStatus =
  (typeof COLLABORATION_SESSION_STATUSES)[number];

export interface CollaborationSessionPayload {
  sessionId: string;
  userAId: string;
  userBId: string;
  topic: string;
  difficulty: Difficulty;
  questionId: string;
  language: Language;
}
