import mongoose, { Document, Schema } from "mongoose";
import { DIFFICULTIES, Difficulty } from "../types";

export const SESSION_STATUSES = [
  "pending_handoff",
  "active",
  "completed",
  "failed",
  "cancelled",
  "expired"
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface ISession extends Document {
  sessionId: string;
  userAId: string;
  userBId: string;
  topic: string;
  difficulty: Difficulty;
  questionId: string;
  status: SessionStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
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
      trim: true,
      default: "",
    },
    status: {
      type: String,
      required: true,
      enum: [...SESSION_STATUSES],
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

sessionSchema.index({ userAId: 1, status: 1 });
sessionSchema.index({ userBId: 1, status: 1 });
sessionSchema.index({ createdAt: -1 });

const Session = mongoose.model<ISession>("Session", sessionSchema);
export default Session;
