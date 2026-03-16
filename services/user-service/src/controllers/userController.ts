import { Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { Role } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

const JWT_SECRET =
  process.env.JWT_SECRET || "you-should-change-this-in-production";
const SALT_ROUNDS = 10;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

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
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res
      .status(400)
      .json({ error: "Email/username and password are required." });
    return;
  }

  // Determine whether the identifier is an email or username
  const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
  const query = isEmail ? { email: identifier } : { username: identifier };

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
  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }
    updateFields.password = await bcrypt.hash(password, SALT_ROUNDS);
  }

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

// ── PATCH /api/users/:id/role
export async function updateUserRole(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !Object.values(Role).includes(role)) {
    res.status(400).json({
      error: `Invalid role. Must be one of: ${Object.values(Role).join(", ")}`,
    });
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
