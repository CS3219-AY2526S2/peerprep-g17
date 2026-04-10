import mongoose, { Document, Schema } from "mongoose";
import {
  COLLABORATION_SESSION_STATUSES,
  DIFFICULTIES,
  LANGUAGES,
  Difficulty,
  Language,
  CollaborationSessionStatus,
  ExecutionResult,
} from "../types";

export interface ICollaborationSession extends Document {
  sessionId: string;
  userAId: string;
  userBId: string;
  topic: string;
  difficulty: Difficulty;
  questionId: string;
  language: Language;
  status: CollaborationSessionStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  yjsState?: Buffer | null;
  messages: {
    username: string;
    text: string;
    timestamp: Date;
  }[];
  starterCodeSeededAt?: Date | null;
  lastExecutionResult?: ExecutionResult | null;
  lastExecutionAt?: Date | null;
  lastSubmittedAt?: Date | null;
}

const collaborationSessionSchema = new Schema<ICollaborationSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userAId: {
      type: String,
      required: true,
      trim: true,
    },
    userBId: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: [...DIFFICULTIES],
    },
    questionId: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      enum: [...LANGUAGES],
    },
    status: {
      type: String,
      required: true,
      enum: [...COLLABORATION_SESSION_STATUSES],
    },
    completedAt: {
      type: Date,
    },
    yjsState: {
      type: Buffer,
      default: null,
    },
    // 2. Added the messages array to the Schema
    messages: [
      {
        username: { type: String, required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    starterCodeSeededAt: {
      type: Date,
      default: null,
    },
    lastExecutionResult: {
      type: Schema.Types.Mixed,
      default: null,
    },
    lastExecutionAt: {
      type: Date,
      default: null,
    },
    lastSubmittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

collaborationSessionSchema.index({ userAId: 1, status: 1 });
collaborationSessionSchema.index({ userBId: 1, status: 1 });

const CollaborationSession = mongoose.model<ICollaborationSession>(
  "CollaborationSession",
  collaborationSessionSchema,
);

export default CollaborationSession;
