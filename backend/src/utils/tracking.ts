import { PrismaClient } from "@prisma/client";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateSuffix(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return suffix;
}

export async function generateTrackingNumber(
  prisma: PrismaClient,
): Promise<string> {
  let trackingNumber: string;
  let exists: boolean;

  do {
    trackingNumber = `AW-${generateSuffix()}`;
    const existing = await prisma.order.findUnique({
      where: { trackingNumber },
      select: { id: true },
    });
    exists = !!existing;
  } while (exists);

  return trackingNumber;
}

export async function generateBulkReference(
  prisma: PrismaClient,
): Promise<string> {
  let reference: string;
  let exists: boolean;

  do {
    reference = `BULK-${generateSuffix()}`;
    const existing = await prisma.bulkOrder.findUnique({
      where: { referenceNumber: reference },
      select: { id: true },
    });
    exists = !!existing;
  } while (exists);

  return reference;
}

export function generateInvoiceNumber(weekStart: Date, sequence: number): string {
  const year = weekStart.getUTCFullYear();
  const week = isoWeekNumber(weekStart);
  const seq = String(sequence).padStart(4, "0");
  return `INV-${year}${String(week).padStart(2, "0")}-${seq}`;
}

export async function generateUniqueWaybillCodes(
  prisma: PrismaClient,
  count: number,
): Promise<string[]> {
  const codes = new Set<string>();
  while (codes.size < count) {
    const candidate = `WB-${generateSuffix()}`;
    if (codes.has(candidate)) continue;
    const existing = await prisma.waybill.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (existing) continue;
    codes.add(candidate);
  }
  return Array.from(codes);
}

export async function generateBatchNumber(
  prisma: PrismaClient,
  date: Date = new Date(),
): Promise<string> {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const prefix = `BATCH-${year}${month}-`;

  const existing = await prisma.waybillBatch.count({
    where: { batchNumber: { startsWith: prefix } },
  });

  return `${prefix}${String(existing + 1).padStart(4, "0")}`;
}

function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
