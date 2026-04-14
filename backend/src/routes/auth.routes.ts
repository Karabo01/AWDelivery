import { Router } from "express";
import { randomInt } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation/schemas.js";
import { AppError } from "../utils/errors.js";
import { sendOtpEmail } from "../services/email.service.js";

const SALT_ROUNDS = 12;
const router = Router();

// ─── In-memory brute-force tracking ──────────────────────────────────────────

interface AttemptRecord {
  count: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const otpAttempts = new Map<string, AttemptRecord>();

const MAX_LOGIN_ATTEMPTS = 5;
const MAX_OTP_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkAttempts(map: Map<string, AttemptRecord>, key: string, label: string): void {
  const record = map.get(key);
  if (record && record.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    throw new AppError(
      `Too many failed ${label} attempts. Try again in ${minutesLeft} minute(s).`,
      "RATE_LIMITED",
      429,
    );
  }
}

function recordFailure(map: Map<string, AttemptRecord>, key: string, maxAttempts: number): void {
  const record = map.get(key) || { count: 0, lockedUntil: 0 };
  if (record.lockedUntil < Date.now()) record.count = 0;
  record.count++;
  if (record.count >= maxAttempts) {
    record.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }
  map.set(key, record);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUser(user: any) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    surname: user.surname,
    email: user.email,
    isVerified: user.isVerified,
    defaultAddress: user.defaultAddress,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  };
}

async function generateAndSendOtp(email: string, purpose: string = "verification") {
  // Rate limit: max 3 OTPs per email in 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentCount = await prisma.otp.count({
    where: { email, purpose, createdAt: { gte: fiveMinutesAgo } },
  });

  if (recentCount >= 3) {
    throw new AppError("Too many OTP requests — try again later", "RATE_LIMITED", 429);
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({ data: { email, code, purpose, expiresAt } });

  await sendOtpEmail(email, code);
}

// ─── POST /auth/register ─────────────────────────────────────────────────────

router.post("/register", validate(registerSchema), async (req, res) => {
  const { name, surname, phone, email, password } = req.body as {
    name: string;
    surname: string;
    phone: string;
    email: string;
    password: string;
  };

  // Check if phone already taken
  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone) {
    throw new AppError("An account with this phone number already exists", "PHONE_TAKEN", 409);
  }

  // Check if email already taken
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new AppError("An account with this email already exists", "EMAIL_TAKEN", 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.user.create({
    data: { name, surname, phone, email, password: hashedPassword },
  });

  // Send OTP for email verification
  await generateAndSendOtp(email);

  res.status(201).json({ message: "Account created. Please verify your email address." });
});

// ─── POST /auth/login ────────────────────────────────────────────────────────

router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  // Brute-force protection
  checkAttempts(loginAttempts, email, "login");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    recordFailure(loginAttempts, email, MAX_LOGIN_ATTEMPTS);
    throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    recordFailure(loginAttempts, email, MAX_LOGIN_ATTEMPTS);
    throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

  // Clear failed attempts on successful login
  loginAttempts.delete(email);

  if (!user.isVerified) {
    // Re-send OTP so the user can verify
    await generateAndSendOtp(user.email);
    throw new AppError(
      "Account not verified. A new OTP has been sent to your email.",
      "ACCOUNT_NOT_VERIFIED",
      403,
    );
  }

  // Password correct + account verified → issue JWT directly
  const token = jwt.sign(
    { userId: user.id, phone: user.phone, isAdmin: user.isAdmin },
    env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("awdelivery_token", token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ user: formatUser(user) });
});

// ─── POST /auth/verify-otp ──────────────────────────────────────────────────

router.post("/verify-otp", validate(verifyOtpSchema), async (req, res) => {
  const { email, code } = req.body as { email: string; code: string };

  // OTP attempt limiting
  checkAttempts(otpAttempts, email, "OTP");

  const otp = await prisma.otp.findFirst({
    where: { email, code, purpose: "verification", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    recordFailure(otpAttempts, email, MAX_OTP_ATTEMPTS);
    throw new AppError("OTP is invalid or expired", "INVALID_OTP", 400);
  }

  // Clear OTP attempt tracking
  otpAttempts.delete(email);

  // Clean up OTPs
  await prisma.otp.deleteMany({ where: { email } });

  // Mark user as verified (idempotent)
  const user = await prisma.user.update({
    where: { email },
    data: { isVerified: true },
  });

  // Sign JWT
  const token = jwt.sign(
    { userId: user.id, phone: user.phone, isAdmin: user.isAdmin },
    env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("awdelivery_token", token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ user: formatUser(user) });
});

// ─── POST /auth/resend-otp ──────────────────────────────────────────────────

router.post("/resend-otp", validate(resendOtpSchema), async (req, res) => {
  const { email } = req.body as { email: string };

  // Only allow resend for existing users
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return success to prevent email enumeration
    res.json({ message: "If an account exists, an OTP has been sent." });
    return;
  }

  await generateAndSendOtp(email);

  res.json({ message: "If an account exists, an OTP has been sent." });
});

// ─── POST /auth/forgot-password ─────────────────────────────────────────────

router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body as { email: string };

  // Anti-enumeration: always return success
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await generateAndSendOtp(email, "password-reset");
  }

  res.json({ message: "If an account exists, a reset code has been sent to your email." });
});

// ─── POST /auth/reset-password ──────────────────────────────────────────────

router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  const { email, code, newPassword } = req.body as {
    email: string;
    code: string;
    newPassword: string;
  };

  // OTP attempt limiting
  checkAttempts(otpAttempts, email, "OTP");

  const otp = await prisma.otp.findFirst({
    where: { email, code, purpose: "password-reset", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    recordFailure(otpAttempts, email, MAX_OTP_ATTEMPTS);
    throw new AppError("OTP is invalid or expired", "INVALID_OTP", 400);
  }

  // Clear OTP attempt tracking
  otpAttempts.delete(email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("OTP is invalid or expired", "INVALID_OTP", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { password: hashedPassword, isVerified: true, passwordChangedAt: new Date() },
    }),
    prisma.otp.deleteMany({ where: { email } }),
  ]);

  res.json({ message: "Password has been reset successfully. You can now log in." });
});

// ─── POST /auth/logout ──────────────────────────────────────────────────────

router.post("/logout", authenticate, (_req, res) => {
  res.clearCookie("awdelivery_token", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/",
  });
  res.json({ message: "Logged out" });
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────

router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });

  if (!user) {
    throw new AppError("Missing or invalid authentication cookie", "UNAUTHORIZED", 401);
  }

  res.json({ user: formatUser(user) });
});

export default router;
