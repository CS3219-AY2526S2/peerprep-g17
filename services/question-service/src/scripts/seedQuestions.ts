import "dotenv/config";
import mongoose from "mongoose";
import Question from "../models/Question";
import { SEED_QUESTIONS } from "../data/seedQuestions";

async function run(): Promise<void> {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/question-service";

  await mongoose.connect(mongoUri);
  console.log("Seed script — Connected to MongoDB");

  try {
    const existingCount = await Question.countDocuments();

    if (existingCount > 0) {
      console.log(
        `Database already contains ${existingCount} questions. Skipping seed.`,
      );
      console.log("To re-seed, drop the questions collection first.");
      return;
    }

    const result = await Question.insertMany(SEED_QUESTIONS);
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
