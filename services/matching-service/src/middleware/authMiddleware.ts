import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export interface AuthRequest extends Request {
  userId?: string;
  authHeader?: string;
}

export async function resolveUserFromAuthHeader(
  authHeader?: string,
): Promise<{ userId: string } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const response = await fetch(`${config.userServiceUrl}/api/users/me`, {
    headers: { Authorization: authHeader },
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    data?: { id?: string };
  };

  if (!json.data?.id) {
    return null;
  }

  return { userId: json.data.id };
}

export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  try {
    const resolved = await resolveUserFromAuthHeader(authHeader);
    if (!resolved) {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    req.userId = resolved.userId;
    req.authHeader = authHeader;
    next();
  } catch {
    res
      .status(502)
      .json({ error: "Unable to reach User Service for authentication." });
  }
}
