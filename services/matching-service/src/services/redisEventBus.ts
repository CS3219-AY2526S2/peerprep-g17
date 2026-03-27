import Redis from "ioredis";
import { MatchEventEnvelope, MatchStatusEvent } from "../types";

export class RedisMatchEventBus {
  constructor(
    private readonly publisher: Redis,
    private readonly subscriber: Redis,
    private readonly channel: string,
  ) {}

  async publish(userId: string, event: MatchStatusEvent): Promise<void> {
    const envelope: MatchEventEnvelope = { userId, event };
    await this.publisher.publish(this.channel, JSON.stringify(envelope));
  }

  async subscribe(
    onMessage: (event: MatchEventEnvelope) => void,
  ): Promise<void> {
    this.subscriber.on("message", (channel, payload) => {
      if (channel !== this.channel) {
        return;
      }

      try {
        const parsed = JSON.parse(payload) as MatchEventEnvelope;
        onMessage(parsed);
      } catch {
        // Ignore malformed pub/sub messages.
      }
    });

    await this.subscriber.subscribe(this.channel);
  }

  async close(): Promise<void> {
    await this.subscriber.unsubscribe(this.channel);
  }
}
