import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import prisma from "../lib/prisma.js";
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

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.awdelivery_token;

  if (!token) {
    throw new AppError("Missing or invalid authentication cookie", "UNAUTHORIZED", 401);
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload & { iat?: number };

    // JWT revocation: reject tokens issued before last password change
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { passwordChangedAt: true },
    });

    if (!user) {
      throw new AppError("Missing or invalid authentication cookie", "UNAUTHORIZED", 401);
    }

    if (user.passwordChangedAt && payload.iat) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (changedAtSeconds > payload.iat) {
        throw new AppError("Session expired — please log in again", "UNAUTHORIZED", 401);
      }
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
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
