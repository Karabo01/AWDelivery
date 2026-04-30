-- Add INVOICED to PaymentStatus enum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'INVOICED';

-- Create InvoiceStatus enum
DO $$ BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'VOID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extend users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBusiness" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "companyName" TEXT;

-- Create bulk_orders table
CREATE TABLE IF NOT EXISTS "bulk_orders" (
    "id" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "senderId" UUID NOT NULL,
    "pickupAddress" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bulk_orders_referenceNumber_key" ON "bulk_orders"("referenceNumber");

ALTER TABLE "bulk_orders"
    ADD CONSTRAINT "bulk_orders_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "businessId" UUID NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "paidAt" TIMESTAMP(3),
    "paidBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_businessId_weekStart_key" ON "invoices"("businessId", "weekStart");

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend orders table with bulk + invoice links
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "bulkOrderId" UUID;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoiceId" UUID;

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_bulkOrderId_fkey"
    FOREIGN KEY ("bulkOrderId") REFERENCES "bulk_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
