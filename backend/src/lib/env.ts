import { config } from "dotenv";
import { resolve } from "path";

// Load .env from backend root directory
config({ path: resolve(process.cwd(), ".env") });

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
  FRONTEND_URL: process.env.FRONTEND_URL || "https://awdelivery.co.za:5173",
  BACKEND_URL: process.env.BACKEND_URL || "https://api.awdelivery.co.za:3000",

  // Email (SendGrid)
  SENDGRID_API_KEY: required("SENDGRID_API_KEY"),
  EMAIL_FROM: process.env.EMAIL_FROM || "notifications@awdelivery.co.za",

  get isProduction() {
    return this.NODE_ENV === "production";
  },
} as const;
