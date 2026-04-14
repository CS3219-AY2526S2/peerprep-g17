/**
 * Centralized configuration for the User Service.
 * All environment variables and constants are surfaced here.
 */

export const config = {
  port: Number(process.env.PORT) || 8081,

  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/user-service",

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:5173",
  ],

  jwtSecret: process.env.JWT_SECRET || "you-should-change-this-in-production",

  baseUrl: process.env.USER_SERVICE_BASE_URL || "http://localhost",

  /** Bcrypt cost factor. */
  saltRounds: 10,

  /** JWT token lifetime. */
  tokenExpiry: "72h" as const,
} as const;
