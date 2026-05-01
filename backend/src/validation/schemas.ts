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

export const registerSchema = z
  .object({
    name: z.string().min(1).max(100),
    surname: z.string().min(1).max(100),
    phone: phoneSchema,
    email: z.string().email().max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    accountType: z.enum(["INDIVIDUAL", "BUSINESS"]).default("INDIVIDUAL"),
    companyName: z.string().min(1).max(200).optional(),
  })
  .refine(
    (data) => data.accountType !== "BUSINESS" || !!data.companyName,
    { message: "Company name is required for business accounts", path: ["companyName"] },
  );

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const resendOtpSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
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
  receiverEmail: z.string().email().max(255),
  quoteToken: z.string().min(1),
});

// ─── Bulk orders ─────────────────────────────────────────────────────────────

export const bulkPackageSchema = z.object({
  deliveryAddress: addressSchema,
  parcelDetails: parcelDetailsSchema,
  receiverPhone: phoneSchema,
  receiverEmail: z.string().email().max(255),
});

export const bulkPackageWithWaybillSchema = bulkPackageSchema.extend({
  waybillId: z.string().uuid(),
});

export const bulkQuoteRequestSchema = z.object({
  pickupAddress: addressSchema,
  packages: z.array(bulkPackageSchema).min(1).max(50),
});

export const createBulkOrderSchema = z.object({
  pickupAddress: addressSchema,
  packages: z.array(bulkPackageWithWaybillSchema).min(1).max(50),
  quoteToken: z.string().min(1),
});

// ─── Waybills ────────────────────────────────────────────────────────────────

export const createWaybillBatchSchema = z.object({
  businessId: z.string().uuid(),
  size: z.number().int().min(1).max(2000),
  notes: z.string().max(500).optional(),
});

export const adminWaybillBatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  businessId: z.string().uuid().optional(),
});

export const adminWaybillsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  businessId: z.string().uuid().optional(),
  status: z.enum(["UNUSED", "USED", "VOID"]).optional(),
  search: z.string().optional(),
});

export const businessWaybillsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(["UNUSED", "USED", "VOID"]).optional(),
});

export const voidWaybillSchema = z.object({
  reason: z.string().max(500).optional(),
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
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "INVOICED"]).optional(),
  type: z.enum(["SINGLE", "BULK"]).optional(),
  search: z.string().optional(),
});

export const adminInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["OPEN", "PAID", "OVERDUE", "VOID"]).optional(),
  businessId: z.string().uuid().optional(),
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

// ─── Drivers ─────────────────────────────────────────────────────────────────

export const vehicleTypeSchema = z.enum(["MOTORCYCLE", "CAR", "VAN", "TRUCK"]);

export const createDriverSchema = z.object({
  name: z.string().min(1).max(100),
  phone: phoneSchema,
  email: z.string().email().max(255).optional(),
  vehicleType: vehicleTypeSchema,
  vehiclePlate: z.string().max(20).optional(),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: phoneSchema.optional(),
  email: z.string().email().max(255).optional().nullable(),
  vehicleType: vehicleTypeSchema.optional(),
  vehiclePlate: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const assignDriverSchema = z.object({
  driverId: z.string().uuid().nullable(),
});

export const adminDriversQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});
