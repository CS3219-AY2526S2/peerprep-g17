import { NextFunction, Response } from "express";
import multer from "multer";
import { AuthRequest } from "./authMiddleware";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Invalid file type. Only JPEG, PNG, and WEBP are allowed."));
      return;
    }

    callback(null, true);
  },
});

export function parseProfilePhotoUpload(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  photoUpload.single("photo")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Image must be 5MB or smaller." });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(400).json({ error: "Invalid photo upload." });
  });
}
