import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { AppError } from "../utils/errors.js";

export interface AuthPayload {
  userId: string;
  phone: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.awdelivery_token;

  if (!token) {
    throw new AppError("Missing or invalid authentication cookie", "UNAUTHORIZED", 401);
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError("Missing or invalid authentication cookie", "UNAUTHORIZED", 401);
  }
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user?.isAdmin) {
    throw new AppError(
      "User does not have admin privileges",
      "FORBIDDEN",
      403,
    );
  }
  next();
}
