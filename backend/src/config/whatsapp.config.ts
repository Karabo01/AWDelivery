import { env } from "../lib/env.js";
import type { WhatsappTemplateType } from "@prisma/client";

/**
 * Configuration for Twilio WhatsApp Content Templates.
 * Each template type maps to a Twilio Content SID and defines required variables.
 */

export interface TemplateConfig {
  contentSid: string;
  /** Variable keys expected by Twilio Content Template (e.g., "1", "2", "3") */
  variableKeys: string[];
}

/**
 * Map data object to Twilio contentVariables format.
 * Twilio expects variables as {"1": "value1", "2": "value2", ...}
 */
export function buildContentVariables(
  templateType: WhatsappTemplateType,
  data: Record<string, string>,
): Record<string, string> {
  const mapping = VARIABLE_MAPPINGS[templateType];
  if (!mapping) {
    return {};
  }

  const variables: Record<string, string> = {};
  for (const [index, dataKey] of Object.entries(mapping)) {
    variables[index] = data[dataKey] || "";
  }
  return variables;
}

/**
 * Maps Twilio variable indices to data object keys for each template type.
 * Example: OTP_VERIFICATION uses {"1": "code"} meaning data.code -> variable "1"
 */
const VARIABLE_MAPPINGS: Record<WhatsappTemplateType, Record<string, string>> = {
  OTP_VERIFICATION: {
    "1": "code",
  },
  ORDER_CONFIRMATION: {
    "1": "trackingNumber",
    "2": "trackingUrl",
  },
  PICKUP_SCHEDULED: {
    "1": "trackingNumber",
    "2": "scheduledDate",
    "3": "driverName",
  },
  PICKED_UP: {
    "1": "trackingNumber",
  },
  IN_TRANSIT: {
    "1": "trackingNumber",
    "2": "estimatedDelivery",
  },
  DELIVERED: {
    "1": "trackingNumber",
  },
  DELAY_ALERT: {
    "1": "trackingNumber",
    "2": "reason",
    "3": "newEstimate",
  },
  DRIVER_ASSIGNMENT: {
    "1": "trackingNumber",
    "2": "pickupAddress",
    "3": "deliveryAddress",
    "4": "senderPhone",
  },
};

/**
 * Get the Twilio Content SID for a template type.
 * Returns empty string if not configured (will cause Twilio API error in production).
 */
export function getContentSid(templateType: WhatsappTemplateType): string {
  const sidMap: Record<WhatsappTemplateType, string> = {
    OTP_VERIFICATION: env.TWILIO_CONTENT_SID_OTP,
    ORDER_CONFIRMATION: env.TWILIO_CONTENT_SID_ORDER_CONFIRMATION,
    PICKUP_SCHEDULED: env.TWILIO_CONTENT_SID_PICKUP_SCHEDULED,
    PICKED_UP: env.TWILIO_CONTENT_SID_PICKED_UP,
    IN_TRANSIT: env.TWILIO_CONTENT_SID_IN_TRANSIT,
    DELIVERED: env.TWILIO_CONTENT_SID_DELIVERED,
    DELAY_ALERT: env.TWILIO_CONTENT_SID_DELAY_ALERT,
    DRIVER_ASSIGNMENT: env.TWILIO_CONTENT_SID_DRIVER_ASSIGNMENT,
  };

  return sidMap[templateType] || "";
}

/**
 * Check if a template type has a configured Content SID.
 */
export function isTemplateConfigured(templateType: WhatsappTemplateType): boolean {
  return getContentSid(templateType).length > 0;
}
