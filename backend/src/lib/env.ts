import "dotenv/config";

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
  get isProduction() {
    return this.NODE_ENV === "production";
  },
} as const;
