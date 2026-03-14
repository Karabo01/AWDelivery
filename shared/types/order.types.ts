export enum OrderStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  CONFIRMED = "CONFIRMED",
  PICKUP_SCHEDULED = "PICKUP_SCHEDULED",
  PICKED_UP = "PICKED_UP",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  DELAYED = "DELAYED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum ParcelSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

export interface Coordinates {
  readonly lat: number;
  readonly lng: number;
}

export interface Address {
  readonly street: string;
  readonly suburb: string;
  readonly city: string;
  readonly postalCode: string;
  readonly province: string;
  readonly coordinates: Coordinates;
  /** Optional landmark or delivery note, e.g. "Blue gate, ring twice" */
  readonly notes?: string;
}

export interface ParcelDetails {
  readonly size: ParcelSize;
  readonly weightKg: number;
  /** Cloud storage URL of the parcel photo taken at pickup */
  readonly photoUrl?: string;
  readonly description?: string;
}

export interface Order {
  readonly id: string;
  readonly trackingNumber: string;
  readonly senderId: string;
  readonly pickupAddress: Address;
  readonly deliveryAddress: Address;
  readonly parcelDetails: ParcelDetails;
  readonly status: OrderStatus;
  /** Quoted delivery fee in ZAR (cents) */
  readonly quoteAmount: number;
  readonly paymentStatus: PaymentStatus;
  /** Phone number of the parcel receiver in E.164 format */
  readonly receiverPhone: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrderTimelineEntry {
  readonly status: OrderStatus;
  readonly timestamp: string;
  readonly note?: string;
}

/** Chronological list of status changes shown on the public tracking page */
export type OrderTimeline = readonly OrderTimelineEntry[];
