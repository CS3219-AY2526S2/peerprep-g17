import { Router } from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/userController";

const router = Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// User authenticated routes
router.get("/:id", verifyToken, getUser);
router.patch("/:id", verifyToken, updateUser);

// Admin-only routes
router.get("/", verifyToken, verifyAdmin, getAllUsers);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

export default router;
