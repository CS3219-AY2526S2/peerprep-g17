import mongoose from "mongoose";
import { DIFFICULTIES, CATEGORIES } from "../models/Question";

type Difficulty = (typeof DIFFICULTIES)[number];
type Category = (typeof CATEGORIES)[number];

/**
 * Returns true if the given string is a valid MongoDB ObjectId.
 */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Returns a list of category names that are NOT in the allowed enum.
 * Returns an empty array if all categories are valid.
 */
export function findInvalidCategories(categories: string[]): string[] {
  return categories.filter(
    (category) => !CATEGORIES.includes(category as Category),
  );
}

/**
 * Returns true if the given difficulty value is valid.
 */
export function isValidDifficulty(difficulty: string): boolean {
  return DIFFICULTIES.includes(difficulty as Difficulty);
}

/**
 * Builds a MongoDB filter object from query-string parameters.
 *
 * Supported filters:
 *   - `difficulty`  — exact match (e.g. `?difficulty=Easy`)
 *   - `categories`  — comma-separated, AND match (e.g. `?categories=Arrays,Algorithms`)
 *   - `search`      — case-insensitive regex on title (e.g. `?search=Two`)
 */
export function buildFilterQuery(query: {
  difficulty?: unknown;
  categories?: unknown;
  search?: unknown;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (typeof query.difficulty === "string" && query.difficulty) {
    filter.difficulty = query.difficulty;
  }

  if (typeof query.categories === "string" && query.categories) {
    const requestedCategories = query.categories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (requestedCategories.length > 0) {
      filter.categories = { $all: requestedCategories };
    }
  }

  if (typeof query.search === "string" && query.search.trim()) {
    filter.title = { $regex: query.search.trim(), $options: "i" };
  }

  return filter;
}

/**
 * Formats a Mongoose document (or plain aggregation object) into
 * the standardized API response shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatQuestionResponse(question: any) {
  const doc =
    typeof question.toObject === "function"
      ? question.toObject()
      : question;

  return {
    id: String(doc._id),
    title: doc.title,
    difficulty: doc.difficulty,
    categories: doc.categories,
    description: doc.description,
    examples: doc.examples || [],
    link: doc.link || "",
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
  };
}
