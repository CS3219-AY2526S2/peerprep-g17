import { config } from "../config";
export class MatchingServiceClient {
  async completeSession(sessionId: string): Promise<void> {
    const response = await fetch(
      `${config.matchingServiceUrl}/api/matches/sessions/${sessionId}/complete`,
      {
        method: "PATCH",
        headers: {
          "x-internal-service-token": config.internalServiceToken,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to notify Matching Service about completion.");
    }
  }
}
