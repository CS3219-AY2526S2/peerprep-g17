export const config = {
  port: Number(process.env.PORT) || 8083,
  instanceId: process.env.INSTANCE_ID || `collab-${process.pid}`,

  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/collaboration-service",

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:5173",
  ],

  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",

  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:8081",
  questionServiceUrl:
    process.env.QUESTION_SERVICE_URL || "http://localhost:8080",
  matchingServiceUrl:
    process.env.MATCHING_SERVICE_URL || "http://localhost:8082",

  internalServiceToken:
    process.env.INTERNAL_SERVICE_TOKEN || "dev-internal-service-token",

  pistonUrl: process.env.PISTON_URL || "http://localhost:2000",
  pistonMaxTimeoutMs: Number(process.env.PISTON_MAX_TIMEOUT_MS) || 3_000,
  executionSourceSizeLimitBytes:
    Number(process.env.EXECUTION_SOURCE_SIZE_LIMIT_BYTES) || 100_000,
  executionOutputLimitBytes:
    Number(process.env.EXECUTION_OUTPUT_LIMIT_BYTES) || 65_536,
  inactivityWarningThresholdMs:
    Number(process.env.INACTIVITY_WARNING_THRESHOLD_MS) || 60_000,
  inactivityTerminationCountdownMs:
    Number(process.env.INACTIVITY_TERMINATION_COUNTDOWN_MS) || 60_000,

} as const;
