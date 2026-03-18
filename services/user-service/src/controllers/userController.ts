import { Readable } from "stream";
import { Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User, { Role, type IUser } from "../models/User";
import AdminRequest, {
  AdminRequestStatus,
  type IAdminRequest,
} from "../models/AdminRequest";
import { AuthRequest } from "../middleware/authMiddleware";
import { getProfilePhotoBucket } from "../lib/gridfs";

const JWT_SECRET =
  process.env.JWT_SECRET || "you-should-change-this-in-production";
const USER_SERVICE_BASE_URL =
  process.env.USER_SERVICE_BASE_URL || "http://localhost:8081";
const SALT_ROUNDS = 10;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

interface SelfProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  university: string;
  bio: string;
  profilePhotoUrl: string | null;
}

interface PublicProfile {
  id: string;
  username: string;
  university: string;
  bio: string;
  profilePhotoUrl: string | null;
}

interface AdminRequestResponse {
  id: string;
  userId: string;
  reason: string;
  status: AdminRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function generateToken(id: string): string {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "72h" });
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must include at least 1 letter and 1 digit.";
  }
  return null;
}

function isAdmin(req: AuthRequest): boolean {
  return req.role === Role.ADMIN;
}

function isOwner(req: AuthRequest, userId: string): boolean {
  return req.userId === userId;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function getParamAsString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function getUserId(user: IUser): string {
  return String(user._id);
}

function getRequestId(request: IAdminRequest): string {
  return String(request._id);
}

function buildProfilePhotoUrl(userId: string, hasPhoto: boolean): string | null {
  if (!hasPhoto) {
    return null;
  }

  return `${USER_SERVICE_BASE_URL}/api/users/${userId}/photo`;
}

function toSelfProfile(user: IUser): SelfProfile {
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

function toPublicProfile(user: IUser): PublicProfile {
  const id = getUserId(user);

  return {
    id,
    username: user.username,
    university: user.university || "",
    bio: user.bio || "",
    profilePhotoUrl: buildProfilePhotoUrl(id, !!user.profilePhotoFileId),
  };
}

function toSafeUser(user: IUser): Omit<IUser, "password"> & { _id: mongoose.Types.ObjectId } {
  const obj = user.toObject();
  delete (obj as Record<string, unknown>).password;
  return obj as Omit<IUser, "password"> & { _id: mongoose.Types.ObjectId };
}

function toAdminRequestResponse(request: IAdminRequest): AdminRequestResponse {
  return {
    id: getRequestId(request),
    userId: String(request.userId),
    reason: request.reason,
    status: request.status,
    reviewedBy: request.reviewedBy ? String(request.reviewedBy) : null,
    reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function validateProfileFields(payload: {
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

async function findUserByIdOrRespond(
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

async function ensureUniqueUsername(
  username: string,
  currentUserId: string,
): Promise<boolean> {
  const existingUser = await User.findOne({
    username,
    _id: { $ne: currentUserId },
  });

  return !existingUser;
}

async function applyProfileUpdates(
  user: IUser,
  payload: { username?: unknown; university?: unknown; bio?: unknown },
): Promise<string | null> {
  const validationError = validateProfileFields(payload);
  if (validationError) {
    return validationError;
  }

  const { username, university, bio } = payload;

  if (typeof username === "string") {
    const trimmed = username.trim();
    if (trimmed !== user.username) {
      const isUnique = await ensureUniqueUsername(trimmed, getUserId(user));
      if (!isUnique) {
        return "Username already exists.";
      }
    }
    user.username = trimmed;
  }

  if (typeof university === "string") {
    user.university = university;
  }

  if (typeof bio === "string") {
    user.bio = bio;
  }

  return null;
}

async function isLastAdmin(targetUserId: string): Promise<boolean> {
  const adminCount = await User.countDocuments({ role: Role.ADMIN });
  if (adminCount > 1) {
    return false;
  }

  const target = await User.findById(targetUserId).select("role");
  return !!target && target.role === Role.ADMIN;
}

async function removePreviousPhotoIfAny(user: IUser): Promise<void> {
  if (!user.profilePhotoFileId) {
    return;
  }

  const bucket = getProfilePhotoBucket();

  try {
    await bucket.delete(user.profilePhotoFileId);
  } catch {
    // If the previous file no longer exists, continue and overwrite reference.
  }
}

async function uploadPhotoToGridFS(
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

function mapAdminRequestWithUsers(doc: mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  userId:
    | mongoose.Types.ObjectId
    | {
        _id: mongoose.Types.ObjectId;
        username: string;
        email: string;
        role: string;
      };
  reason: string;
  status: AdminRequestStatus;
  reviewedBy:
    | mongoose.Types.ObjectId
    | {
        _id: mongoose.Types.ObjectId;
        username: string;
        email: string;
      }
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
      : {
          id: String(doc.userId),
          username: "",
          email: "",
          role: "",
        };

  const reviewer =
    doc.reviewedBy && typeof doc.reviewedBy === "object" && "username" in doc.reviewedBy
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

// ── POST /api/users/register
export async function registerUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res
      .status(400)
      .json({ error: "Username, email, and password are required." });
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    res.status(409).json({ error: "Username or email already exists." });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    role: Role.USER,
  });

  const token = generateToken(getUserId(user));
  res.status(201).json({
    data: {
      ...toSelfProfile(user),
      token,
    },
  });
}

// ── POST /api/users/login
export async function loginUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res
      .status(400)
      .json({ error: "Email/username and password are required." });
    return;
  }

  const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
  const normalizedIdentifier = isEmail
    ? String(identifier).toLowerCase()
    : identifier;
  const query = isEmail
    ? { email: normalizedIdentifier }
    : { username: normalizedIdentifier };

  const user = await User.findOne(query);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const token = generateToken(getUserId(user));
  res.status(200).json({
    data: {
      ...toSelfProfile(user),
      token,
    },
  });
}

// ── GET /api/users
export async function getAllUsers(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const users = await User.find().select("-password");
  res.status(200).json({ data: users });
}

// ── GET /api/users/me
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const user = await findUserByIdOrRespond(req.userId, res);
  if (!user) {
    return;
  }

  res.status(200).json({ data: toSelfProfile(user) });
}

// ── PATCH /api/users/me
export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const user = await findUserByIdOrRespond(req.userId, res);
  if (!user) {
    return;
  }

  const updateError = await applyProfileUpdates(user, {
    username: req.body.username,
    university: req.body.university,
    bio: req.body.bio,
  });

  if (updateError) {
    const statusCode = updateError.includes("already exists") ? 409 : 400;
    res.status(statusCode).json({ error: updateError });
    return;
  }

  await user.save();
  res.status(200).json({ data: toSelfProfile(user) });
}

// ── POST /api/users/me/photo
export async function uploadMePhoto(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Photo file is required." });
    return;
  }

  const user = await findUserByIdOrRespond(req.userId, res);
  if (!user) {
    return;
  }

  await removePreviousPhotoIfAny(user);

  const newPhotoId = await uploadPhotoToGridFS(req.file, req.userId);
  user.profilePhotoFileId = newPhotoId;
  await user.save();

  res.status(200).json({ data: toSelfProfile(user) });
}

// ── POST /api/users/admin-requests
export async function createAdminRequest(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.userId || !req.role) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  if (req.role === Role.ADMIN) {
    res.status(400).json({ error: "Admins cannot request admin privileges." });
    return;
  }

  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  if (!reason) {
    res.status(400).json({ error: "Request reason is required." });
    return;
  }

  if (reason.length > 500) {
    res.status(400).json({ error: "Reason must be at most 500 characters." });
    return;
  }

  const existingPending = await AdminRequest.findOne({
    userId: req.userId,
    status: AdminRequestStatus.PENDING,
  });
  if (existingPending) {
    res.status(409).json({ error: "You already have a pending admin request." });
    return;
  }

  try {
    const request = await AdminRequest.create({
      userId: req.userId,
      reason,
    });

    res.status(201).json({ data: toAdminRequestResponse(request) });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ error: "You already have a pending admin request." });
      return;
    }

    res.status(500).json({ error: "Failed to create admin request." });
  }
}

// ── GET /api/users/admin-requests/me
export async function getMyAdminRequests(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const requests = await AdminRequest.find({ userId: req.userId }).sort({
    createdAt: -1,
  });

  res.status(200).json({ data: requests.map(toAdminRequestResponse) });
}

// ── GET /api/users/admin-requests
export async function getAdminRequests(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const queryStatus = getParamAsString(req.query.status);

  let filter: { status?: AdminRequestStatus } = {};
  if (queryStatus) {
    if (!Object.values(AdminRequestStatus).includes(queryStatus as AdminRequestStatus)) {
      res.status(400).json({ error: "Invalid status filter." });
      return;
    }

    filter = { status: queryStatus as AdminRequestStatus };
  }

  const requests = await AdminRequest.find(filter)
    .populate("userId", "username email role")
    .populate("reviewedBy", "username email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    data: requests.map((doc) => mapAdminRequestWithUsers(doc as never)),
  });
}

// ── PATCH /api/users/admin-requests/:id
export async function reviewAdminRequest(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const id = getParamAsString(req.params.id);
  if (!id || !isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid admin request id." });
    return;
  }

  const status = getParamAsString(req.body.status);
  if (
    status !== AdminRequestStatus.APPROVED &&
    status !== AdminRequestStatus.REJECTED
  ) {
    res.status(400).json({ error: "Status must be approved or rejected." });
    return;
  }

  const request = await AdminRequest.findById(id);
  if (!request) {
    res.status(404).json({ error: "Admin request not found." });
    return;
  }

  if (request.status !== AdminRequestStatus.PENDING) {
    res.status(400).json({ error: "Only pending requests can be reviewed." });
    return;
  }

  const targetUser = await User.findById(request.userId);
  if (!targetUser) {
    res.status(404).json({ error: "Request user not found." });
    return;
  }

  if (status === AdminRequestStatus.APPROVED && targetUser.role !== Role.ADMIN) {
    targetUser.role = Role.ADMIN;
    await targetUser.save();
  }

  request.status = status;
  request.reviewedBy = new mongoose.Types.ObjectId(req.userId);
  request.reviewedAt = new Date();
  await request.save();

  res.status(200).json({ data: toAdminRequestResponse(request) });
}

// ── GET /api/users/:id/photo
export async function getUserPhoto(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const id = getParamAsString(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  const user = await findUserByIdOrRespond(id, res);
  if (!user) {
    return;
  }

  if (!user.profilePhotoFileId) {
    res.status(404).json({ error: "Profile photo not found." });
    return;
  }

  const bucket = getProfilePhotoBucket();
  const fileDoc = await bucket.find({ _id: user.profilePhotoFileId }).next();

  if (!fileDoc) {
    res.status(404).json({ error: "Profile photo not found." });
    return;
  }

  const metadata = fileDoc.metadata as { contentType?: string } | undefined;
  res.setHeader(
    "Content-Type",
    metadata?.contentType || "application/octet-stream",
  );
  bucket
    .openDownloadStream(user.profilePhotoFileId)
    .on("error", () => {
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to read profile photo." });
      }
    })
    .pipe(res);
}

// ── GET /api/users/:id/profile
export async function getUserPublicProfile(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const id = getParamAsString(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  const user = await findUserByIdOrRespond(id, res);
  if (!user) {
    return;
  }

  res.status(200).json({ data: toPublicProfile(user) });
}

// ── GET /api/users/:id
export async function getUser(req: AuthRequest, res: Response): Promise<void> {
  const id = getParamAsString(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  if (!isAdmin(req) && !isOwner(req, id)) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  const user = await findUserByIdOrRespond(id, res);
  if (!user) {
    return;
  }

  res.status(200).json({ data: toSafeUser(user) });
}

// ── PATCH /api/users/:id
export async function updateUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const id = getParamAsString(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  if (!isAdmin(req) && !isOwner(req, id)) {
    res.status(403).json({ error: "You can only update your own profile." });
    return;
  }

  const user = await findUserByIdOrRespond(id, res);
  if (!user) {
    return;
  }

  const isRequestingAdmin = isAdmin(req);
  const { username, university, bio, email, password } = req.body as {
    username?: unknown;
    university?: unknown;
    bio?: unknown;
    email?: unknown;
    password?: unknown;
  };

  if (!isRequestingAdmin && (email !== undefined || password !== undefined)) {
    res.status(403).json({
      error: "Only admins can update email or password on this route.",
    });
    return;
  }

  const profileError = await applyProfileUpdates(user, { username, university, bio });
  if (profileError) {
    const statusCode = profileError.includes("already exists") ? 409 : 400;
    res.status(statusCode).json({ error: profileError });
    return;
  }

  if (isRequestingAdmin) {
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        res.status(400).json({ error: "Email must be a non-empty string." });
        return;
      }
      user.email = email.toLowerCase().trim();
    }

    if (password !== undefined) {
      if (typeof password !== "string") {
        res.status(400).json({ error: "Password must be a string." });
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }

      user.password = await bcrypt.hash(password, SALT_ROUNDS);
    }
  }

  try {
    await user.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ error: "Username or email already exists." });
      return;
    }

    res.status(500).json({ error: "Failed to update user." });
    return;
  }

  res.status(200).json({ data: toSafeUser(user) });
}

// ── DELETE /api/users/:id
export async function deleteUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const id = getParamAsString(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  const user = await findUserByIdOrRespond(id, res);
  if (!user) {
    return;
  }

  if (user.role === Role.ADMIN && (await isLastAdmin(id))) {
    res.status(409).json({ error: "Cannot delete the last admin." });
    return;
  }

  await User.findByIdAndDelete(id);
  await AdminRequest.deleteMany({ userId: id });

  res.status(200).json({ data: { message: "User deleted successfully." } });
}

// ── PATCH /api/users/:id/role
export async function updateUserRole(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const id = getParamAsString(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  const nextRole = getParamAsString(req.body.role);
  if (!nextRole || !Object.values(Role).includes(nextRole as Role)) {
    res.status(400).json({
      error: `Invalid role. Must be one of: ${Object.values(Role).join(", ")}`,
    });
    return;
  }

  const user = await findUserByIdOrRespond(id, res);
  if (!user) {
    return;
  }

  const isDemotion = user.role === Role.ADMIN && nextRole === Role.USER;
  if (isDemotion && req.userId === id) {
    res.status(400).json({ error: "You cannot demote yourself." });
    return;
  }

  if (isDemotion && (await isLastAdmin(id))) {
    res.status(409).json({ error: "Cannot demote the last admin." });
    return;
  }

  user.role = nextRole as Role;
  await user.save();

  res.status(200).json({ data: toSafeUser(user) });
}
