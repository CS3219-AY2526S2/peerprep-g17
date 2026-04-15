export type QuestionHelpMode =
  | "rephrase"
  | "beginner_explanation"
  | "test_case_generation"
  | "optimization_hint"
  | "brainstorm";

export type AiVerbosity = "quick" | "detailed";

export type AiStyle =
  | "concise_coach"
  | "teacher"
  | "beginner_friendly"
  | "interviewer";

export type ChatMessage = {
  messageId?: string;
  fromUserId?: string;
  username: string;
  text: string;
  type?: "chat" | "system";
  reactions?: Array<{
    emoji: string;
    userIds: string[];
  }>;
  timestamp?: string;
};

export type ChatStatus = "connecting" | "connected" | "reconnecting" | "offline";

export type EditorStatus = "connecting" | "connected" | "disconnected";

export type CustomExecutionPayload =
  | { args: unknown[] }
  | { operations: string[]; arguments: unknown[][] };

export type ResultTab = "testcase" | "result" | "console" | "chat";
