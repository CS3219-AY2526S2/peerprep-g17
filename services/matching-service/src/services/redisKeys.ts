import { Difficulty } from "../types";

function encodeTopic(topic: string): string {
  return encodeURIComponent(topic);
}

export function queueKey(topic: string, difficulty: Difficulty): string {
  return `match:queue:${encodeTopic(topic)}:${difficulty}`;
}

export function requestKey(requestId: string): string {
  return `match:request:${requestId}`;
}

export function userRequestKey(userId: string): string {
  return `match:user-request:${userId}`;
}

export function userLockKey(userId: string): string {
  return `match:lock:user:${userId}`;
}

export function bucketLockKey(topic: string, difficulty: Difficulty): string {
  return `match:lock:bucket:${encodeTopic(topic)}:${difficulty}`;
}

export const timeoutZsetKey = "match:timeouts";
export const relaxationT1ZsetKey = "match:relaxation:t1";
export const relaxationT2ZsetKey = "match:relaxation:t2";
