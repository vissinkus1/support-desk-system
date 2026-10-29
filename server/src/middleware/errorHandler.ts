import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Application-level error with an HTTP status code.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Central error handler – catches all errors thrown in routes/services.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors → 400 with per-field details
  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({ error: 'Validation failed', details: fieldErrors });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unexpected errors → 500
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

