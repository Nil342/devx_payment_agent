import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error({ err: err.message, stack: err.stack }, "Unhandled error");

  const status = (err as any).status ?? (err as any).statusCode ?? 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(status).json({ error: message });
}
