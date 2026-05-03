import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import prisma from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import { isSuperAdminEmail } from "../lib/superAdmin.js";

export interface AuthPayload {
  userId: string;
  phone: string;
  isAdmin: boolean;
  isBusiness?: boolean;
  email?: string;
}

export interface DriverAuthPayload {
  driverId: string;
  email: string;
  type: "driver";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      driver?: DriverAuthPayload;
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
      select: { passwordChangedAt: true, isBusiness: true },
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

    req.user = { ...payload, isBusiness: user.isBusiness };
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

export function requireBusiness(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user?.isBusiness) {
    throw new AppError(
      "This action is only available to business accounts",
      "FORBIDDEN",
      403,
    );
  }
  next();
}

export async function authenticateDriver(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Missing or invalid driver token", "UNAUTHORIZED", 401);
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as DriverAuthPayload & {
      iat?: number;
    };

    if (payload.type !== "driver") {
      throw new AppError("Missing or invalid driver token", "UNAUTHORIZED", 401);
    }

    const driver = await prisma.driver.findUnique({
      where: { id: payload.driverId },
      select: { isActive: true, passwordChangedAt: true },
    });

    if (!driver || !driver.isActive) {
      throw new AppError("Missing or invalid driver token", "UNAUTHORIZED", 401);
    }

    if (driver.passwordChangedAt && payload.iat) {
      const changedAtSeconds = Math.floor(driver.passwordChangedAt.getTime() / 1000);
      if (changedAtSeconds > payload.iat) {
        throw new AppError("Session expired — please log in again", "UNAUTHORIZED", 401);
      }
    }

    req.driver = {
      driverId: payload.driverId,
      email: payload.email,
      type: "driver",
    };
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Missing or invalid driver token", "UNAUTHORIZED", 401);
  }
}

export function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!isSuperAdminEmail(req.user?.email)) {
    throw new AppError(
      "User does not have super admin privileges",
      "FORBIDDEN",
      403,
    );
  }
  next();
}
