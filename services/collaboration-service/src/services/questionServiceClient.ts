import { config } from "../config";
import type { JudgeQuestion } from "../types";

export class QuestionServiceClient {
  async getQuestion(questionId: string): Promise<JudgeQuestion> {
    const response = await fetch(
      `${config.questionServiceUrl}/api/questions/${questionId}/judge`,
      {
        headers: {
          "x-internal-service-token": config.internalServiceToken,
        },
      },
    );

    const json = (await response.json()) as {
      data?: JudgeQuestion;
      error?: string;
    };

    if (!response.ok || !json.data) {
      throw new Error(json.error || "Failed to fetch question.");
    }

    return json.data;
  }

  async getQuestionJudge(questionId: string): Promise<JudgeQuestion> {
    const response = await fetch(
      `${config.questionServiceUrl}/api/questions/${questionId}/judge`,
      {
        headers: {
          "x-internal-service-token": config.internalServiceToken,
        },
      },
    );

    const json = (await response.json()) as {
      data?: JudgeQuestion;
      error?: string;
    };

    if (!response.ok || !json.data) {
      throw new Error(json.error || "Failed to fetch question judge metadata.");
    }

    return json.data;
  }
}
