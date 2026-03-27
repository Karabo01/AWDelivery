import md5 from "md5";
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
 * Build a PayFast redirect URL with all required parameters.
 */
export function buildPayFastUrl(params: PaymentParams): string {
  const amountInRands = (params.amount / 100).toFixed(2);

  // Only these 4 fields are used for signature generation
  const signatureData: Record<string, string> = {
    merchant_id: env.PAYFAST_MERCHANT_ID,
    merchant_key: env.PAYFAST_MERCHANT_KEY,
    amount: amountInRands,
    item_name: params.itemName,
  };

  // Build signature string (alphabetical by key) - use RAW values, not encoded
  const signatureString = Object.keys(signatureData)
    .sort()
    .map((key) => `${key}=${signatureData[key].trim()}`)
    .join("&");

  const fullString = env.PAYFAST_PASSPHRASE
    ? `${signatureString}&passphrase=${env.PAYFAST_PASSPHRASE.trim()}`
    : signatureString;

  const signature = md5(fullString);

  // All fields for the URL (including the ones not in signature)
  const urlData: Record<string, string> = {
    merchant_id: env.PAYFAST_MERCHANT_ID,
    merchant_key: env.PAYFAST_MERCHANT_KEY,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    m_payment_id: params.orderId,
    amount: amountInRands,
    item_name: params.itemName,
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

  // Rebuild param string: all params except 'signature', sorted alphabetically
  // Use RAW values, not encoded
  const paramString = Object.keys(payload)
    .filter((key) => key !== "signature")
    .sort()
    .map((key) => `${key}=${(payload[key] ?? "").trim()}`)
    .join("&");

  const fullString = env.PAYFAST_PASSPHRASE
    ? `${paramString}&passphrase=${env.PAYFAST_PASSPHRASE.trim()}`
    : paramString;

  const computedSignature = md5(fullString);
  return computedSignature === receivedSignature;
}
