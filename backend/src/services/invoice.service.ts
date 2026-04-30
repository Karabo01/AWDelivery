import type { Prisma, PrismaClient } from "@prisma/client";
import { generateInvoiceNumber } from "../utils/tracking.js";

// SAST = UTC+2 (no DST). Week = Mon 00:00 SAST → Sun 23:59:59.999 SAST.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

export function getWeekBoundsForDate(date: Date): { weekStart: Date; weekEnd: Date } {
  const sastNow = new Date(date.getTime() + SAST_OFFSET_MS);
  const day = sastNow.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;

  const sastMonday = new Date(
    Date.UTC(
      sastNow.getUTCFullYear(),
      sastNow.getUTCMonth(),
      sastNow.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0,
    ),
  );

  const weekStart = new Date(sastMonday.getTime() - SAST_OFFSET_MS);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { weekStart, weekEnd };
}

export async function findOrCreateCurrentInvoice(
  tx: Prisma.TransactionClient | PrismaClient,
  businessId: string,
  now: Date = new Date(),
) {
  const { weekStart, weekEnd } = getWeekBoundsForDate(now);

  const existing = await tx.invoice.findUnique({
    where: { businessId_weekStart: { businessId, weekStart } },
  });
  if (existing) return existing;

  const weekSequence = await tx.invoice.count({ where: { weekStart } });
  const invoiceNumber = generateInvoiceNumber(weekStart, weekSequence + 1);

  return tx.invoice.create({
    data: {
      invoiceNumber,
      businessId,
      weekStart,
      weekEnd,
      totalAmount: 0,
    },
  });
}
