import { Router } from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";
import { parseProfilePhotoUpload } from "../middleware/photoUploadMiddleware";
import { registerUser, loginUser } from "../controllers/authController";
import {
  getMe,
  updateMe,
  uploadMePhoto,
  getUserPhoto,
  getUserPublicProfile,
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

const router = Router();

// ── Public routes ───────────────────────────────────
router.post("/register", registerUser);
router.post("/login", loginUser);

// ── Authenticated "me" routes ──────────────────────
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateMe);
router.post("/me/photo", verifyToken, parseProfilePhotoUpload, uploadMePhoto);

// ── Admin request routes (authenticated) ───────────
router.post("/admin-requests", verifyToken, createAdminRequest);
router.get("/admin-requests/me", verifyToken, getMyAdminRequests);
router.get("/admin-requests", verifyToken, verifyAdmin, getAdminRequests);
router.patch(
  "/admin-requests/:id",
  verifyToken,
  verifyAdmin,
  reviewAdminRequest,
);

// ── Admin-only: user list ───────────────────────────
router.get("/", verifyToken, verifyAdmin, getAllUsers);

// ── Parameterized user routes ──────────────────────
router.get("/:id/profile", verifyToken, getUserPublicProfile);
router.get("/:id/photo", verifyToken, getUserPhoto);
router.get("/:id", verifyToken, getUser);
router.patch("/:id", verifyToken, updateUser);

// ── Admin-only: user management ─────────────────────
router.patch("/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

export default router;
