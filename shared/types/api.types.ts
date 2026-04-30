import type {
  Address,
  BulkOrder,
  Invoice,
  Order,
  OrderStatus,
  OrderTimeline,
  ParcelDetails,
  ParcelSize,
} from "./order.types.js";
import type { AccountType, User } from "./user.types.js";
import type { NotificationTemplateType } from "./notification.types.js";

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  readonly name: string;
  readonly surname: string;
  readonly phone: string;
  readonly email: string;
  readonly password: string;
  readonly accountType?: AccountType;
  readonly companyName?: string;
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
  readonly email: string;
  readonly code: string;
}

export interface VerifyOtpResponse {
  readonly user: User;
}

export interface ResendOtpRequest {
  readonly email: string;
}

export interface ResendOtpResponse {
  readonly message: string;
}

export interface ForgotPasswordRequest {
  readonly email: string;
}

export interface ForgotPasswordResponse {
  readonly message: string;
}

export interface ResetPasswordRequest {
  readonly email: string;
  readonly code: string;
  readonly newPassword: string;
}

export interface ResetPasswordResponse {
  readonly message: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface QuoteRequest {
  readonly pickupAddress: Address;
  readonly deliveryAddress: Address;
  readonly parcelSize: ParcelSize;
}

export interface QuoteBreakdown {
  readonly baseFare?: number;
  readonly distanceFare?: number;
  readonly sizeSurcharge?: number;
  /** Set when the JHB intra-city flat rate applies (in cents) */
  readonly flatRate?: number;
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
  readonly receiverEmail: string;
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

// ─── Bulk Orders ─────────────────────────────────────────────────────────────

export interface BulkPackageInput {
  readonly deliveryAddress: Address;
  readonly parcelDetails: ParcelDetails;
  readonly receiverPhone: string;
  readonly receiverEmail: string;
}

export interface BulkQuoteRequest {
  readonly pickupAddress: Address;
  readonly packages: readonly BulkPackageInput[];
}

export interface BulkPackageQuote extends BulkPackageInput {
  readonly amount: number;
  readonly distanceKm: number;
  readonly breakdown: QuoteBreakdown;
}

export interface BulkQuoteResponse {
  readonly quoteToken: string;
  readonly total: number;
  readonly packages: readonly BulkPackageQuote[];
}

export interface CreateBulkOrderRequest {
  readonly pickupAddress: Address;
  readonly packages: readonly BulkPackageInput[];
  readonly quoteToken: string;
}

export interface CreateBulkOrderResponse {
  readonly bulkOrder: BulkOrder;
  readonly orders: readonly Order[];
  readonly invoice: Invoice;
}

export interface MarkInvoicePaidResponse {
  readonly invoice: Invoice;
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
