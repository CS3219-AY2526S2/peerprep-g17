export const config = {
  port: Number(process.env.PORT) || 8083,

  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/collaboration-service",

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:5173",
  ],

  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",

  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:8081",
  matchingServiceUrl:
    process.env.MATCHING_SERVICE_URL || "http://localhost:8082",

  internalServiceToken:
    process.env.INTERNAL_SERVICE_TOKEN || "dev-internal-service-token",
} as const;