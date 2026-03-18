import { Router } from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware";
import {
  createQuestion,
  getAllQuestions,
  updateQuestion,
  deleteQuestion
} from "../controllers/questionController";

const router = Router();

// CREATE
router.post("/create", verifyToken, verifyAdmin, createQuestion);

// READ
router.get("/", verifyToken, verifyAdmin, getAllQuestions);

// UPDATE
router.patch("/:id", verifyToken, verifyAdmin, updateQuestion);

// DELETE
router.delete("/:id", verifyToken, verifyAdmin, deleteQuestion);

/*
// READ (can be implemented in the future)
router.get("/:id", retrieveQuestion);
*/

export default router;
