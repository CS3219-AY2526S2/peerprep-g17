import { Readable } from "stream";
import { Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User, { Role, type IUser } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import { getProfilePhotoBucket } from "../lib/gridfs";

const JWT_SECRET =
  process.env.JWT_SECRET || "you-should-change-this-in-production";
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL || "http://localhost:8081";
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

function generateToken(id: string, role: string): string {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "72h" });
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

function getParamAsString(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function getUserId(user: IUser): string {
  return String(user._id);
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

async function removePreviousPhotoIfAny(user: IUser): Promise<void> {
  if (!user.profilePhotoFileId) {
    return;
  }

  const bucket = getProfilePhotoBucket();

  try {
    await bucket.delete(user.profilePhotoFileId);
  } catch {
    // If the prior file doesn't exist anymore, continue and replace the reference.
  }
}

async function uploadPhotoToGridFS(file: Express.Multer.File, userId: string): Promise<mongoose.Types.ObjectId> {
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

  // First registered user automatically becomes admin
  const userCount = await User.countDocuments();
  const assignedRole = userCount === 0 ? Role.ADMIN : Role.USER;

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    role: assignedRole,
  });

  const token = generateToken(getUserId(user), user.role);
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

  // Determine whether the identifier is an email or username
  const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
  const normalizedIdentifier = isEmail ? String(identifier).toLowerCase() : identifier;
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

  const token = generateToken(getUserId(user), user.role);
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

  const { username, university, bio } = req.body as {
    username?: unknown;
    university?: unknown;
    bio?: unknown;
  };

  const validationError = validateProfileFields({ username, university, bio });
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const user = await findUserByIdOrRespond(req.userId, res);
  if (!user) {
    return;
  }

  if (typeof username === "string") {
    const trimmedUsername = username.trim();

    if (trimmedUsername !== user.username) {
      const existingUsername = await User.findOne({
        username: trimmedUsername,
        _id: { $ne: user._id },
      });

      if (existingUsername) {
        res.status(409).json({ error: "Username already exists." });
        return;
      }
    }

    user.username = trimmedUsername;
  }

  if (typeof university === "string") {
    user.university = university;
  }

  if (typeof bio === "string") {
    user.bio = bio;
  }

  try {
    await user.save();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ error: "Username already exists." });
      return;
    }

    res.status(500).json({ error: "Failed to update profile." });
    return;
  }

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
  res.setHeader("Content-Type", metadata?.contentType || "application/octet-stream");
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

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  const user = await User.findById(id).select("-password");
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.status(200).json({ data: user });
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

  // Regular users can only update their own profile
  if (req.role !== "admin" && req.userId !== id) {
    res.status(403).json({ error: "You can only update your own profile." });
    return;
  }

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  const { username, email, password } = req.body;
  const updateFields: Record<string, string> = {};

  if (username) updateFields.username = username;
  if (email) updateFields.email = email;
  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }
    updateFields.password = await bcrypt.hash(password, SALT_ROUNDS);
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.status(200).json({ data: updatedUser });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ error: "Username or email already exists." });
      return;
    }

    res.status(500).json({ error: "Failed to update user." });
  }
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

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  const deletedUser = await User.findByIdAndDelete(id);
  if (!deletedUser) {
    res.status(404).json({ error: "User not found." });
    return;
  }

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
  const { role } = req.body;

  if (!role || !Object.values(Role).includes(role)) {
    res.status(400).json({
      error: `Invalid role. Must be one of: ${Object.values(Role).join(", ")}`,
    });
    return;
  }

  if (!isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid user id." });
    return;
  }

  // Prevent admins from demoting themselves
  if (req.userId === id && role !== Role.ADMIN) {
    res.status(400).json({ error: "You cannot demote yourself." });
    return;
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true, runValidators: true },
  ).select("-password");

  if (!updatedUser) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.status(200).json({ data: updatedUser });
}
