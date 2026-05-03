-- Add proof-of-delivery column to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "proofOfDelivery" JSONB;
