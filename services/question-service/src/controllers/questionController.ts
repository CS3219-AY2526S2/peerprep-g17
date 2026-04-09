import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import Question, { DIFFICULTIES, CATEGORIES } from "../models/Question";
import { SEED_QUESTIONS } from "../data/seedQuestions";
import {
  isValidObjectId,
  isValidDifficulty,
  findInvalidCategories,
  buildFilterQuery,
  formatQuestionResponse,
  formatQuestionJudgeResponse,
} from "../utils/questionHelpers";

/* ── CREATE ───────────────────────────────────────────── */

/**
 * POST /api/questions
 * Creates a new question. Admin-only.
 */
export async function createQuestion(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const {
    title,
    difficulty,
    categories,
    description,
    examples,
    link,
    executionMode,
    starterCode,
    visibleTestCases,
    hiddenTestCases,
    judgeConfig,
  } =
    req.body;

  // ── Guard: required fields
  if (!title || !difficulty || !description) {
    res
      .status(400)
      .json({ error: "Title, difficulty, and description are required." });
    return;
  }

  // ── Guard: categories must be a non-empty array
  if (!Array.isArray(categories) || categories.length === 0) {
    res.status(400).json({ error: "At least one category is required." });
    return;
  }

  // ── Guard: validate enum values
  if (!isValidDifficulty(difficulty)) {
    res.status(400).json({
      error: `Invalid difficulty. Must be one of: ${DIFFICULTIES.join(", ")}.`,
    });
    return;
  }

  const invalidCategories = findInvalidCategories(categories);
  if (invalidCategories.length > 0) {
    res.status(400).json({
      error: `Invalid categories: ${invalidCategories.join(", ")}. Valid categories are: ${CATEGORIES.join(", ")}.`,
    });
    return;
  }

  // ── Guard: duplicate title
  const existingQuestion = await Question.findOne({ title });
  if (existingQuestion) {
    res
      .status(409)
      .json({ error: "A question with this title already exists." });
    return;
  }

  // ── Persist
  try {
    const question = await Question.create({
      title,
      difficulty,
      categories,
      description,
      examples: examples || [],
      link: link || "",
      executionMode: executionMode || "unsupported",
      starterCode: starterCode || { python: "" },
      visibleTestCases: visibleTestCases || [],
      hiddenTestCases: hiddenTestCases || [],
      judgeConfig: judgeConfig || null,
    });

    res.status(201).json({ data: formatQuestionResponse(question) });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const firstMessage = Object.values(error.errors)[0]?.message;
      res.status(400).json({ error: firstMessage || "Validation failed." });
      return;
    }

    res.status(500).json({ error: "Failed to create question." });
  }
}

/* ── READ (all) ───────────────────────────────────────── */

/**
 * GET /api/questions
 * Returns questions filtered by query params, sorted Easy → Hard.
 */
export async function getAllQuestions(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const filter = buildFilterQuery(req.query);

  const questions = await Question.aggregate([
    { $match: filter },
    {
      $addFields: {
        difficultyOrder: {
          $switch: {
            branches: [
              { case: { $eq: ["$difficulty", "Easy"] }, then: 0 },
              { case: { $eq: ["$difficulty", "Medium"] }, then: 1 },
              { case: { $eq: ["$difficulty", "Hard"] }, then: 2 },
            ],
            default: 3,
          },
        },
      },
    },
    { $sort: { difficultyOrder: 1, title: 1 } },
    { $project: { difficultyOrder: 0 } },
  ]);

  const filteredCategories =
    typeof req.query.executionModes === "string" && req.query.executionModes.trim()
      ? [
          ...new Set(
            questions.flatMap((question) =>
              Array.isArray(question.categories) ? question.categories : [],
            ),
          ),
        ].sort()
      : [...CATEGORIES];

  res.status(200).json({
    data: questions.map(formatQuestionResponse),
    meta: {
      total: questions.length,
      difficulties: [...DIFFICULTIES],
      categories: filteredCategories,
    },
  });
}

/* ── READ (single) ────────────────────────────────────── */

/**
 * GET /api/questions/:id
 * Returns a single question by its MongoDB ObjectId.
 */
export async function getQuestionById(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  if (!isValidObjectId(String(id))) {
    res.status(400).json({ error: "Invalid question id." });
    return;
  }

  const question = await Question.findById(id);
  if (!question) {
    res.status(404).json({ error: "Question not found." });
    return;
  }

  res.status(200).json({ data: formatQuestionResponse(question) });
}

export async function getQuestionJudgeById(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  if (!isValidObjectId(String(id))) {
    res.status(400).json({ error: "Invalid question id." });
    return;
  }

  const question = await Question.findById(id);
  if (!question) {
    res.status(404).json({ error: "Question not found." });
    return;
  }

  res.status(200).json({ data: formatQuestionJudgeResponse(question) });
}

/* ── UPDATE ───────────────────────────────────────────── */

/**
 * PATCH /api/questions/:id
 * Partially updates a question. Admin-only.
 */
export async function updateQuestion(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { id } = req.params;
  const {
    title,
    difficulty,
    categories,
    description,
    examples,
    link,
    executionMode,
    starterCode,
    visibleTestCases,
    hiddenTestCases,
    judgeConfig,
  } = req.body;

  // ── Guard: valid ObjectId
  if (!isValidObjectId(String(id))) {
    res.status(400).json({ error: "Invalid question id." });
    return;
  }

  // ── Guard: at least one field must be provided
  if (
    !title &&
    !difficulty &&
    !categories &&
    !description &&
    examples === undefined &&
    link === undefined &&
    executionMode === undefined &&
    starterCode === undefined &&
    visibleTestCases === undefined &&
    hiddenTestCases === undefined &&
    judgeConfig === undefined
  ) {
    res
      .status(400)
      .json({ error: "At least one field to update must be provided." });
    return;
  }

  // ── Guard: validate difficulty if provided
  if (difficulty && !isValidDifficulty(difficulty)) {
    res.status(400).json({
      error: `Invalid difficulty. Must be one of: ${DIFFICULTIES.join(", ")}.`,
    });
    return;
  }

  // ── Guard: validate categories if provided
  if (categories) {
    if (!Array.isArray(categories) || categories.length === 0) {
      res
        .status(400)
        .json({ error: "Categories must be a non-empty array." });
      return;
    }

    const invalidCategories = findInvalidCategories(categories);
    if (invalidCategories.length > 0) {
      res.status(400).json({
        error: `Invalid categories: ${invalidCategories.join(", ")}.`,
      });
      return;
    }
  }

  // ── Guard: duplicate title
  if (title) {
    const duplicate = await Question.findOne({
      title,
      _id: { $ne: new mongoose.Types.ObjectId(String(id)) },
    });

    if (duplicate) {
      res
        .status(409)
        .json({ error: "A question with this title already exists." });
      return;
    }
  }

  // ── Build update payload (only include provided fields)
  const updatePayload: Record<string, unknown> = {};
  if (title) updatePayload.title = title;
  if (difficulty) updatePayload.difficulty = difficulty;
  if (categories) updatePayload.categories = categories;
  if (description) updatePayload.description = description;
  if (examples !== undefined) updatePayload.examples = examples;
  if (link !== undefined) updatePayload.link = link;
  if (executionMode !== undefined) updatePayload.executionMode = executionMode;
  if (starterCode !== undefined) updatePayload.starterCode = starterCode;
  if (visibleTestCases !== undefined)
    updatePayload.visibleTestCases = visibleTestCases;
  if (hiddenTestCases !== undefined)
    updatePayload.hiddenTestCases = hiddenTestCases;
  if (judgeConfig !== undefined) updatePayload.judgeConfig = judgeConfig;

  // ── Persist
  try {
    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true },
    );

    if (!updatedQuestion) {
      res.status(404).json({ error: "Question not found." });
      return;
    }

    res.status(200).json({ data: formatQuestionResponse(updatedQuestion) });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      const firstMessage = Object.values(error.errors)[0]?.message;
      res.status(400).json({ error: firstMessage || "Validation failed." });
      return;
    }

    res.status(500).json({ error: "Failed to update question." });
  }
}

/* ── DELETE ────────────────────────────────────────────── */

/**
 * DELETE /api/questions/:id
 * Deletes a question by its MongoDB ObjectId. Admin-only.
 */
export async function deleteQuestion(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  if (!isValidObjectId(String(id))) {
    res.status(400).json({ error: "Invalid question id." });
    return;
  }

  const question = await Question.findByIdAndDelete(id);

  if (!question) {
    res.status(404).json({ error: "Question not found." });
    return;
  }

  res
    .status(200)
    .json({ data: { message: "Question deleted successfully." } });
}

/* ── SEED ─────────────────────────────────────────────── */

/**
 * POST /api/questions/seed
 * Bulk-inserts the predefined seed questions, skipping any
 * that already exist (matched by title). Admin-only.
 */
export async function seedQuestions(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const existingTitles = new Set(
      (await Question.find({}, { title: 1 })).map((q) => q.title),
    );

    const questionsToInsert = SEED_QUESTIONS.filter(
      (q) => !existingTitles.has(q.title),
    );

    if (questionsToInsert.length === 0) {
      res.status(200).json({
        data: {
          message: "All seed questions already exist. Nothing to add.",
          inserted: 0,
        },
      });
      return;
    }

    const result = await Question.insertMany(questionsToInsert);

    res.status(201).json({
      data: {
        message: `Seeded ${result.length} questions successfully.`,
        inserted: result.length,
        skipped: SEED_QUESTIONS.length - result.length,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to seed questions." });
  }
}
