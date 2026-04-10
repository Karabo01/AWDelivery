import type { Address, Order, OrderStatus, OrderTimeline, ParcelDetails, ParcelSize } from "./order.types.js";
import type { User } from "./user.types.js";
import type { NotificationTemplateType } from "./notification.types.js";

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  readonly name: string;
  readonly surname: string;
  readonly phone: string;
  readonly email: string;
  readonly password: string;
}

export interface RegisterResponse {
  readonly message: string;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface LoginResponse {
  readonly user: User;
}

export interface VerifyOtpRequest {
  readonly phone: string;
  readonly code: string;
}

export interface VerifyOtpResponse {
  readonly user: User;
}

export interface ResendOtpRequest {
  readonly phone: string;
}

export interface ResendOtpResponse {
  readonly message: string;
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
  /** PayFast form data for POST submission */
  readonly formData: Record<string, string>;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface UpdateOrderStatusRequest {
  readonly status: OrderStatus;
  readonly note?: string;
}

export interface NotifyOrderRequest {
  readonly templateType: NotificationTemplateType;
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
