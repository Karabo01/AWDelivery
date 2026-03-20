import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

/**
 * Returns Express middleware that validates `req.body` against the given Zod schema.
 * On success the parsed (and potentially coerced) value replaces `req.body`.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}

/**
 * Validates `req.query` against the given Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req.query);
    (req as any).validatedQuery = parsed;
    next();
  };
}
