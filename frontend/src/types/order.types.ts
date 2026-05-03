export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  DELAYED = 'DELAYED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  INVOICED = 'INVOICED',
}

export enum InvoiceStatus {
  OPEN = 'OPEN',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export enum WaybillStatus {
  UNUSED = 'UNUSED',
  USED = 'USED',
  VOID = 'VOID',
}

export enum ParcelSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export interface Coordinates {
  readonly lat: number
  readonly lng: number
}

export interface Address {
  readonly street: string
  readonly suburb: string
  readonly city: string
  readonly postalCode: string
  readonly province: string
  readonly coordinates: Coordinates
  readonly notes?: string
}

export interface ParcelDetails {
  readonly size: ParcelSize
  readonly weightKg: number
  readonly photoUrl?: string
  readonly description?: string
}

export interface ProofOfDelivery {
  readonly photoUrl: string
  readonly signatureUrl: string
  readonly recipientName: string
  readonly notes: string | null
  readonly capturedAt: string
}

export interface Order {
  readonly id: string
  readonly trackingNumber: string
  readonly senderId: string
  readonly pickupAddress: Address
  readonly deliveryAddress: Address
  readonly parcelDetails: ParcelDetails
  readonly status: OrderStatus
  readonly quoteAmount: number
  readonly paymentStatus: PaymentStatus
  readonly receiverPhone: string
  readonly receiverEmail: string
  readonly bulkOrderId?: string | null
  readonly invoiceId?: string | null
  readonly waybillId?: string | null
  readonly waybillCode?: string | null
  readonly proofOfDelivery?: ProofOfDelivery | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface Waybill {
  readonly id: string
  readonly code: string
  readonly status: WaybillStatus
  readonly batch?: { id: string; batchNumber: string }
  readonly order?: { id: string; trackingNumber: string } | null
  readonly issuedAt: string
  readonly usedAt?: string | null
  readonly voidedAt?: string | null
}

export interface WaybillBatchSummary {
  readonly id: string
  readonly batchNumber: string
  readonly business: {
    id: string
    name: string
    surname: string
    email: string
    companyName: string | null
  }
  readonly size: number
  readonly notes?: string | null
  readonly counts: { unused: number; used: number; void: number }
  readonly printedAt: string | null
  readonly createdAt: string
}

export interface BulkOrder {
  readonly id: string
  readonly referenceNumber: string
  readonly senderId: string
  readonly pickupAddress: Address
  readonly createdAt: string
}

export interface Invoice {
  readonly id: string
  readonly invoiceNumber: string
  readonly businessId: string
  readonly weekStart: string
  readonly weekEnd: string
  readonly totalAmount: number
  readonly status: InvoiceStatus
  readonly paidAt?: string | null
  readonly paidBy?: string | null
  readonly orderCount?: number
}

export interface OrderTimelineEntry {
  readonly status: OrderStatus
  readonly timestamp: string
  readonly note?: string
}

export type OrderTimeline = readonly OrderTimelineEntry[]
