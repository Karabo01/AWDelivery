import crypto from "crypto";
import { env } from "../lib/env.js";

const SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process";
const LIVE_URL = "https://www.payfast.co.za/eng/process";

interface PaymentParams {
  orderId: string;
  amount: number; // in cents
  itemName: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

/**
 * Generate PayFast signature using their required format.
 */
function generateSignature(data: Record<string, string>, passPhrase: string | null = null): string {
  let pfOutput = "";
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (data[key] !== "") {
        pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}&`;
      }
    }
  }

  // Remove last ampersand
  let getString = pfOutput.slice(0, -1);
  if (passPhrase !== null && passPhrase !== "") {
    getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`;
  }

  return crypto.createHash("md5").update(getString).digest("hex");
}

/**
 * Build a PayFast redirect URL with all required parameters.
 */
export function buildPayFastUrl(params: PaymentParams): string {
  const amountInRands = (params.amount / 100).toFixed(2);

  // Data object with fields in the correct order
  const data: Record<string, string> = {
    merchant_id: env.PAYFAST_MERCHANT_ID,
    merchant_key: env.PAYFAST_MERCHANT_KEY,
    amount: amountInRands,
    item_name: params.itemName,
  };

  const signature = generateSignature(data);

  // All fields for the URL
  const urlData: Record<string, string> = {
    ...data,
    signature,
  };

  const baseUrl = env.PAYFAST_SANDBOX ? SANDBOX_URL : LIVE_URL;
  const queryString = Object.entries(urlData)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return `${baseUrl}?${queryString}`;
}

/**
 * Validate a PayFast ITN (webhook) payload signature.
 */
export function validatePayFastSignature(
  payload: Record<string, string>,
): boolean {
  const receivedSignature = payload.signature;
  if (!receivedSignature) return false;

  // Create data object without signature
  const data: Record<string, string> = {};
  for (const key of Object.keys(payload).sort()) {
    if (key !== "signature") {
      data[key] = payload[key];
    }
  }

  const computedSignature = generateSignature(data);
  return computedSignature === receivedSignature;
}
