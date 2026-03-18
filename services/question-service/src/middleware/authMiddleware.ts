import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

enum Role {
  USER = "user",
  ADMIN = "admin",
}

const JWT_SECRET =
  process.env.JWT_SECRET || "you-should-change-this-in-production";

/**
 * Extends the Express Request type so we can attach the decoded
 * token payload (userId and role) after verification.
 */

export interface AuthRequest extends Request {
  userId?: string;
  role?: Role;
}

/**
 * Verifies the JWT from the Authorization header.
 * Attaches userId and role to the request object for downstream use.
 */

export function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: Role };
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }
}

/**
 * Checks that the authenticated user has the admin role.
 * Must be used AFTER verifyToken in the middleware chain.
 */

export function verifyAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.role !== Role.ADMIN) {
    res
      .status(403)
      .json({ error: "Access denied. Admin privileges required." });
    return;
  }
  next();
}
