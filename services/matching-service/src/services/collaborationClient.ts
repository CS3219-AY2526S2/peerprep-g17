import { config } from "../config";
import { MatchHandoffPayload } from "../types";

export class CollaborationClient {
  async handoffMatch(payload: MatchHandoffPayload): Promise<void> {
    if (config.collaborationServiceStub) {
      return;
    }

    const response = await fetch(
      `${config.collaborationServiceUrl}/api/sessions/handoff`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-service-token": config.internalServiceToken,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error("Collaboration Service handoff failed.");
    }
  }
}
