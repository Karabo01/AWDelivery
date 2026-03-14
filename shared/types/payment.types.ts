import type { PaymentStatus } from "./order.types";

export interface Payment {
  readonly id: string;
  readonly orderId: string;
  /** Amount in ZAR (cents) */
  readonly amount: number;
  readonly gateway: string;
  readonly reference: string;
  readonly status: PaymentStatus;
  readonly createdAt: string;
}

/**
 * Fields sent by PayFast in the ITN (Instant Transaction Notification)
 * webhook POST body. All values arrive as strings.
 * @see https://developers.payfast.co.za/docs#step-4-confirm-payment
 */
export interface PayFastPayload {
  /** PayFast's internal payment ID */
  readonly m_payment_id: string;
  /** Our order reference passed as merchant_id during redirect */
  readonly pf_payment_id: string;
  readonly payment_status: string;
  readonly item_name: string;
  readonly item_description: string;
  /** Gross amount charged, e.g. "150.00" */
  readonly amount_gross: string;
  /** Fee deducted by PayFast, e.g. "3.45" */
  readonly amount_fee: string;
  /** Net amount received, e.g. "146.55" */
  readonly amount_net: string;
  readonly custom_str1: string;
  readonly custom_str2: string;
  readonly custom_str3: string;
  readonly custom_str4: string;
  readonly custom_str5: string;
  readonly custom_int1: string;
  readonly custom_int2: string;
  readonly custom_int3: string;
  readonly custom_int4: string;
  readonly custom_int5: string;
  readonly name_first: string;
  readonly name_last: string;
  readonly email_address: string;
  readonly merchant_id: string;
  /** MD5 signature for verification */
  readonly signature: string;
}
