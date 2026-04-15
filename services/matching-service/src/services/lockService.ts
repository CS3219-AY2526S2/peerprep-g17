import { randomUUID } from "node:crypto";
import Redis from "ioredis";

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface HeldLock {
  key: string;
  token: string;
}

export class LockService {
  constructor(
    private readonly redis: Redis,
    private readonly ttlMs: number,
  ) {}

  async acquire(
    key: string,
    retries = 10,
    retryDelayMs = 25,
  ): Promise<HeldLock | null> {
    for (let attempt = 0; attempt < retries; attempt += 1) {
      const token = randomUUID();
      const result = await this.redis.set(key, token, "PX", this.ttlMs, "NX");
      if (result === "OK") {
        return { key, token };
      }

      await sleep(retryDelayMs);
    }

    return null;
  }

  async release(lock: HeldLock | null): Promise<void> {
    if (!lock) {
      return;
    }

    await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, lock.key, lock.token);
  }

  async releaseAll(locks: HeldLock[]): Promise<void> {
    for (let index = locks.length - 1; index >= 0; index -= 1) {
      await this.release(locks[index]);
    }
  }
}
