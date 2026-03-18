import mongoose, { Document, Schema } from "mongoose";

export enum AdminRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IAdminRequest extends Document {
  userId: mongoose.Types.ObjectId;
  reason: string;
  status: AdminRequestStatus;
  reviewedBy: mongoose.Types.ObjectId | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminRequestSchema = new Schema<IAdminRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: [true, "Reason is required."],
      trim: true,
      maxlength: [500, "Reason must be at most 500 characters."],
    },
    status: {
      type: String,
      enum: Object.values(AdminRequestStatus),
      default: AdminRequestStatus.PENDING,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

adminRequestSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: AdminRequestStatus.PENDING },
  },
);

const AdminRequest = mongoose.model<IAdminRequest>(
  "AdminRequest",
  adminRequestSchema,
);

export default AdminRequest;
