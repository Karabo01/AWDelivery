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
 * 
 * IMPORTANT: PayFast requires keys in the ORDER they are defined in the object.
 * Values must be URL-encoded with spaces replaced by '+'.
 * Empty values should be skipped.
 */
function generateSignature(
  data: Record<string, string>,
  passPhrase: string | null = null,
): string {
  // Build the parameter string - keys must be in the order defined in the object
  let pfOutput = "";
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (data[key] !== "") {
        pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}&`;
      }
    }
  }

  // Remove trailing ampersand
  let getString = pfOutput.slice(0, -1);

  // Append passphrase if provided
  if (passPhrase !== null) {
    getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`;
  }

  // Generate MD5 hash
  return crypto.createHash("md5").update(getString).digest("hex");
}

/**
 * Build PayFast payment data for form submission (POST method).
 * 
 * This function:
 * 1. Builds the data object with all transaction fields
 * 2. Generates a signature using alphabetically sorted keys
 * 3. Returns the form data and action URL for POST submission
 */
export function buildPayFastFormData(params: PaymentParams): {
  actionUrl: string;
  formData: Record<string, string>;
} {
  // Format amount to 2 decimal places (PayFast expects Rands, not cents)
  const amountInRands = (params.amount / 100).toFixed(2);

  // Build the data object with all fields
  // Note: Order here doesn't matter as generateSignature sorts alphabetically
  const data: Record<string, string> = {
    merchant_id: env.PAYFAST_MERCHANT_ID,
    merchant_key: env.PAYFAST_MERCHANT_KEY,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    m_payment_id: params.orderId,
    amount: amountInRands,
    item_name: params.itemName,
  };

  // Generate signature using passphrase from environment (if set)
  const passPhrase = env.PAYFAST_PASSPHRASE || null;
  const signature = generateSignature(data, passPhrase);

  // Add signature to form data
  const formData: Record<string, string> = {
    ...data,
    signature,
  };

  const actionUrl = env.PAYFAST_SANDBOX ? SANDBOX_URL : LIVE_URL;

  return { actionUrl, formData };
}

/**
 * Build a PayFast redirect URL with all required parameters (GET method - legacy).
 */
export function buildPayFastUrl(params: PaymentParams): string {
  const { actionUrl, formData } = buildPayFastFormData(params);
  const queryString = Object.entries(formData)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${actionUrl}?${queryString}`;
}

/**
 * Validate a PayFast ITN (webhook) payload signature.
 * 
 * PayFast sends ITN notifications to confirm payment status.
 * This function validates that the notification came from PayFast.
 */
export function validatePayFastSignature(
  payload: Record<string, string>,
): boolean {
  const receivedSignature = payload.signature;
  if (!receivedSignature) return false;

  // Create data object without the signature field
  const data: Record<string, string> = {};
  for (const key of Object.keys(payload)) {
    if (key !== "signature") {
      data[key] = payload[key];
    }
  }

  // Generate signature and compare (uses sorted keys internally)
  const passPhrase = env.PAYFAST_PASSPHRASE || null;
  const computedSignature = generateSignature(data, passPhrase);
  
  return computedSignature === receivedSignature;
}
