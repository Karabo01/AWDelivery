import type {
  Address,
  BulkOrder,
  Invoice,
  Order,
  OrderStatus,
  OrderTimeline,
  ParcelDetails,
  ParcelSize,
} from './order.types'
import type { AccountType, User } from './user.types'
import type { NotificationTemplateType } from './notification.types'

export interface RegisterRequest {
  readonly name: string
  readonly surname: string
  readonly phone: string
  readonly email: string
  readonly password: string
  readonly accountType?: AccountType
  readonly companyName?: string
}

export interface RegisterResponse {
  readonly message: string
}

export interface LoginRequest {
  readonly email: string
  readonly password: string
}

export interface LoginResponse {
  readonly user: User
}

export interface VerifyOtpRequest {
  readonly email: string
  readonly code: string
}

export interface VerifyOtpResponse {
  readonly user: User
}

export interface ResendOtpRequest {
  readonly email: string
}

export interface ResendOtpResponse {
  readonly message: string
}

export interface ForgotPasswordRequest {
  readonly email: string
}

export interface ForgotPasswordResponse {
  readonly message: string
}

export interface ResetPasswordRequest {
  readonly email: string
  readonly code: string
  readonly newPassword: string
}

export interface ResetPasswordResponse {
  readonly message: string
}

export interface QuoteRequest {
  readonly pickupAddress: Address
  readonly deliveryAddress: Address
  readonly parcelSize: ParcelSize
}

export interface QuoteBreakdown {
  readonly baseFare?: number
  readonly distanceFare?: number
  readonly sizeSurcharge?: number
  readonly flatRate?: number
}

export interface QuoteResponse {
  readonly quoteToken: string
  readonly amount: number
  readonly distanceKm: number
  readonly breakdown: QuoteBreakdown
}

export interface CreateOrderRequest {
  readonly pickupAddress: Address
  readonly deliveryAddress: Address
  readonly parcelDetails: ParcelDetails
  readonly receiverPhone: string
  readonly receiverEmail: string
  readonly quoteToken: string
}

export interface CreateOrderResponse {
  readonly order: Order
  readonly paymentUrl: string
  readonly paymentFormData: Record<string, string>
}

export interface TrackOrderResponse {
  readonly order: Order
  readonly timeline: OrderTimeline
}

export interface BulkPackageInput {
  readonly deliveryAddress: Address
  readonly parcelDetails: ParcelDetails
  readonly receiverPhone: string
  readonly receiverEmail: string
}

export interface BulkPackageWithWaybill extends BulkPackageInput {
  readonly waybillId: string
}

export interface CreateWaybillBatchRequest {
  readonly businessId: string
  readonly size: number
  readonly notes?: string
}

export interface AvailableWaybill {
  readonly id: string
  readonly code: string
}

export interface AvailableWaybillsResponse {
  readonly data: readonly AvailableWaybill[]
  readonly totalUnused: number
}

export interface BulkQuoteRequest {
  readonly pickupAddress: Address
  readonly packages: readonly BulkPackageInput[]
}

export interface BulkPackageQuote extends BulkPackageInput {
  readonly amount: number
  readonly distanceKm: number
  readonly breakdown: QuoteBreakdown
}

export interface BulkQuoteResponse {
  readonly quoteToken: string
  readonly total: number
  readonly packages: readonly BulkPackageQuote[]
}

export interface CreateBulkOrderRequest {
  readonly pickupAddress: Address
  readonly packages: readonly BulkPackageWithWaybill[]
  readonly quoteToken: string
}

export interface CreateBulkOrderResponse {
  readonly bulkOrder: BulkOrder
  readonly orders: readonly Order[]
  readonly invoice: Invoice
}

export interface InitiatePaymentRequest {
  readonly orderId: string
}

export interface InitiatePaymentResponse {
  readonly redirectUrl: string
  readonly formData: Record<string, string>
}

export interface UpdateOrderStatusRequest {
  readonly status: OrderStatus
  readonly note?: string
}

export interface NotifyOrderRequest {
  readonly templateType: NotificationTemplateType
  readonly recipient: 'sender' | 'receiver' | 'both'
}

export interface ApiError {
  readonly message: string
  readonly code: string
  readonly statusCode: number
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}
