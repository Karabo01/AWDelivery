import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  quoteRequestSchema,
  createOrderSchema,
  paginationSchema,
} from "../validation/schemas.js";
import { AppError } from "../utils/errors.js";
import {
  calculateQuote,
  signQuoteToken,
  verifyQuoteToken,
} from "../services/quote.service.js";
import { buildPayFastFormData } from "../services/payfast.service.js";
import { generateTrackingNumber } from "../utils/tracking.js";
import { env } from "../lib/env.js";
import { OrderStatus, PaymentStatus } from "@prisma/client";

const router = Router();

// ─── POST /orders/quote ──────────────────────────────────────────────────────

router.post("/quote", authenticate, validate(quoteRequestSchema), async (req, res) => {
  const { pickupAddress, deliveryAddress, parcelSize } = req.body;

  const quote = calculateQuote(
    pickupAddress.coordinates.lat,
    pickupAddress.coordinates.lng,
    deliveryAddress.coordinates.lat,
    deliveryAddress.coordinates.lng,
    parcelSize,
  );

  const quoteToken = signQuoteToken({
    pickupAddress,
    deliveryAddress,
    parcelSize,
    amount: quote.amount,
    distanceKm: quote.distanceKm,
  });

  res.json({
    quoteToken,
    amount: quote.amount,
    distanceKm: quote.distanceKm,
    breakdown: quote.breakdown,
  });
});

// ─── POST /orders ────────────────────────────────────────────────────────────

router.post("/", authenticate, validate(createOrderSchema), async (req, res) => {
  const { pickupAddress, deliveryAddress, parcelDetails, receiverPhone, receiverEmail, quoteToken } =
    req.body;

  // Verify quote token
  let quoteData;
  try {
    quoteData = verifyQuoteToken(quoteToken);
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Quote token has expired", "QUOTE_EXPIRED", 400);
    }
    throw new AppError("Quote token is invalid", "QUOTE_INVALID", 400);
  }

  const trackingNumber = await generateTrackingNumber(prisma);
  const now = new Date();

  const order = await prisma.order.create({
    data: {
      trackingNumber,
      senderId: req.user!.userId,
      pickupAddress,
      deliveryAddress,
      parcelDetails,
      status: OrderStatus.PENDING_PAYMENT,
      quoteAmount: quoteData.amount,
      paymentStatus: PaymentStatus.PENDING,
      receiverPhone,
      receiverEmail,
      createdAt: now,
      updatedAt: now,
      timeline: {
        create: {
          status: OrderStatus.PENDING_PAYMENT,
          timestamp: now,
        },
      },
    },
  });

  // Build PayFast form data for POST submission
  const paymentData = buildPayFastFormData({
    orderId: order.id,
    amount: quoteData.amount,
    itemName: `AWDelivery ${trackingNumber}`,
    returnUrl: `${env.FRONTEND_URL}/dashboard`,
    cancelUrl: `${env.FRONTEND_URL}/dashboard`,
    notifyUrl: `${env.BACKEND_URL}/api/payments/webhook`,
  });

  res.status(201).json({
    order: formatOrder(order),
    paymentUrl: paymentData.actionUrl,
    paymentFormData: paymentData.formData,
  });
});

// ─── GET /orders/mine ────────────────────────────────────────────────────────

router.get("/mine", authenticate, validateQuery(paginationSchema), async (req, res) => {
  const { page, pageSize } = (req as any).validatedQuery;
  const senderId = req.user!.userId;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { senderId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where: { senderId } }),
  ]);

  res.json({
    data: orders.map(formatOrder),
    total,
    page,
    pageSize,
  });
});

// ─── GET /orders/track/:trackingNumber ───────────────────────────────────────

router.get("/track/:trackingNumber", async (req, res) => {
  const { trackingNumber } = req.params;

  const order = await prisma.order.findUnique({
    where: { trackingNumber },
    include: { timeline: { orderBy: { timestamp: "asc" } } },
  });

  if (!order) {
    throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
  }

  // Strip sensitive fields for public tracking
  const sanitizedOrder = {
    id: order.id,
    trackingNumber: order.trackingNumber,
    pickupAddress: {
      suburb: (order.pickupAddress as any).suburb,
      city: (order.pickupAddress as any).city,
    },
    deliveryAddress: {
      suburb: (order.deliveryAddress as any).suburb,
      city: (order.deliveryAddress as any).city,
    },
    parcelDetails: order.parcelDetails,
    status: order.status,
    quoteAmount: order.quoteAmount,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };

  const timeline = order.timeline.map((entry) => ({
    status: entry.status,
    timestamp: entry.timestamp.toISOString(),
    ...(entry.note ? { note: entry.note } : {}),
  }));

  res.json({ order: sanitizedOrder, timeline });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatOrder(order: any) {
  return {
    id: order.id,
    trackingNumber: order.trackingNumber,
    senderId: order.senderId,
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    parcelDetails: order.parcelDetails,
    status: order.status,
    quoteAmount: order.quoteAmount,
    paymentStatus: order.paymentStatus,
    receiverPhone: order.receiverPhone,
    receiverEmail: order.receiverEmail,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
  };
}

export default router;
