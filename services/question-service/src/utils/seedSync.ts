import Question from "../models/Question";
import { SEED_QUESTIONS } from "../data/seedQuestions";

const EXECUTION_FIELDS = {
  executionMode: 1,
  starterCode: 1,
  visibleTestCases: 1,
  hiddenTestCases: 1,
  judgeConfig: 1,
} as const;

export async function syncSeedQuestionExecutionMetadata(): Promise<number> {
  const existingQuestions = await Question.find(
    {},
    { title: 1, ...EXECUTION_FIELDS },
  ).lean();

  const updates = existingQuestions
    .map((question) => {
      const seed = SEED_QUESTIONS.find((entry) => entry.title === question.title);
      if (!seed) {
        return null;
      }

      const needsUpdate =
        question.executionMode !== seed.executionMode ||
        JSON.stringify(question.starterCode || { python: "" }) !==
          JSON.stringify(seed.starterCode || { python: "" }) ||
        JSON.stringify(question.visibleTestCases || []) !==
          JSON.stringify(seed.visibleTestCases || []) ||
        JSON.stringify(question.hiddenTestCases || []) !==
          JSON.stringify(seed.hiddenTestCases || []) ||
        JSON.stringify(question.judgeConfig || null) !==
          JSON.stringify(seed.judgeConfig || null);

      if (!needsUpdate) {
        return null;
      }

      return {
        updateOne: {
          filter: { _id: question._id },
          update: {
            $set: {
              executionMode: seed.executionMode,
              starterCode: seed.starterCode,
              visibleTestCases: seed.visibleTestCases,
              hiddenTestCases: seed.hiddenTestCases,
              judgeConfig: seed.judgeConfig,
            },
          },
        },
      };
    })
    .filter(Boolean);

  if (updates.length === 0) {
    return 0;
  }

  const result = await Question.bulkWrite(
    updates as unknown as Parameters<typeof Question.bulkWrite>[0],
  );

  return result.modifiedCount;
}
