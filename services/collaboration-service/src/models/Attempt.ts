import mongoose, { Document, Schema } from "mongoose";
import type {
  ExecutionCaseResult,
  ExecutionMode,
  ExecutionVerdict,
} from "../types";

export interface IAttempt extends Document {
  userId: string;
  sessionId: string;
  questionId: string;
  topic: string;
  difficulty: string;
  language: string;
  code: string;
  attemptedAt: Date;
  mode?: "submit" | "session_complete";
  verdict?: ExecutionVerdict;
  passedCount?: number;
  totalCount?: number;
  runtimeMs?: number;
  memoryKb?: number;
  executionMode?: ExecutionMode;
  firstFailingCase?: ExecutionCaseResult | null;
  submittedAt?: Date | null;
}

const attemptSchema = new Schema<IAttempt>(
  {
    userId: { type: String, required: true, trim: true },
    sessionId: { type: String, required: true, trim: true },
    questionId: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    difficulty: { type: String, required: true, trim: true },
    language: { type: String, required: true, trim: true },
    code: { type: String, default: "" },
    attemptedAt: { type: Date, default: Date.now },
    mode: { type: String, enum: ["submit", "session_complete"] },
    verdict: { type: String, trim: true },
    passedCount: { type: Number },
    totalCount: { type: Number },
    runtimeMs: { type: Number },
    memoryKb: { type: Number },
    executionMode: { type: String, enum: ["python_function", "python_class"] },
    firstFailingCase: { type: Schema.Types.Mixed, default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
attemptSchema.index({ userId: 1, attemptedAt: -1 });
const Attempt = mongoose.model<IAttempt>("Attempt", attemptSchema);
export default Attempt;
