import { MatchService } from "./matchService";

export class TimeoutWorker {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly matchService: MatchService,
    private readonly pollIntervalMs: number,
  ) {}

  start(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      void this.matchService.processDueTimeouts();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (!this.intervalId) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}
