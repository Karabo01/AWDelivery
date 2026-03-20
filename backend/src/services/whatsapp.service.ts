import prisma from "../lib/prisma.js";
import type { WhatsappTemplateType } from "@prisma/client";

/**
 * Stub WhatsApp service — logs messages to console and creates a DB record.
 * Replace with a real provider (Twilio, Meta Cloud API) when ready.
 */
export async function sendWhatsAppMessage(
  orderId: string,
  recipientPhone: string,
  templateType: WhatsappTemplateType,
  data: Record<string, string> = {},
) {
  const content = JSON.stringify({ templateType, data });

  console.log(
    `[WhatsApp Stub] Sending ${templateType} to ${recipientPhone} for order ${orderId}`,
  );
  console.log(`[WhatsApp Stub] Content: ${content}`);

  const log = await prisma.whatsappLog.create({
    data: {
      orderId,
      recipientPhone,
      messageType: templateType,
      content,
      deliveryStatus: "sent",
    },
  });

  return log;
}
