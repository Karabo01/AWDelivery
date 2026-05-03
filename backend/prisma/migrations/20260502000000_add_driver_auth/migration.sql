-- Add password + auth tracking columns to drivers
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
