import { Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

const JWT_SECRET =
  process.env.JWT_SECRET || "you-should-change-this-in-production";
const SALT_ROUNDS = 10;

function generateToken(id: string, role: string): string {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "24h" });
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

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    res.status(409).json({ error: "Username or email already exists." });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, email, password: hashedPassword });

  const token = generateToken(user.id, user.role);
  res.status(201).json({
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token,
    },
  });
}

// ── POST /api/users/login
export async function loginUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = generateToken(user.id, user.role);
  res.status(200).json({
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
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

// ── GET /api/users/:id
export async function getUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

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
  const { id } = req.params;

  // Regular users can only update their own profile
  if (req.role !== "admin" && req.userId !== id) {
    res.status(403).json({ error: "You can only update your own profile." });
    return;
  }

  const { username, email, password } = req.body;
  const updateFields: Record<string, string> = {};

  if (username) updateFields.username = username;
  if (email) updateFields.email = email;
  if (password)
    updateFields.password = await bcrypt.hash(password, SALT_ROUNDS);

  const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!updatedUser) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.status(200).json({ data: updatedUser });
}

// ── DELETE /api/users/:id
export async function deleteUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  const deletedUser = await User.findByIdAndDelete(id);
  if (!deletedUser) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.status(200).json({ data: { message: "User deleted successfully." } });
}
