import { config } from "dotenv";
import { resolve } from "path";

// Load .env from prisma folder (shared with Prisma)
// Use process.cwd() since the app runs from the backend directory
config({ path: resolve(process.cwd(), "prisma/.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  QUOTE_SECRET: process.env.QUOTE_SECRET || required("JWT_SECRET"),
  PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID || "10000100",
  PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY || "46f0cd694581a",
  PAYFAST_PASSPHRASE: process.env.PAYFAST_PASSPHRASE || "",
  PAYFAST_SANDBOX: process.env.PAYFAST_SANDBOX !== "false",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

  // Twilio WhatsApp Configuration
  TWILIO_ACCOUNT_SID: required("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: required("TWILIO_AUTH_TOKEN"),
  TWILIO_WHATSAPP_FROM: required("TWILIO_WHATSAPP_FROM"),

  // Twilio Content Template SIDs
  TWILIO_CONTENT_SID_OTP: required("TWILIO_CONTENT_SID_OTP"),
  TWILIO_CONTENT_SID_ORDER_CONFIRMATION: process.env.TWILIO_CONTENT_SID_ORDER_CONFIRMATION || "",
  TWILIO_CONTENT_SID_PICKUP_SCHEDULED: process.env.TWILIO_CONTENT_SID_PICKUP_SCHEDULED || "",
  TWILIO_CONTENT_SID_PICKED_UP: process.env.TWILIO_CONTENT_SID_PICKED_UP || "",
  TWILIO_CONTENT_SID_IN_TRANSIT: process.env.TWILIO_CONTENT_SID_IN_TRANSIT || "",
  TWILIO_CONTENT_SID_DELIVERED: process.env.TWILIO_CONTENT_SID_DELIVERED || "",
  TWILIO_CONTENT_SID_DELAY_ALERT: process.env.TWILIO_CONTENT_SID_DELAY_ALERT || "",
  TWILIO_CONTENT_SID_DRIVER_ASSIGNMENT: process.env.TWILIO_CONTENT_SID_DRIVER_ASSIGNMENT || "",

  get isProduction() {
    return this.NODE_ENV === "production";
  },
} as const;
