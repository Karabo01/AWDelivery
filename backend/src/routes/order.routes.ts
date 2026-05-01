import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, requireBusiness } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  quoteRequestSchema,
  createOrderSchema,
  paginationSchema,
  bulkQuoteRequestSchema,
  createBulkOrderSchema,
  businessWaybillsQuerySchema,
} from "../validation/schemas.js";
import { AppError } from "../utils/errors.js";
import {
  calculateQuote,
  signQuoteToken,
  verifyQuoteToken,
  signBulkQuoteToken,
  verifyBulkQuoteToken,
} from "../services/quote.service.js";
import { buildPayFastFormData } from "../services/payfast.service.js";
import { generateTrackingNumber, generateBulkReference } from "../utils/tracking.js";
import { findOrCreateCurrentInvoice } from "../services/invoice.service.js";
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
    notifyUrl: `${env.BACKEND_URL}/payments/webhook`,
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
  const code = req.params.trackingNumber as string;

  const order = await prisma.order.findFirst({
    where: { OR: [{ trackingNumber: code }, { waybillCode: code }] },
    include: { timeline: { orderBy: { timestamp: "asc" } } },
  });

  if (!order) {
    throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
  }

  // Strip sensitive fields for public tracking
  const sanitizedOrder = {
    id: order.id,
    trackingNumber: order.trackingNumber,
    waybillCode: order.waybillCode ?? null,
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

// ─── POST /orders/bulk/quote ─────────────────────────────────────────────────

router.post(
  "/bulk/quote",
  authenticate,
  requireBusiness,
  validate(bulkQuoteRequestSchema),
  async (req, res) => {
    const { pickupAddress, packages } = req.body as {
      pickupAddress: any;
      packages: any[];
    };

    const tokenPackages = packages.map((pkg) => {
      const q = calculateQuote(
        pickupAddress.coordinates.lat,
        pickupAddress.coordinates.lng,
        pkg.deliveryAddress.coordinates.lat,
        pkg.deliveryAddress.coordinates.lng,
        pkg.parcelDetails.size,
      );
      return { amount: q.amount, distanceKm: q.distanceKm, breakdown: q.breakdown };
    });

    const total = tokenPackages.reduce((sum, p) => sum + p.amount, 0);

    const quoteToken = signBulkQuoteToken({
      pickupAddress,
      packages: tokenPackages.map((p) => ({ amount: p.amount, distanceKm: p.distanceKm })),
      total,
      count: packages.length,
    });

    res.json({
      quoteToken,
      total,
      packages: packages.map((pkg, i) => ({
        deliveryAddress: pkg.deliveryAddress,
        parcelDetails: pkg.parcelDetails,
        receiverPhone: pkg.receiverPhone,
        receiverEmail: pkg.receiverEmail,
        amount: tokenPackages[i].amount,
        distanceKm: tokenPackages[i].distanceKm,
        breakdown: tokenPackages[i].breakdown,
      })),
    });
  },
);

// ─── POST /orders/bulk ───────────────────────────────────────────────────────

router.post(
  "/bulk",
  authenticate,
  requireBusiness,
  validate(createBulkOrderSchema),
  async (req, res) => {
    const { pickupAddress, packages, quoteToken } = req.body as {
      pickupAddress: any;
      packages: any[];
      quoteToken: string;
    };

    let bulkQuote;
    try {
      bulkQuote = verifyBulkQuoteToken(quoteToken);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new AppError("Quote token has expired", "QUOTE_EXPIRED", 400);
      }
      throw new AppError("Quote token is invalid", "QUOTE_INVALID", 400);
    }

    if (bulkQuote.count !== packages.length) {
      throw new AppError("Quote token does not match submitted packages", "QUOTE_INVALID", 400);
    }

    const senderId = req.user!.userId;
    const now = new Date();

    // Validate waybills: belong to this business, all UNUSED, all unique within submission
    const waybillIds = packages.map((p: any) => p.waybillId as string);
    const uniqueIds = new Set(waybillIds);
    if (uniqueIds.size !== waybillIds.length) {
      throw new AppError(
        "The same waybill cannot be used on multiple packages",
        "WAYBILL_DUPLICATE",
        400,
      );
    }

    const waybills = await prisma.waybill.findMany({
      where: { id: { in: waybillIds }, businessId: senderId },
    });
    if (waybills.length !== waybillIds.length) {
      throw new AppError(
        "One or more waybills are invalid or do not belong to your account",
        "WAYBILL_INVALID",
        400,
      );
    }
    const notUnused = waybills.find((w) => w.status !== "UNUSED");
    if (notUnused) {
      throw new AppError(
        `Waybill ${notUnused.code} is already ${notUnused.status.toLowerCase()}`,
        "WAYBILL_ALREADY_USED",
        400,
      );
    }

    const waybillById = new Map(waybills.map((w) => [w.id, w]));

    const trackingNumbers: string[] = [];
    for (let i = 0; i < packages.length; i++) {
      trackingNumbers.push(await generateTrackingNumber(prisma));
    }
    const referenceNumber = await generateBulkReference(prisma);

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await findOrCreateCurrentInvoice(tx, senderId, now);

      const bulkOrder = await tx.bulkOrder.create({
        data: { referenceNumber, senderId, pickupAddress, createdAt: now },
      });

      const createdOrders = [] as any[];
      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        const amount = bulkQuote.packages[i].amount;
        const waybill = waybillById.get(pkg.waybillId)!;
        const order = await tx.order.create({
          data: {
            trackingNumber: trackingNumbers[i],
            senderId,
            pickupAddress,
            deliveryAddress: pkg.deliveryAddress,
            parcelDetails: pkg.parcelDetails,
            status: OrderStatus.CONFIRMED,
            quoteAmount: amount,
            paymentStatus: PaymentStatus.INVOICED,
            receiverPhone: pkg.receiverPhone,
            receiverEmail: pkg.receiverEmail,
            bulkOrderId: bulkOrder.id,
            invoiceId: invoice.id,
            waybillId: waybill.id,
            waybillCode: waybill.code,
            createdAt: now,
            updatedAt: now,
            timeline: {
              create: {
                status: OrderStatus.CONFIRMED,
                timestamp: now,
                note: `Created via bulk submission ${referenceNumber} (waybill ${waybill.code})`,
              },
            },
          },
        });

        const updatedWaybill = await tx.waybill.update({
          where: { id: waybill.id },
          data: { status: "USED", usedAt: now, orderId: order.id },
        });
        if (updatedWaybill.status !== "USED") {
          throw new AppError(
            "Waybill update conflict",
            "WAYBILL_CONFLICT",
            409,
          );
        }

        createdOrders.push(order);
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { totalAmount: { increment: bulkQuote.total } },
      });

      return { bulkOrder, orders: createdOrders, invoice: updatedInvoice };
    });

    res.status(201).json({
      bulkOrder: {
        id: result.bulkOrder.id,
        referenceNumber: result.bulkOrder.referenceNumber,
        createdAt: result.bulkOrder.createdAt.toISOString(),
        pickupAddress: result.bulkOrder.pickupAddress,
      },
      orders: result.orders.map(formatOrder),
      invoice: {
        id: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        weekStart: result.invoice.weekStart.toISOString(),
        weekEnd: result.invoice.weekEnd.toISOString(),
        totalAmount: result.invoice.totalAmount,
        status: result.invoice.status,
      },
    });
  },
);

// ─── GET /orders/bulk/mine ───────────────────────────────────────────────────

router.get(
  "/bulk/mine",
  authenticate,
  requireBusiness,
  validateQuery(paginationSchema),
  async (req, res) => {
    const { page, pageSize } = (req as any).validatedQuery;
    const senderId = req.user!.userId;

    const [bulkOrders, total] = await Promise.all([
      prisma.bulkOrder.findMany({
        where: { senderId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          orders: {
            select: {
              id: true,
              trackingNumber: true,
              status: true,
              quoteAmount: true,
              paymentStatus: true,
              deliveryAddress: true,
            },
          },
        },
      }),
      prisma.bulkOrder.count({ where: { senderId } }),
    ]);

    res.json({
      data: bulkOrders.map((b) => ({
        id: b.id,
        referenceNumber: b.referenceNumber,
        pickupAddress: b.pickupAddress,
        createdAt: b.createdAt.toISOString(),
        packageCount: b.orders.length,
        totalAmount: b.orders.reduce((s, o) => s + o.quoteAmount, 0),
        orders: b.orders,
      })),
      total,
      page,
      pageSize,
    });
  },
);

// ─── GET /orders/invoices/mine ───────────────────────────────────────────────

router.get(
  "/invoices/mine",
  authenticate,
  requireBusiness,
  validateQuery(paginationSchema),
  async (req, res) => {
    const { page, pageSize } = (req as any).validatedQuery;
    const businessId = req.user!.userId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { businessId },
        orderBy: { weekStart: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { orders: true } } },
      }),
      prisma.invoice.count({ where: { businessId } }),
    ]);

    res.json({
      data: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        weekStart: inv.weekStart.toISOString(),
        weekEnd: inv.weekEnd.toISOString(),
        totalAmount: inv.totalAmount,
        status: inv.status,
        paidAt: inv.paidAt?.toISOString() ?? null,
        orderCount: inv._count.orders,
      })),
      total,
      page,
      pageSize,
    });
  },
);

// ─── GET /orders/waybills/available ──────────────────────────────────────────

router.get("/waybills/available", authenticate, requireBusiness, async (req, res) => {
  const limit = Math.min(Math.max(Number((req.query.limit as string) ?? 200), 1), 500);
  const businessId = req.user!.userId;

  const waybills = await prisma.waybill.findMany({
    where: { businessId, status: "UNUSED" },
    orderBy: { issuedAt: "asc" },
    take: limit,
    select: { id: true, code: true },
  });

  const totalUnused = await prisma.waybill.count({
    where: { businessId, status: "UNUSED" },
  });

  res.json({ data: waybills, totalUnused });
});

// ─── GET /orders/waybills/mine ───────────────────────────────────────────────

router.get(
  "/waybills/mine",
  authenticate,
  requireBusiness,
  validateQuery(businessWaybillsQuerySchema),
  async (req, res) => {
    const { page, pageSize, status } = (req as any).validatedQuery;
    const businessId = req.user!.userId;

    const where: any = { businessId };
    if (status) where.status = status;

    const [waybills, total, counts] = await Promise.all([
      prisma.waybill.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          batch: { select: { id: true, batchNumber: true } },
          order: { select: { id: true, trackingNumber: true } },
        },
      }),
      prisma.waybill.count({ where }),
      prisma.waybill.groupBy({
        by: ["status"],
        where: { businessId },
        _count: { _all: true },
      }),
    ]);

    const statusCounts = { UNUSED: 0, USED: 0, VOID: 0 };
    for (const c of counts) {
      statusCounts[c.status as "UNUSED" | "USED" | "VOID"] = c._count._all;
    }

    res.json({
      data: waybills.map((w) => ({
        id: w.id,
        code: w.code,
        status: w.status,
        batch: w.batch,
        order: w.order,
        issuedAt: w.issuedAt.toISOString(),
        usedAt: w.usedAt?.toISOString() ?? null,
        voidedAt: w.voidedAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
      counts: statusCounts,
    });
  },
);

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
    bulkOrderId: order.bulkOrderId ?? null,
    invoiceId: order.invoiceId ?? null,
    waybillId: order.waybillId ?? null,
    waybillCode: order.waybillCode ?? null,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
  };
}

export default router;
