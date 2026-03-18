import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { Role } from "../models/User";
import { config } from "../config";

/**
 * Extends the Express Request type so we can attach the decoded
 * auth context (userId and current role) after verification.
 */

export interface AuthRequest extends Request {
  userId?: string;
  role?: Role;
}

/**
 * Verifies the JWT from the Authorization header.
 * Attaches userId and DB-fresh role to the request object for downstream use.
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

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id?: string };
    if (!decoded.id) {
      res.status(401).json({ error: "Invalid token payload." });
      return;
    }

    const user = await User.findById(decoded.id).select("_id role");
    if (!user) {
      res.status(401).json({ error: "Invalid token user." });
      return;
    }

    req.userId = String(user._id);
    req.role = user.role;
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
