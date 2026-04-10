import { Router } from "express";
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
} from "../validation/schemas.js";
import { AppError } from "../utils/errors.js";
import { sendOtpEmail } from "../services/email.service.js";

const SALT_ROUNDS = 12;
const router = Router();

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

async function generateAndSendOtp(email: string) {
  // Rate limit: max 3 OTPs per email in 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentCount = await prisma.otp.count({
    where: { email, createdAt: { gte: fiveMinutesAgo } },
  });

  if (recentCount >= 3) {
    throw new AppError("Too many OTP requests — try again later", "RATE_LIMITED", 429);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.otp.create({ data: { email, code, expiresAt } });

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

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

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

  const otp = await prisma.otp.findFirst({
    where: { email, code, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw new AppError("OTP is invalid or expired", "INVALID_OTP", 400);
  }

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
