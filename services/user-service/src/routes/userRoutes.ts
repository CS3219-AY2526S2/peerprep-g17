import { Router, Request } from "express";
import { rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";
import { parseProfilePhotoUpload } from "../middleware/photoUploadMiddleware";
import { registerUser, loginUser } from "../controllers/authController";
import {
  getMe,
  updateMe,
  uploadMePhoto,
  getUserPhoto,
  getUserPublicProfile,
  deleteMyself,
} from "../controllers/profileController";
import {
  getAllUsers,
  getUser,
  updateUser,
  updateUserRole,
  deleteUser,
  createAdminRequest,
  getMyAdminRequests,
  getAdminRequests,
  reviewAdminRequest,
} from "../controllers/adminController";
import passportConfig from "../config/passport";
import AuditLogs from "../models/AuditLogs";
import { config } from "../config";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost";

// ── Rate limiter for auth endpoints ─────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  validate: { xForwardedForHeader: false },
});

// ── Public routes ───────────────────────────────────
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

// ── Authenticated "me" routes ──────────────────────
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateMe);
router.post("/me/photo", verifyToken, parseProfilePhotoUpload, uploadMePhoto);
router.delete("/me", verifyToken, deleteMyself);

// ── Admin request routes (authenticated) ───────────
router.post("/admin-requests", verifyToken, createAdminRequest);
router.get("/admin-requests/me", verifyToken, getMyAdminRequests);
router.get("/admin-requests", verifyToken, verifyAdmin, getAdminRequests);
router.patch("/admin-requests/:id", verifyToken, verifyAdmin, reviewAdminRequest);

// ── Audit logs (admin only) ─────────────────────────
router.get("/audit/logs", verifyToken, verifyAdmin, async (_req, res) => {
  const logs = await AuditLogs.find()
    .populate("performedBy", "email username")
    .populate("targetUser", "email username")
    .sort({ timeStamp: -1 })
    .limit(30);
  res.json({ data: logs });
});

// ── Admin-only: user list ───────────────────────────
router.get("/", verifyToken, verifyAdmin, getAllUsers);

// ── Parameterized user routes ──────────────────────
router.get("/:id/profile", getUserPublicProfile);
router.get("/:id/photo", getUserPhoto);
router.get("/:id", verifyToken, getUser);
router.patch("/:id", verifyToken, updateUser);

// ── Admin-only: user management ─────────────────────
router.patch("/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

router.get(
  "/auth/google",
  passportConfig.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/auth/google/callback",
  passportConfig.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/login`,
    session: false,
  }),
  (req, res) => {
    const user = req.user as { _id: string };
    const token = jwt.sign({ id: user._id }, config.jwtSecret, {
      expiresIn: "48h",
    });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=github`);
  },
);

router.get(
  "/auth/github",
  passportConfig.authenticate("github", {
    scope: ["user:email"],
    session: false,
  }),
);

router.get(
  "/auth/github/callback",
  passportConfig.authenticate("github", {
    failureRedirect: `${FRONTEND_URL}/login`,
    session: false,
  }),
  (req, res) => {
    const user = req.user as { _id: string };
    const token = jwt.sign({ id: user._id }, config.jwtSecret, {
      expiresIn: "48h",
    });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=github`);
  },
);

export default router;
