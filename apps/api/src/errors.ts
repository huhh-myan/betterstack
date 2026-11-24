import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

/**
 * Throw this from any route to answer with a status code and a message.
 * Express 5 sends errors thrown in async handlers to the error handler below,
 * so routes don't need their own try/catch.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, details);
export const unauthorized = (message = "Sign in to do that.") => new HttpError(401, message);
export const forbidden = (message = "You don't have access to that.") => new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

/** Validates `data` with a Zod schema; a failure becomes a 400 listing each problem. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ field: i.path.join(".") || undefined, message: i.message }));
    throw badRequest(issues[0]?.message ?? "Invalid request.", issues);
  }
  return result.data;
}

/** For routes nobody defined. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(notFound(`No route for ${req.method} ${req.path}`));
}

/**
 * The single place errors turn into responses. Known errors (HttpError) send
 * their status and message; anything else is logged here and answered with a
 * generic 500, so stack traces, file paths and SQL never reach the client.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }
  // Malformed JSON body, rejected by express.json().
  if (typeof err === "object" && err && "type" in err && err.type === "entity.parse.failed") {
    res.status(400).json({ message: "The request body is not valid JSON." });
    return;
  }
  console.error(`[api] ${req.method} ${req.path} failed:`, err);
  res.status(500).json({ message: "Something went wrong on our side." });
}
