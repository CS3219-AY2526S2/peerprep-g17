import { Readable } from "stream";
import { Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User, { Role, type IUser } from "../models/User";
import { type IAdminRequest, AdminRequestStatus } from "../models/AdminRequest";
import { AuthRequest } from "../middleware/authMiddleware";
import { getProfilePhotoBucket } from "../lib/gridfs";
import { config } from "../config";

/* ── Response shapes ─────────────────────────────────── */

export interface SelfProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  university: string;
  bio: string;
  profilePhotoUrl: string | null;
}

export interface PublicProfile {
  id: string;
  username: string;
  university: string;
  bio: string;
  profilePhotoUrl: string | null;
}

export interface AdminRequestResponse {
  id: string;
  userId: string;
  reason: string;
  status: AdminRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Auth helpers ────────────────────────────────────── */

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.tokenExpiry,
  });
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must include at least 1 letter and 1 digit.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.saltRounds);
}

export async function comparePasswords(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/* ── Identity helpers ────────────────────────────────── */

export function isAdmin(req: AuthRequest): boolean {
  return req.role === Role.ADMIN || req.role === Role.SUPERADMIN;
}

export function isOwner(req: AuthRequest, targetUserId: string): boolean {
  return req.userId === targetUserId;
}

export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export function getParamAsString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function getUserId(user: IUser): string {
  return String(user._id);
}

/* ── Response formatters ─────────────────────────────── */

function buildProfilePhotoUrl(
  userId: string,
  hasPhoto: boolean,
): string | null {
  if (!hasPhoto) return null;
  return `${config.baseUrl}/api/users/${userId}/photo`;
}

export function toSelfProfile(user: IUser): SelfProfile {
  const id = getUserId(user);

  return {
    id,
    username: user.username,
    email: user.email,
    role: user.role,
    university: user.university || "",
    bio: user.bio || "",
    profilePhotoUrl: buildProfilePhotoUrl(id, !!user.profilePhotoFileId),
  };
}

export function toPublicProfile(user: IUser): PublicProfile {
  const id = getUserId(user);

  return {
    id,
    username: user.username,
    university: user.university || "",
    bio: user.bio || "",
    profilePhotoUrl: buildProfilePhotoUrl(id, !!user.profilePhotoFileId),
  };
}

export function toSafeUser(
  user: IUser,
): Omit<IUser, "password"> & { _id: mongoose.Types.ObjectId } {
  const obj = user.toObject();
  delete (obj as Record<string, unknown>).password;
  return obj as Omit<IUser, "password"> & { _id: mongoose.Types.ObjectId };
}

export function toAdminRequestResponse(
  request: IAdminRequest,
): AdminRequestResponse {
  return {
    id: String(request._id),
    userId: String(request.userId),
    reason: request.reason,
    status: request.status,
    reviewedBy: request.reviewedBy ? String(request.reviewedBy) : null,
    reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

/* ── DB lookup helpers ───────────────────────────────── */

/**
 * Finds a user by ID, sending a 400/404 error response if invalid/not found.
 * Returns `null` if the response was already sent.
 */
export async function findUserByIdOrRespond(
  id: string,
  res: Response,
): Promise<IUser | null> {
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid user id." });
    return null;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return null;
  }

  return user;
}

export async function isLastAdmin(targetUserId: string): Promise<boolean> {
  const target = await User.findById(targetUserId).select("role");
  if (!target) return false;

  if (target.role === Role.SUPERADMIN) {
    const superAdminCount = await User.countDocuments({ role: Role.SUPERADMIN });
    return superAdminCount <= 1;
  }

  if (target.role === Role.ADMIN) {
    const adminCount = await User.countDocuments({ role: Role.ADMIN });
    const superAdminCount = await User.countDocuments({ role: Role.SUPERADMIN });

    return adminCount <= 1 && superAdminCount === 0;
  }

  return false;
}

/* ── Profile validation ──────────────────────────────── */

export function validateProfileFields(payload: {
  username?: unknown;
  university?: unknown;
  bio?: unknown;
}): string | null {
  const { username, university, bio } = payload;

  if (username !== undefined) {
    if (typeof username !== "string" || !username.trim()) {
      return "Username must be a non-empty string.";
    }
  }

  if (university !== undefined) {
    if (typeof university !== "string") {
      return "University must be a string.";
    }
    if (university.length > 120) {
      return "University must be at most 120 characters.";
    }
  }

  if (bio !== undefined) {
    if (typeof bio !== "string") {
      return "Bio must be a string.";
    }
    if (bio.length > 500) {
      return "Bio must be at most 500 characters.";
    }
  }

  return null;
}

/**
 * Validates and applies profile field updates to a user document.
 * Returns an error string on failure, or null on success.
 */
export async function applyProfileUpdates(
  user: IUser,
  payload: { username?: unknown; university?: unknown; bio?: unknown },
): Promise<string | null> {
  const validationError = validateProfileFields(payload);
  if (validationError) return validationError;

  const { username, university, bio } = payload;

  if (typeof username === "string") {
    const trimmed = username.trim();
    if (trimmed !== user.username) {
      const existingUser = await User.findOne({
        username: trimmed,
        _id: { $ne: getUserId(user) },
      });
      if (existingUser) return "Username already exists.";
    }
    user.username = trimmed;
  }

  if (typeof university === "string") user.university = university;
  if (typeof bio === "string") user.bio = bio;

  return null;
}

/* ── Photo helpers ───────────────────────────────────── */

export async function removePreviousPhoto(user: IUser): Promise<void> {
  if (!user.profilePhotoFileId) return;

  const bucket = getProfilePhotoBucket();
  try {
    await bucket.delete(user.profilePhotoFileId);
  } catch {
    // If the previous file no longer exists, continue and overwrite reference.
  }
}

export async function uploadPhotoToGridFS(
  file: Express.Multer.File,
  userId: string,
): Promise<mongoose.Types.ObjectId> {
  const bucket = getProfilePhotoBucket();
  const filename = `profile-${userId}-${Date.now()}`;

  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { contentType: file.mimetype },
  });

  await new Promise<void>((resolve, reject) => {
    Readable.from(file.buffer)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => resolve());
  });

  return uploadStream.id as mongoose.Types.ObjectId;
}

/* ── Admin request helper (populated documents) ──────── */

export function mapAdminRequestWithUsers(doc: mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  userId:
    | mongoose.Types.ObjectId
    | { _id: mongoose.Types.ObjectId; username: string; email: string; role: string };
  reason: string;
  status: AdminRequestStatus;
  reviewedBy:
    | mongoose.Types.ObjectId
    | { _id: mongoose.Types.ObjectId; username: string; email: string }
    | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const requester =
    typeof doc.userId === "object" && "username" in doc.userId
      ? {
          id: String(doc.userId._id),
          username: doc.userId.username,
          email: doc.userId.email,
          role: doc.userId.role,
        }
      : { id: String(doc.userId), username: "", email: "", role: "" };

  const reviewer =
    doc.reviewedBy &&
    typeof doc.reviewedBy === "object" &&
    "username" in doc.reviewedBy
      ? {
          id: String(doc.reviewedBy._id),
          username: doc.reviewedBy.username,
          email: doc.reviewedBy.email,
        }
      : null;

  return {
    id: String(doc._id),
    reason: doc.reason,
    status: doc.status,
    requester,
    reviewer,
    reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
