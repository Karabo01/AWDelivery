-- Create WaybillStatus enum
DO $$ BEGIN
    CREATE TYPE "WaybillStatus" AS ENUM ('UNUSED', 'USED', 'VOID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create waybill_batches table
CREATE TABLE IF NOT EXISTS "waybill_batches" (
    "id" UUID NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "businessId" UUID NOT NULL,
    "size" INTEGER NOT NULL,
    "notes" TEXT,
    "createdBy" UUID NOT NULL,
    "printedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waybill_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "waybill_batches_batchNumber_key" ON "waybill_batches"("batchNumber");

ALTER TABLE "waybill_batches"
    ADD CONSTRAINT "waybill_batches_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create waybills table
CREATE TABLE IF NOT EXISTS "waybills" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "businessId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "status" "WaybillStatus" NOT NULL DEFAULT 'UNUSED',
    "orderId" UUID,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "waybills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "waybills_code_key" ON "waybills"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "waybills_orderId_key" ON "waybills"("orderId");
CREATE INDEX IF NOT EXISTS "waybills_businessId_status_idx" ON "waybills"("businessId", "status");

ALTER TABLE "waybills"
    ADD CONSTRAINT "waybills_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "waybills"
    ADD CONSTRAINT "waybills_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "waybill_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend orders table with waybill links
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "waybillId" UUID;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "waybillCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_waybillId_key" ON "orders"("waybillId");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_waybillCode_key" ON "orders"("waybillCode");

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_waybillId_fkey"
    FOREIGN KEY ("waybillId") REFERENCES "waybills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
