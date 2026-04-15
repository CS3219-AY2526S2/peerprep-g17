import { Request, Response, NextFunction } from "express";
import { config } from "../config";

/* ── Types ───────────────────────────────────────────── */

enum Role {
  USER = "user",
  ADMIN = "admin",
  SUPERADMIN = "superadmin",
}

/**
 * Extends Express Request with the authenticated user's identity
 * and role, populated by `verifyToken`.
 */
export interface AuthRequest extends Request {
  userId?: string;
  role?: Role;
}

/* ── Middleware ───────────────────────────────────────── */

/**
 * Verifies the caller's JWT by forwarding it to the User Service.
 *
 * The User Service's `GET /api/users/me` endpoint validates the
 * token and returns the DB-fresh user record, so role changes are
 * reflected immediately across services.
 */
export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  try {
    const response = await fetch(
      `${config.userServiceUrl}/api/users/me`,
      { headers: { Authorization: authHeader } },
    );

    if (!response.ok) {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    const json = (await response.json()) as {
      data?: { id?: string; role?: string };
    };

    if (!json.data?.id) {
      res.status(401).json({ error: "Invalid token payload." });
      return;
    }

    req.userId = json.data.id;
    req.role = (json.data.role as Role) || Role.USER;
    next();
  } catch {
    res
      .status(502)
      .json({ error: "Unable to reach User Service for authentication." });
  }
}

/**
 * Ensures the authenticated user has admin privileges.
 * Must be chained **after** `verifyToken`.
 */
export function verifyAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.role !== Role.ADMIN && req.role !== Role.SUPERADMIN) {
    res
      .status(403)
      .json({ error: "Access denied. Admin privileges required." });
    return;
  }

  next();
}
