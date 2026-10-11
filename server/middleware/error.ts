import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { HttpError } from "../errors";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: "Endpoint not found." } });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      error: {
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "The file is too large (max 4 MB)."
            : "The upload failed. Please try again.",
      },
    });
    return;
  }

  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json({ error: { message: "Invalid JSON body." } });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: { message: "Something went wrong. Please try again." },
  });
}
