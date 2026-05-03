import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { env } from "../lib/env.js";
import { savePodFiles } from "../lib/podStorage.js";
import prisma from "../lib/prisma.js";
import { authenticateDriver } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import { AppError } from "../utils/errors.js";
import { isValidTransition } from "../utils/statusTransitions.js";
import {
  driverLoginSchema,
  driverOrdersQuerySchema,
  driverUpdateOrderStatusSchema,
} from "../validation/schemas.js";
import type { OrderStatus, Prisma } from "@prisma/client";

const ACCEPTED_PHOTO_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const podUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_PHOTO_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new AppError("Only JPEG, PNG, or WebP images are accepted", "INVALID_FILE_TYPE", 400));
  },
});

const router = Router();

// ─── Brute-force tracking ────────────────────────────────────────────────────

interface AttemptRecord {
  count: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function checkAttempts(key: string): void {
  const record = loginAttempts.get(key);
  if (record && record.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    throw new AppError(
      `Too many failed login attempts. Try again in ${minutesLeft} minute(s).`,
      "RATE_LIMITED",
      429,
    );
  }
}

function recordFailure(key: string): void {
  const record = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  if (record.lockedUntil < Date.now()) record.count = 0;
  record.count++;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }
  loginAttempts.set(key, record);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDriver(driver: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  vehicleType: string;
  vehiclePlate: string | null;
  isActive: boolean;
}) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    vehicleType: driver.vehicleType,
    vehiclePlate: driver.vehiclePlate,
    isActive: driver.isActive,
  };
}

// ─── POST /api/driver/login ──────────────────────────────────────────────────

router.post("/login", validate(driverLoginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const normalizedEmail = email.trim().toLowerCase();

  checkAttempts(normalizedEmail);

  const driver = await prisma.driver.findUnique({ where: { email: normalizedEmail } });

  if (!driver || !driver.passwordHash || !driver.isActive) {
    recordFailure(normalizedEmail);
    throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

  const ok = await bcrypt.compare(password, driver.passwordHash);
  if (!ok) {
    recordFailure(normalizedEmail);
    throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

  loginAttempts.delete(normalizedEmail);

  await prisma.driver.update({
    where: { id: driver.id },
    data: { lastLoginAt: new Date() },
  });

  const token = jwt.sign(
    { driverId: driver.id, email: normalizedEmail, type: "driver" },
    env.JWT_SECRET,
    { expiresIn: "30d" },
  );

  res.json({ token, driver: formatDriver(driver) });
});

// ─── GET /api/driver/me ──────────────────────────────────────────────────────

router.get("/me", authenticateDriver, async (req, res) => {
  const driver = await prisma.driver.findUnique({
    where: { id: req.driver!.driverId },
  });

  if (!driver || !driver.isActive) {
    throw new AppError("Driver not found", "UNAUTHORIZED", 401);
  }

  res.json({ driver: formatDriver(driver) });
});

// ─── Order helpers ───────────────────────────────────────────────────────────

const ACTIVE_STATUSES: OrderStatus[] = [
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELAYED",
];

const COMPLETED_STATUSES: OrderStatus[] = ["DELIVERED", "FAILED"];
const COMPLETED_LOOKBACK_DAYS = 30;

const ALLOWED_DRIVER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [],
  CONFIRMED: [],
  PICKUP_SCHEDULED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED", "FAILED", "DELAYED"],
  DELIVERED: [],
  FAILED: [],
  DELAYED: ["IN_TRANSIT"],
};

function formatOrderForDriver(order: {
  id: string;
  trackingNumber: string;
  status: OrderStatus;
  pickupAddress: unknown;
  deliveryAddress: unknown;
  parcelDetails: unknown;
  receiverPhone: string;
  receiverEmail: string;
  proofOfDelivery: unknown;
  createdAt: Date;
  updatedAt: Date;
  timeline?: Array<{ status: string; timestamp: Date; note: string | null }>;
}) {
  return {
    id: order.id,
    trackingNumber: order.trackingNumber,
    status: order.status,
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    parcelDetails: order.parcelDetails,
    receiverPhone: order.receiverPhone,
    receiverEmail: order.receiverEmail || undefined,
    proofOfDelivery: order.proofOfDelivery ?? null,
    timeline: order.timeline?.map((t) => ({
      status: t.status,
      at: t.timestamp.toISOString(),
      notes: t.note,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

// ─── GET /api/driver/orders ──────────────────────────────────────────────────

router.get(
  "/orders",
  authenticateDriver,
  validateQuery(driverOrdersQuerySchema),
  async (req, res) => {
    const { include } = (req as any).validatedQuery as { include?: "completed" };

    const where: Prisma.OrderWhereInput = {
      driverId: req.driver!.driverId,
      OR: [{ status: { in: ACTIVE_STATUSES } }],
    };

    if (include === "completed") {
      const cutoff = new Date(
        Date.now() - COMPLETED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
      );
      where.OR!.push({
        status: { in: COMPLETED_STATUSES },
        updatedAt: { gte: cutoff },
      });
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    res.json({ orders: orders.map(formatOrderForDriver) });
  },
);

// ─── GET /api/driver/orders/:id ──────────────────────────────────────────────

router.get("/orders/:id", authenticateDriver, async (req, res) => {
  const id = req.params.id as string;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      timeline: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!order || order.driverId !== req.driver!.driverId) {
    throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
  }

  res.json({ order: formatOrderForDriver(order) });
});

// ─── PATCH /api/driver/orders/:id/status ─────────────────────────────────────

router.patch(
  "/orders/:id/status",
  authenticateDriver,
  validate(driverUpdateOrderStatusSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const { status: newStatus, note } = req.body as {
      status: OrderStatus;
      note?: string;
    };

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order || order.driverId !== req.driver!.driverId) {
      throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
    }

    const allowed = ALLOWED_DRIVER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus) || !isValidTransition(order.status, newStatus)) {
      throw new AppError(
        `Cannot transition from ${order.status} to ${newStatus}`,
        "INVALID_STATUS_TRANSITION",
        400,
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: newStatus },
        include: { timeline: { orderBy: { timestamp: "asc" } } },
      }),
      prisma.orderTimelineEntry.create({
        data: { orderId: id, status: newStatus, note: note ?? null },
      }),
    ]);

    res.json({ order: formatOrderForDriver(updated) });
  },
);

// ─── POST /api/driver/orders/:id/pod ─────────────────────────────────────────

router.post(
  "/orders/:id/pod",
  authenticateDriver,
  podUpload.single("photo"),
  async (req, res) => {
    const id = req.params.id as string;
    const { signature, recipientName, notes } = req.body as {
      signature?: string;
      recipientName?: string;
      notes?: string;
    };

    if (!req.file) {
      throw new AppError("Photo is required", "MISSING_PHOTO", 400);
    }
    if (!signature || typeof signature !== "string") {
      throw new AppError("Signature is required", "MISSING_SIGNATURE", 400);
    }
    if (!recipientName || !recipientName.trim()) {
      throw new AppError("Recipient name is required", "MISSING_RECIPIENT", 400);
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.driverId !== req.driver!.driverId) {
      throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
    }
    if (order.status !== "IN_TRANSIT") {
      throw new AppError(
        "Proof of delivery can only be submitted while the order is in transit",
        "INVALID_STATUS_TRANSITION",
        400,
      );
    }

    const { photoUrl, signatureUrl } = await savePodFiles(
      id,
      { buffer: req.file.buffer, mimetype: req.file.mimetype },
      signature,
    );

    const proofOfDelivery = {
      photoUrl,
      signatureUrl,
      recipientName: recipientName.trim(),
      notes: notes?.trim() || null,
      capturedAt: new Date().toISOString(),
    };

    const [updated] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: "DELIVERED", proofOfDelivery },
        include: { timeline: { orderBy: { timestamp: "asc" } } },
      }),
      prisma.orderTimelineEntry.create({
        data: {
          orderId: id,
          status: "DELIVERED",
          note: notes?.trim() || `Delivered to ${recipientName.trim()}`,
        },
      }),
    ]);

    res.json({ order: formatOrderForDriver(updated) });
  },
);

export default router;
