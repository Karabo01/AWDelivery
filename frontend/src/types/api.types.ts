import type { Address, Order, OrderStatus, OrderTimeline, ParcelDetails, ParcelSize } from './order.types'
import type { User } from './user.types'
import type { WhatsappTemplateType } from './whatsapp.types'

export interface RegisterRequest {
  readonly name: string
  readonly surname: string
  readonly phone: string
  readonly email: string
  readonly password: string
}

export interface RegisterResponse {
  readonly message: string
}

export interface LoginRequest {
  readonly phone: string
  readonly password: string
}

export interface LoginResponse {
  readonly user: User
}

export interface VerifyOtpRequest {
  readonly phone: string
  readonly code: string
}

export interface VerifyOtpResponse {
  readonly user: User
}

export interface ResendOtpRequest {
  readonly phone: string
}

export interface ResendOtpResponse {
  readonly message: string
}

export interface QuoteRequest {
  readonly pickupAddress: Address
  readonly deliveryAddress: Address
  readonly parcelSize: ParcelSize
}

export interface QuoteBreakdown {
  readonly baseFare: number
  readonly distanceFare: number
  readonly sizeSurcharge: number
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
  readonly templateType: WhatsappTemplateType
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
