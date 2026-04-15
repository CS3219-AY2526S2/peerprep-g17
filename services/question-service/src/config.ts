/**
 * Centralized configuration for the Question Service.
 * All environment variables and constants are surfaced here.
 */

export const config = {
  port: Number(process.env.PORT) || 8080,

  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/question-service",

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:5173",
  ],

  userServiceUrl:
    process.env.USER_SERVICE_URL || "http://localhost:8081",

  internalServiceToken:
    process.env.INTERNAL_SERVICE_TOKEN || "dev-internal-service-token",
} as const;
