import { Router } from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";
import {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  seedQuestions,
} from "../controllers/questionController";

const router = Router();

// ── Read routes (any authenticated user) ────────────
router.get("/", verifyToken, getAllQuestions);
router.get("/:id", verifyToken, getQuestionById);

// ── Write routes (admin only) ───────────────────────
router.post("/", verifyToken, verifyAdmin, createQuestion);
router.post("/seed", verifyToken, verifyAdmin, seedQuestions);
router.patch("/:id", verifyToken, verifyAdmin, updateQuestion);
router.delete("/:id", verifyToken, verifyAdmin, deleteQuestion);

export default router;
