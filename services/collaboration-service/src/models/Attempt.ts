import mongoose, { Document, Schema } from "mongoose";

export interface IAttempt extends Document {
  userId: string;
  sessionId: string;
  questionId: string;
  topic: string;
  difficulty: string;
  language: string;
  code: string;
  attemptedAt: Date;
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
  },
  { timestamps: true },
);
attemptSchema.index({ userId: 1, attemptedAt: -1 });
const Attempt = mongoose.model<IAttempt>("Attempt", attemptSchema);
export default Attempt;