import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Question from "../models/Question";
import { SEED_QUESTIONS } from "../data/seedQuestions";
import { syncSeedQuestionExecutionMetadata } from "../utils/seedSync";

// Resolve JSON path relative to this file's location at runtime.
// In production the compiled file is at dist/scripts/seedQuestions.js,
// and the JSON is copied to dist/data/leetcode_questions.json by the Dockerfile.
const LEETCODE_JSON_PATH = path.resolve(
  __dirname,
  "../data/leetcode_questions.json",
);

interface LeetcodeQuestion {
  title: string;
  difficulty: string;
  categories: string[];
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  link: string;
  executionMode: "unsupported";
  starterCode: { python: string };
  visibleTestCases: unknown[];
  hiddenTestCases: unknown[];
  judgeConfig: null;
}

function loadLeetcodeQuestions(): LeetcodeQuestion[] {
  if (!fs.existsSync(LEETCODE_JSON_PATH)) {
    console.warn(
      `Warning: ${LEETCODE_JSON_PATH} not found. Skipping LeetCode questions.`,
    );
    return [];
  }
  const raw = fs.readFileSync(LEETCODE_JSON_PATH, "utf-8");
  return JSON.parse(raw) as LeetcodeQuestion[];
}

async function run(): Promise<void> {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/question-service";

  await mongoose.connect(mongoUri);
  console.log("Seed script — Connected to MongoDB");

  try {
    // Build the combined question list: original 48 (with execution metadata)
    // + LeetCode questions from JSON (excluding any title conflicts)
    const baseTitles = new Set(SEED_QUESTIONS.map((q) => q.title));
    const leetcodeQuestions = loadLeetcodeQuestions().filter(
      (q) => !baseTitles.has(q.title),
    );
    const allQuestions = [...SEED_QUESTIONS, ...leetcodeQuestions];

    const existingCount = await Question.countDocuments();

    if (existingCount > 0) {
      const updated = await syncSeedQuestionExecutionMetadata();

      // Insert any questions not yet in the DB
      const existingTitles = new Set(
        (await Question.find({}, { title: 1 }).lean()).map((q) => q.title),
      );
      const newQuestions = allQuestions.filter(
        (q) => !existingTitles.has(q.title),
      );
      if (newQuestions.length > 0) {
        await Question.insertMany(newQuestions);
        console.log(
          `Database had ${existingCount} questions. Added ${newQuestions.length} new questions. Updated execution metadata for ${updated} existing questions.`,
        );
      } else {
        console.log(
          `Database already contains ${existingCount} questions. Updated execution metadata for ${updated} existing questions.`,
        );
      }
      return;
    }

    const result = await Question.insertMany(allQuestions);
    console.log(`Seeded ${result.length} questions successfully.`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("Seed failed:", error);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
