import { Response } from "express";
import User, { Role } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  generateToken,
  validatePassword,
  hashPassword,
  comparePasswords,
  getUserId,
  toSelfProfile,
} from "../utils/userHelpers";

/* ── POST /api/users/register ────────────────────────── */

export async function registerUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { username, email, password } = req.body;

  // ── Guard: required fields
  if (!username || !email || !password) {
    res
      .status(400)
      .json({ error: "Username, email, and password are required." });
    return;
  }

  // ── Guard: password strength
  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  // ── Guard: duplicate
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    res.status(409).json({ error: "Username or email already exists." });
    return;
  }

  // ── Persist
  const hashedPassword = await hashPassword(password);
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    role: Role.USER,
  });

  const token = generateToken(getUserId(user));
  res.status(201).json({
    data: { ...toSelfProfile(user), token },
  });
}

/* ── POST /api/users/login ───────────────────────────── */

export async function loginUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { identifier, password } = req.body;

  // ── Guard: required fields
  if (!identifier || !password) {
    res
      .status(400)
      .json({ error: "Email/username and password are required." });
    return;
  }

  // ── Lookup user by email or username
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

  // ── Guard: password match
  const isPasswordValid = await comparePasswords(password, user.password);
  if (!isPasswordValid) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const token = generateToken(getUserId(user));
  res.status(200).json({
    data: { ...toSelfProfile(user), token },
  });
}
