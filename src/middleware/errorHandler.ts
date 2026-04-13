import { Request, Response, NextFunction } from "express";
import { ValidateError } from "tsoa";
import { AppError } from "../utils/errors";

const isProduction = process.env.NODE_ENV === "production";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // tsoa validation errors
  if (err instanceof ValidateError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.fields,
      },
    });
    return;
  }

  // App-level errors
  if (err instanceof AppError) {
    // In production, strip resource IDs from not-found errors
    const message = isProduction && err.code === "NOT_FOUND"
      ? "Resource not found"
      : err.message;

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message,
      },
    });
    return;
  }

  // Unexpected errors — never leak internals
  const error = err as Error;
  if (!isProduction) {
    console.error("Unhandled error:", error);
  }
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}
