import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  id: string;
}

/**
 * Verifies a raw JWT string and returns the userId.
 * Throws if invalid or expired.
 */
export function verifyTokenString(token: string): string {
  const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
  return decoded.id;
}

/**
 * Express middleware — attaches userId to req on success.
 */
export function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided." });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.userId = verifyTokenString(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}