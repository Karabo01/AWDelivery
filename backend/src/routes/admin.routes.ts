import { Router } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  updateOrderStatusSchema,
  notifyOrderSchema,
  adminOrdersQuerySchema,
  adminUsersQuerySchema,
} from "../validation/schemas.js";
import { AppError } from "../utils/errors.js";
import { isValidTransition } from "../utils/statusTransitions.js";
import { sendWhatsAppMessage } from "../services/whatsapp.service.js";
import type { OrderStatus, WhatsappTemplateType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const router = Router();

// All admin routes require authentication + admin
router.use(authenticate, requireAdmin);

// ─── GET /admin/users ────────────────────────────────────────────────────────

router.get("/users", validateQuery(adminUsersQuerySchema), async (req, res) => {
  const { page, pageSize, search } = (req as any).validatedQuery;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    data: users.map((u) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      surname: u.surname,
      email: u.email,
      isVerified: u.isVerified,
      defaultAddress: u.defaultAddress,
      isAdmin: u.isAdmin,
      orderCount: u._count.orders,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  });
});

// ─── GET /admin/orders ───────────────────────────────────────────────────────

router.get("/orders", validateQuery(adminOrdersQuerySchema), async (req, res) => {
  const { page, pageSize, status, search } = (req as any).validatedQuery;

  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { trackingNumber: { contains: search, mode: "insensitive" } },
      { receiverPhone: { contains: search } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    data: orders.map(formatOrder),
    total,
    page,
    pageSize,
  });
});

// ─── PATCH /admin/orders/:id/status ──────────────────────────────────────────

router.patch(
  "/orders/:id/status",
  validate(updateOrderStatusSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const { status: newStatus, note } = req.body as {
      status: OrderStatus;
      note?: string;
    };

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
    }

    if (!isValidTransition(order.status, newStatus)) {
      throw new AppError(
        `Cannot transition from ${order.status} to ${newStatus}`,
        "INVALID_STATUS_TRANSITION",
        400,
      );
    }

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: newStatus },
      }),
      prisma.orderTimelineEntry.create({
        data: {
          orderId: id,
          status: newStatus,
          note,
        },
      }),
    ]);

    res.json({ order: formatOrder(updatedOrder) });
  },
);

// ─── POST /admin/orders/:id/notify ───────────────────────────────────────────

router.post(
  "/orders/:id/notify",
  validate(notifyOrderSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const { templateType, recipient } = req.body as {
      templateType: WhatsappTemplateType;
      recipient: "sender" | "receiver" | "both";
    };

    const order = await prisma.order.findUnique({
      where: { id },
      include: { sender: true },
    });

    if (!order) {
      throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
    }

    const logs = [];

    if (recipient === "sender" || recipient === "both") {
      const log = await sendWhatsAppMessage(
        order.id,
        order.sender.phone,
        templateType,
        { trackingNumber: order.trackingNumber },
      );
      logs.push(log);
    }

    if (recipient === "receiver" || recipient === "both") {
      const log = await sendWhatsAppMessage(
        order.id,
        order.receiverPhone,
        templateType,
        { trackingNumber: order.trackingNumber },
      );
      logs.push(log);
    }

    res.json({
      message: `Notification sent to ${recipient}`,
      logs: logs.map(formatWhatsappLog),
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
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
  };
}

function formatWhatsappLog(log: any) {
  return {
    id: log.id,
    orderId: log.orderId,
    recipientPhone: log.recipientPhone,
    messageType: log.messageType,
    content: log.content,
    sentAt: log.sentAt instanceof Date ? log.sentAt.toISOString() : log.sentAt,
    deliveryStatus: log.deliveryStatus,
  };
}

export default router;
