import { config } from "../config";
import { DIFFICULTIES, Difficulty, SelectedQuestion } from "../types";

interface QuestionServiceResponse {
  data?: Array<{
    id: string;
    title: string;
    difficulty: string;
    categories: string[];
    executionMode?: string;
  }>;
  meta?: {
    categories?: string[];
  };
}

const SUPPORTED_EXECUTION_MODES = ["python_function", "python_class"].join(",");

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

function getFallbackDifficultyOrder(difficulty: Difficulty): Difficulty[] {
  return [...DIFFICULTIES].sort((left, right) => {
    const leftDistance = Math.abs(
      DIFFICULTY_RANK[left] - DIFFICULTY_RANK[difficulty],
    );
    const rightDistance = Math.abs(
      DIFFICULTY_RANK[right] - DIFFICULTY_RANK[difficulty],
    );

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return DIFFICULTY_RANK[left] - DIFFICULTY_RANK[right];
  });
}

export class QuestionCatalogService {
  private cachedTopics: string[] | null = null;
  private cacheExpiresAt = 0;

  async validateTopic(authHeader: string, topic: string): Promise<boolean> {
    const topics = await this.getAllowedTopics(authHeader);
    return topics.includes(topic);
  }

  async getAllowedTopics(authHeader: string): Promise<string[]> {
    const now = Date.now();
    if (this.cachedTopics && now < this.cacheExpiresAt) {
      return this.cachedTopics;
    }

    const url = new URL(`${config.questionServiceUrl}/api/questions`);
    url.searchParams.set("executionModes", SUPPORTED_EXECUTION_MODES);
    const response = await fetch(url, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      throw new Error("Unable to fetch topics from Question Service.");
    }

    const json = (await response.json()) as QuestionServiceResponse;
    this.cachedTopics = json.meta?.categories || [];
    this.cacheExpiresAt = now + config.topicCacheTtlMs;

    return this.cachedTopics;
  }

  async selectQuestion(
    authHeader: string,
    topic: string,
    difficulty: Difficulty,
  ): Promise<SelectedQuestion | null> {
    for (const currentDifficulty of getFallbackDifficultyOrder(difficulty)) {
      const url = new URL(`${config.questionServiceUrl}/api/questions`);
      url.searchParams.set("difficulty", currentDifficulty);
      url.searchParams.set("categories", topic);
      url.searchParams.set("executionModes", SUPPORTED_EXECUTION_MODES);

      const response = await fetch(url, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        throw new Error("Unable to fetch questions from Question Service.");
      }

      const json = (await response.json()) as QuestionServiceResponse;
      const first = json.data?.[0];
      if (first) {
        return {
          id: first.id,
          difficulty: currentDifficulty,
          title: first.title,
        };
      }
    }

    return null;
  }
}
