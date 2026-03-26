import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export interface AuthRequest extends Request {
  userId?: string;
}

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
    const response = await fetch(`${config.userServiceUrl}/api/users/me`, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    const json = (await response.json()) as {
      data?: { id?: string };
    };

    if (!json.data?.id) {
      res.status(401).json({ error: "Invalid token payload." });
      return;
    }

    req.userId = json.data.id;
    next();
  } catch {
    res
      .status(502)
      .json({ error: "Unable to reach User Service for authentication." });
  }
}
