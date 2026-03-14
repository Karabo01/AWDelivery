import type { Address, Order, OrderStatus, OrderTimeline, ParcelDetails, ParcelSize } from "./order.types";
import type { User } from "./user.types";
import type { WhatsappTemplateType } from "./whatsapp.types";

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface SendOtpRequest {
  readonly phone: string;
}

export interface SendOtpResponse {
  readonly message: string;
}

export interface VerifyOtpRequest {
  readonly phone: string;
  readonly code: string;
}

export interface VerifyOtpResponse {
  readonly user: User;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface QuoteRequest {
  readonly pickupAddress: Address;
  readonly deliveryAddress: Address;
  readonly parcelSize: ParcelSize;
}

export interface QuoteBreakdown {
  readonly baseFare: number;
  readonly distanceFare: number;
  readonly sizeSurcharge: number;
}

export interface QuoteResponse {
  /** Signed token encoding the quoted price — valid for 10 minutes */
  readonly quoteToken: string;
  /** Total delivery fee in ZAR (cents) */
  readonly amount: number;
  readonly distanceKm: number;
  readonly breakdown: QuoteBreakdown;
}

export interface CreateOrderRequest {
  readonly pickupAddress: Address;
  readonly deliveryAddress: Address;
  readonly parcelDetails: ParcelDetails;
  /** Receiver phone in E.164 format */
  readonly receiverPhone: string;
  /** Token returned by POST /api/orders/quote */
  readonly quoteToken: string;
}

export interface CreateOrderResponse {
  readonly order: Order;
  /** PayFast redirect URL to complete payment */
  readonly paymentUrl: string;
}

export interface TrackOrderResponse {
  readonly order: Order;
  readonly timeline: OrderTimeline;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface InitiatePaymentRequest {
  readonly orderId: string;
}

export interface InitiatePaymentResponse {
  /** PayFast redirect URL */
  readonly redirectUrl: string;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface UpdateOrderStatusRequest {
  readonly status: OrderStatus;
  readonly note?: string;
}

export interface NotifyOrderRequest {
  readonly templateType: WhatsappTemplateType;
  readonly recipient: "sender" | "receiver" | "both";
}

// ─── Generic ─────────────────────────────────────────────────────────────────

export interface ApiError {
  readonly message: string;
  readonly code: string;
  readonly statusCode: number;
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
