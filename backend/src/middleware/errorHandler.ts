import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
    });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    res.status(400).json({
      message,
      code: "VALIDATION_ERROR",
      statusCode: 400,
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    message: "Internal server error",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  });
}
