import { Response } from "express";
import User from "../models/User";
import AdminRequest from "../models/AdminRequest";
import { AuthRequest } from "../middleware/authMiddleware";
import { getProfilePhotoBucket } from "../lib/gridfs";
import {
  findUserByIdOrRespond,
  getParamAsString,
  isLastAdmin,
  applyProfileUpdates,
  removePreviousPhoto,
  uploadPhotoToGridFS,
  toSelfProfile,
  toPublicProfile,
} from "../utils/userHelpers";
import { loggingTheAction } from "../utils/auditLogger";

/* ── GET /api/users/me ───────────────────────────────── */

export async function getMe(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const user = await findUserByIdOrRespond(req.userId, res);
  if (!user) return;

  res.status(200).json({ data: toSelfProfile(user) });
}

/* ── PATCH /api/users/me ─────────────────────────────── */

export async function updateMe(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const user = await findUserByIdOrRespond(req.userId, res);
  if (!user) return;

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

/* ── POST /api/users/me/photo ────────────────────────── */

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
  if (!user) return;

  await removePreviousPhoto(user);

  const newPhotoId = await uploadPhotoToGridFS(req.file, req.userId);
  user.profilePhotoFileId = newPhotoId;
  await user.save();

  res.status(200).json({ data: toSelfProfile(user) });
}

/* ── GET /api/users/:id/photo ────────────────────────── */

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
  if (!user) return;

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

/* ── GET /api/users/:id/profile ──────────────────────── */

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
  if (!user) return;

  res.status(200).json({ data: toPublicProfile(user) });
}

/* ── DELETE /api/users/me ────────────────────────────── */

export async function deleteMyself(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  if (await isLastAdmin(req.userId)) {
    res.status(409).json({ error: "Cannot delete the last admin or superadmin account." });
    return;
  }

  await User.findByIdAndDelete(req.userId);
  await AdminRequest.deleteMany({ userId: req.userId });
  await loggingTheAction(req.userId, "DELETE_THE_USER", req.userId);

  res.status(200).json({ data: { message: "Account deleted successfully." } });
}
