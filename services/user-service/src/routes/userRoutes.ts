import { Router } from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";
import { parseProfilePhotoUpload } from "../middleware/photoUploadMiddleware";
import {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  uploadMePhoto,
  getUserPhoto,
  getUserPublicProfile,
  getAllUsers,
  getUser,
  updateUser,
  updateUserRole,
  deleteUser,
} from "../controllers/userController";

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// User authenticated routes
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateMe);
router.post("/me/photo", verifyToken, parseProfilePhotoUpload, uploadMePhoto);
router.get("/:id/profile", verifyToken, getUserPublicProfile);
router.get("/:id/photo", verifyToken, getUserPhoto);
router.get("/:id", verifyToken, getUser);
router.patch("/:id", verifyToken, updateUser);

// Admin-only routes
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.patch("/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

export default router;
