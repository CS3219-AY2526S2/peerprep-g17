export const config = {
  port: Number(process.env.PORT) || 8082,

  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/matching-service",

  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:5173",
  ],

  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:8081",
  questionServiceUrl:
    process.env.QUESTION_SERVICE_URL || "http://localhost:8080",
  collaborationServiceUrl:
    process.env.COLLABORATION_SERVICE_URL || "http://localhost:8083",

  collaborationServiceStub: process.env.COLLABORATION_SERVICE_STUB === "true",

  internalServiceToken:
    process.env.INTERNAL_SERVICE_TOKEN || "dev-internal-service-token",

  matchRequestTimeoutMs: Number(process.env.MATCH_REQUEST_TIMEOUT_MS) || 180000,
  relaxationT1Ms: Number(process.env.MATCH_RELAXATION_T1_MS) || 30000,
  relaxationT2Ms: Number(process.env.MATCH_RELAXATION_T2_MS) || 60000,
  recentPartnerRelaxationMs:
    Number(process.env.MATCH_RECENT_PARTNER_RELAXATION_MS) || 120000,
  timeoutPollIntervalMs:
    Number(process.env.MATCH_TIMEOUT_POLL_INTERVAL_MS) || 1000,
  relaxationPollIntervalMs:
    Number(process.env.RELAXATION_POLL_INTERVAL_MS) || 1000,
  lockTtlMs: Number(process.env.MATCH_LOCK_TTL_MS) || 5000,
  topicCacheTtlMs: Number(process.env.TOPIC_CACHE_TTL_MS) || 60000,
  matchEventChannel: process.env.MATCH_EVENT_CHANNEL || "match:events",
  wsPath: process.env.MATCH_WS_PATH || "/ws/matches",
} as const;
