import { Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User, { Role } from "../models/User";
import AdminRequest, { AdminRequestStatus } from "../models/AdminRequest";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  isAdmin,
  isOwner,
  getParamAsString,
  isValidObjectId,
  findUserByIdOrRespond,
  isLastAdmin,
  validatePassword,
  applyProfileUpdates,
  toSafeUser,
  toAdminRequestResponse,
  mapAdminRequestWithUsers,
} from "../utils/userHelpers";
import { loggingTheAction } from "../utils/auditLogger";
import { config } from "../config";

/* ── GET /api/users ──────────────────────────────────── */

export async function getAllUsers(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const users = await User.find().select("-password");
  res.status(200).json({ data: users });
}

/* ── GET /api/users/:id ──────────────────────────────── */

export async function getUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
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
  if (!user) return;

  res.status(200).json({ data: toSafeUser(user) });
}

/* ── PATCH /api/users/:id ────────────────────────────── */

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
  if (!user) return;

  const isRequestingAdmin = isAdmin(req);
  const { username, university, bio, email, password } = req.body as {
    username?: unknown;
    university?: unknown;
    bio?: unknown;
    email?: unknown;
    password?: unknown;
  };

  // ── Guard: only admins can change email/password via this route
  if (!isRequestingAdmin && (email !== undefined || password !== undefined)) {
    res.status(403).json({
      error: "Only admins can update email or password on this route.",
    });
    return;
  }

  // ── Apply profile field updates
  const profileError = await applyProfileUpdates(user, {
    username,
    university,
    bio,
  });
  if (profileError) {
    const statusCode = profileError.includes("already exists") ? 409 : 400;
    res.status(statusCode).json({ error: profileError });
    return;
  }

  // ── Admin-only: email & password changes
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

      user.password = await bcrypt.hash(password, config.saltRounds);
    }
  }

  // ── Persist
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

/* ── DELETE /api/users/:id ───────────────────────────── */

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
  if (!user) return;

  if (user.role === Role.ADMIN && (await isLastAdmin(id))) {
    res.status(409).json({ error: "Cannot delete the last admin." });
    return;
  }

  await User.findByIdAndDelete(id);
  await AdminRequest.deleteMany({ userId: id });
  await loggingTheAction(req.userId!, "DELETE_THE_USER", id);

  res.status(200).json({ data: { message: "User deleted successfully." } });
}

/* ── PATCH /api/users/:id/role ───────────────────────── */

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
  if (!user) return;

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
  await loggingTheAction(req.userId!, `ROLE_CHANGE_TO_${nextRole.toUpperCase()}`, id);

  res.status(200).json({ data: toSafeUser(user) });
}

/* ── POST /api/users/admin-requests ──────────────────── */

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

  const reason =
    typeof req.body.reason === "string" ? req.body.reason.trim() : "";
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
    res
      .status(409)
      .json({ error: "You already have a pending admin request." });
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
      res
        .status(409)
        .json({ error: "You already have a pending admin request." });
      return;
    }
    res.status(500).json({ error: "Failed to create admin request." });
  }
}

/* ── GET /api/users/admin-requests/me ────────────────── */

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

/* ── GET /api/users/admin-requests ───────────────────── */

export async function getAdminRequests(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const queryStatus = getParamAsString(req.query.status);

  let filter: { status?: AdminRequestStatus } = {};
  if (queryStatus) {
    if (
      !Object.values(AdminRequestStatus).includes(
        queryStatus as AdminRequestStatus,
      )
    ) {
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

/* ── PATCH /api/users/admin-requests/:id ─────────────── */

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

  // ── Promote user if approved
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
  await loggingTheAction(req.userId!, `ADMIN_REQUEST_${status.toUpperCase()}`, String(request.userId));

  res.status(200).json({ data: toAdminRequestResponse(request) });
}
