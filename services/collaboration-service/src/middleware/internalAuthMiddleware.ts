import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function verifyInternalServiceToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const providedToken = req.headers["x-internal-service-token"];

  if (providedToken !== config.internalServiceToken) {
    res.status(401).json({ error: "Invalid internal service token." });
    return;
  }

  next();
}
