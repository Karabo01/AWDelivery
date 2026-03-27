import { z } from "zod";

// ─── Primitives ──────────────────────────────────────────────────────────────

export const phoneSchema = z
  .string()
  .regex(/^\+27\d{9}$/, "Phone must be E.164 format: +27XXXXXXXXX");

export const coordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const addressSchema = z.object({
  street: z.string().min(1),
  suburb: z.string(),
  city: z.string(),
  postalCode: z.string(),
  province: z.string(),
  coordinates: coordinatesSchema,
  notes: z.string().optional(),
});

export const parcelSizeSchema = z.enum(["SMALL", "MEDIUM", "LARGE"]);

export const parcelDetailsSchema = z.object({
  size: parcelSizeSchema,
  weightKg: z.number().positive(),
  photoUrl: z.string().url().optional(),
  description: z.string().optional(),
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  surname: z.string().min(1).max(100),
  phone: phoneSchema,
  email: z.string().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6),
});

export const resendOtpSchema = z.object({
  phone: phoneSchema,
});

// ─── Orders ──────────────────────────────────────────────────────────────────

export const quoteRequestSchema = z.object({
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  parcelSize: parcelSizeSchema,
});

export const createOrderSchema = z.object({
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  parcelDetails: parcelDetailsSchema,
  receiverPhone: phoneSchema,
  quoteToken: z.string().min(1),
});

// ─── Payments ────────────────────────────────────────────────────────────────

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "CONFIRMED",
    "PICKUP_SCHEDULED",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERED",
    "FAILED",
    "DELAYED",
  ]),
  note: z.string().optional(),
});

export const notifyOrderSchema = z.object({
  templateType: z.enum([
    "ORDER_CONFIRMATION",
    "PICKUP_SCHEDULED",
    "PICKED_UP",
    "IN_TRANSIT",
    "DELIVERED",
    "DELAY_ALERT",
  ]),
  recipient: z.enum(["sender", "receiver", "both"]),
});

// ─── Query params ────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "PENDING_PAYMENT",
      "CONFIRMED",
      "PICKUP_SCHEDULED",
      "PICKED_UP",
      "IN_TRANSIT",
      "DELIVERED",
      "FAILED",
      "DELAYED",
    ])
    .optional(),
  search: z.string().optional(),
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
