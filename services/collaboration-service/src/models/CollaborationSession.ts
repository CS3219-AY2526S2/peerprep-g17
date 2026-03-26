import mongoose, { Document, Schema } from "mongoose";
import {
  COLLABORATION_SESSION_STATUSES,
  DIFFICULTIES,
  LANGUAGES,
  Difficulty,
  Language,
  CollaborationSessionStatus,
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
