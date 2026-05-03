export type VehicleType = "MOTORCYCLE" | "CAR" | "VAN" | "TRUCK";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "DELAYED";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  vehicleType: VehicleType;
  vehiclePlate: string | null;
  isActive: boolean;
}

export interface Address {
  street: string;
  suburb?: string;
  city: string;
  postalCode?: string;
  province?: string;
  coordinates?: { lat: number; lng: number };
}

export interface ParcelDetails {
  description?: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  at: string;
  notes?: string | null;
}

export interface ProofOfDelivery {
  photoUrl: string;
  signatureUrl: string;
  recipientName: string;
  notes?: string | null;
  capturedAt: string;
}

export interface DriverOrder {
  id: string;
  trackingNumber: string;
  status: OrderStatus;
  pickupAddress: Address;
  deliveryAddress: Address;
  parcelDetails: ParcelDetails;
  receiverPhone: string;
  receiverEmail?: string;
  timeline?: OrderTimelineEntry[];
  proofOfDelivery?: ProofOfDelivery | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverLoginRequest {
  email: string;
  password: string;
}

export interface DriverLoginResponse {
  token: string;
  driver: Driver;
}
