import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import Question from "../models/Question";

// CREATE
// ── POST /api/questions/create
export async function createQuestion(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { title, difficulty, topic, description } = req.body;

  if (!title || !difficulty || !description) {
    res
      .status(400)
      .json({ error: "Title, topic, and difficulty and required." });
    return;
  }

  const existingQuestion = await Question.findOne({ title });
  if (existingQuestion) {
    res.status(409).json({ error: "Title already exists"});
    return;
  };

  const question = await Question.create({
    title,
    difficulty,
    topic,
    description,
  });

  res.status(201).json({
    data: {
      id: question.id,
      title: question.title,
      difficulty: question.difficulty,
      topic: question.topic,
      description: question.description,
    },
  });
}

// READ
// ── GET /api/questions
export async function getAllQuestions(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const questions = await Question.find();
  res.status(200).json({ data: questions });
}

// UPDATE
// ── PATCH /api/questions/:id
export async function updateQuestion(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { id } = req.params;
  const q = req.body;

  if (!id) {
    res
      .status(400)
      .json({ error: "Need question id." });
    return;
  }

  if (!q) {
    res
      .status(400)
      .json({ error: "Question needs to be specified." });
    return;
  }

  const existingQuestion = await Question.findById(id);
  if (!existingQuestion) {
    res.status(409).json({ error: "Question to be updated does not exist"});
    return;
  };

  await Question.deleteOne({id});
  const newQuestion = await Question.create(q);

  res.status(201).json({data: newQuestion});
}

// DELETE
// ── DELETE /api/questions/:id
export async function deleteQuestion(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  if (!id) {
    res
      .status(400)
      .json({ error: "id is required." });
    return;
  }

  const result = await Question.deleteOne({ _id: id });

  res.status(201).json({
    data: result
  });
}