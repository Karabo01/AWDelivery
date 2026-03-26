import Twilio from "twilio";
import prisma from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { getContentSid, buildContentVariables, isTemplateConfigured } from "../config/whatsapp.config.js";
import type { WhatsappTemplateType } from "@prisma/client";

// Initialize Twilio client
const twilioClient = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

/**
 * Format phone number for Twilio WhatsApp API.
 * Ensures phone is in whatsapp:+E.164 format.
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove any existing whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/i, "");
  // Ensure + prefix for E.164
  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }
  return `whatsapp:${cleaned}`;
}

/**
 * Send WhatsApp message via Twilio using Content Templates.
 * Uses contentSid + contentVariables approach for business-initiated messages.
 */
export async function sendWhatsAppMessage(
  recipientPhone: string,
  templateType: WhatsappTemplateType,
  data: Record<string, string> = {},
  orderId?: string,
): Promise<{ id: string; deliveryStatus: string }> {
  const contentSid = getContentSid(templateType);
  const contentVariables = buildContentVariables(templateType, data);
  const content = JSON.stringify({ templateType, data, contentVariables });

  // Check if template is configured
  if (!isTemplateConfigured(templateType)) {
    console.warn(
      `[WhatsApp] Template ${templateType} not configured (missing Content SID). Message not sent.`,
    );

    // Still log to database for tracking, but mark as failed
    const log = await prisma.whatsappLog.create({
      data: {
        orderId,
        recipientPhone,
        messageType: templateType,
        content,
        deliveryStatus: "failed_no_template",
      },
    });

    return { id: log.id, deliveryStatus: "failed_no_template" };
  }

  try {
    console.log(
      `[WhatsApp] Sending ${templateType} to ${recipientPhone}${orderId ? ` for order ${orderId}` : ""}`,
    );

    const message = await twilioClient.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: formatWhatsAppNumber(recipientPhone),
      contentSid,
      contentVariables: JSON.stringify(contentVariables),
    });

    console.log(`[WhatsApp] Message sent successfully. SID: ${message.sid}`);

    // Log successful send to database
    const log = await prisma.whatsappLog.create({
      data: {
        orderId,
        recipientPhone,
        messageType: templateType,
        content,
        deliveryStatus: "sent",
      },
    });

    return { id: log.id, deliveryStatus: "sent" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[WhatsApp] Failed to send ${templateType} to ${recipientPhone}:`, errorMessage);

    // Log failed attempt to database
    const log = await prisma.whatsappLog.create({
      data: {
        orderId,
        recipientPhone,
        messageType: templateType,
        content: JSON.stringify({ templateType, data, error: errorMessage }),
        deliveryStatus: "failed",
      },
    });

    // Don't throw - we don't want WhatsApp failures to break order flow
    return { id: log.id, deliveryStatus: "failed" };
  }
}

/**
 * Send OTP verification message via WhatsApp
 */
export async function sendOtpMessage(phone: string, code: string) {
  return sendWhatsAppMessage(
    phone,
    "OTP_VERIFICATION" as WhatsappTemplateType,
    { code },
  );
}
