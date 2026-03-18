import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";
import { parseProfilePhotoUpload } from "../middleware/photoUploadMiddleware";
import { deleteMyself } from "../controllers/userController";

import {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  uploadMePhoto,
  createAdminRequest,
  getMyAdminRequests,
  getAdminRequests,
  reviewAdminRequest,
  getUserPhoto,
  getUserPublicProfile,
  getAllUsers,
  getUser,
  updateUser,
  updateUserRole,
  deleteUser,
} from "../controllers/userController";
import AuditLogs from "../models/AuditLogs";

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes 
  limit: 15, // 20 times 
  keyGenerator: (requirement) => {
    return requirement.body.identifier || requirement.body.email || requirement.ip
  },  message: { error: "Too many login attempts, please try again later." }
});

// Public routes
router.post("/register", limiter, registerUser);
router.post("/login", limiter, loginUser);

// User authenticated routes
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateMe);
router.post("/me/photo", verifyToken, parseProfilePhotoUpload, uploadMePhoto);
router.post("/admin-requests", verifyToken, createAdminRequest);
router.get("/admin-requests/me", verifyToken, getMyAdminRequests);
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.get("/admin-requests", verifyToken, verifyAdmin, getAdminRequests);
router.patch(
  "/admin-requests/:id",
  verifyToken,
  verifyAdmin,
  reviewAdminRequest,
);

// User authenticated routes (parameterized)
router.get("/:id/profile", verifyToken, getUserPublicProfile);
router.get("/:id/photo", verifyToken, getUserPhoto);
router.get("/:id", verifyToken, getUser);
router.patch("/:id", verifyToken, updateUser);

// Admin-only routes (parameterized)
router.patch("/:id/role", verifyToken, verifyAdmin, updateUserRole);
router.delete("/me", verifyToken, deleteMyself);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

// Get the logs
router.get("/audit/logs", verifyToken, verifyAdmin, async (request, response) => {
  const theLogs = await AuditLogs.find()
                                 .populate("performedBy", "email username")
                                 .populate("targetUser", "email username")
                                 .sort({ timestamp: -1})
                                 .limit(30);
  response.json({ data: theLogs })
});


export default router;
