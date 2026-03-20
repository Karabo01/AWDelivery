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
