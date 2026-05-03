import bcrypt from "bcrypt";
import { Router } from "express";
import prisma from "../lib/prisma.js";

const SALT_ROUNDS = 12;
import { authenticate, requireAdmin, requireSuperAdmin } from "../middleware/auth.js";
import { isSuperAdminEmail } from "../lib/superAdmin.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  updateOrderStatusSchema,
  notifyOrderSchema,
  adminOrdersQuerySchema,
  adminUsersQuerySchema,
  createDriverSchema,
  updateDriverSchema,
  assignDriverSchema,
  resetDriverPasswordSchema,
  adminDriversQuerySchema,
  adminInvoicesQuerySchema,
  createWaybillBatchSchema,
  adminWaybillBatchesQuerySchema,
  adminWaybillsQuerySchema,
  voidWaybillSchema,
} from "../validation/schemas.js";
import { generateUniqueWaybillCodes, generateBatchNumber } from "../utils/tracking.js";
import { AppError } from "../utils/errors.js";
import { isValidTransition } from "../utils/statusTransitions.js";
import { sendNotificationEmail } from "../services/email.service.js";
import type { OrderStatus, NotificationTemplateType } from "@prisma/client";
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
      isAdmin: u.isAdmin || isSuperAdminEmail(u.email),
      isSuperAdmin: isSuperAdminEmail(u.email),
      isBusiness: !!u.isBusiness,
      companyName: u.companyName ?? null,
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
  const { page, pageSize, status, paymentStatus, type, search } = (req as any).validatedQuery;

  const where: Prisma.OrderWhereInput = {};

  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (type === "BULK") where.bulkOrderId = { not: null };
  if (type === "SINGLE") where.bulkOrderId = null;

  if (search) {
    where.OR = [
      { trackingNumber: { contains: search, mode: "insensitive" } },
      { receiverPhone: { contains: search } },
      { bulkOrder: { is: { referenceNumber: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        driver: true,
        bulkOrder: { select: { id: true, referenceNumber: true } },
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    data: orders.map(formatOrderWithDriver),
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

    const order = await prisma.order.findUnique({
      where: { id },
      include: { sender: { select: { name: true, surname: true } } },
    });

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

    // Auto-notify receiver when order moves to IN_TRANSIT
    if (newStatus === "IN_TRANSIT" && order.receiverEmail) {
      const senderName = `${order.sender.name} ${order.sender.surname}`;
      sendNotificationEmail(
        order.receiverEmail,
        "IN_TRANSIT" as any,
        { trackingNumber: order.trackingNumber, senderName },
        id,
      ).catch((err) =>
        console.error(`[Email] Failed to send in-transit notification to receiver:`, err),
      );
    }

    // Auto-notify receiver when order is delivered
    if (newStatus === "DELIVERED" && order.receiverEmail) {
      const senderName = `${order.sender.name} ${order.sender.surname}`;
      const pickupAddr = order.pickupAddress as any;
      const deliveryAddr = order.deliveryAddress as any;
      const pickup = [pickupAddr?.street, pickupAddr?.suburb, pickupAddr?.city].filter(Boolean).join(", ") || "N/A";
      const delivery = [deliveryAddr?.street, deliveryAddr?.suburb, deliveryAddr?.city].filter(Boolean).join(", ") || "N/A";
      sendNotificationEmail(
        order.receiverEmail,
        "DELIVERED" as any,
        { trackingNumber: order.trackingNumber, senderName, pickupAddress: pickup, deliveryAddress: delivery },
        id,
      ).catch((err) =>
        console.error(`[Email] Failed to send delivered notification to receiver:`, err),
      );
    }

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
      templateType: NotificationTemplateType;
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
      const log = await sendNotificationEmail(
        order.sender.email,
        templateType,
        { trackingNumber: order.trackingNumber },
        order.id,
      );
      logs.push(log);
    }

    if (recipient === "receiver" || recipient === "both") {
      const log = await sendNotificationEmail(
        order.receiverEmail,
        templateType,
        { trackingNumber: order.trackingNumber },
        order.id,
      );
      logs.push(log);
    }

    res.json({
      message: `Notification sent to ${recipient}`,
      logs: logs.map(formatNotificationLog),
    });
  },
);

// ─── PATCH /admin/orders/:id/driver ──────────────────────────────────────────

router.patch(
  "/orders/:id/driver",
  validate(assignDriverSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const { driverId } = req.body as { driverId: string | null };

    const order = await prisma.order.findUnique({
      where: { id },
      include: { sender: { select: { name: true, surname: true, phone: true } } },
    });

    if (!order) {
      throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
    }

    if (driverId) {
      const driver = await prisma.driver.findUnique({ where: { id: driverId } });
      if (!driver) {
        throw new AppError("Driver not found", "DRIVER_NOT_FOUND", 404);
      }
      if (!driver.isActive) {
        throw new AppError("Driver is not active", "DRIVER_INACTIVE", 400);
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { driverId },
      include: { driver: true },
    });

    // Send assignment email to the driver (fire and forget)
    if (driverId && updatedOrder.driver?.email) {
      const pickupAddr = order.pickupAddress as any;
      const deliveryAddr = order.deliveryAddress as any;
      const pickup = [pickupAddr?.street, pickupAddr?.suburb, pickupAddr?.city].filter(Boolean).join(", ") || "See order details";
      const delivery = [deliveryAddr?.street, deliveryAddr?.suburb, deliveryAddr?.city].filter(Boolean).join(", ") || "See order details";
      sendNotificationEmail(
        updatedOrder.driver.email,
        "DRIVER_ASSIGNMENT" as any,
        {
          trackingNumber: order.trackingNumber,
          senderName: `${order.sender.name} ${order.sender.surname}`,
          senderPhone: order.sender.phone,
          receiverPhone: order.receiverPhone,
          pickupAddress: pickup,
          deliveryAddress: delivery,
        },
        order.id,
      ).catch((err) =>
        console.error(`[Email] Failed to send driver assignment to ${updatedOrder.driver!.email}:`, err),
      );
    }

    res.json({ order: formatOrderWithDriver(updatedOrder) });
  },
);

// ─── GET /admin/drivers ──────────────────────────────────────────────────────

router.get("/drivers", validateQuery(adminDriversQuerySchema), async (req, res) => {
  const { page, pageSize, isActive, search } = (req as any).validatedQuery;

  const where: Prisma.DriverWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { vehiclePlate: { contains: search, mode: "insensitive" } },
    ];
  }

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.driver.count({ where }),
  ]);

  res.json({
    data: drivers.map(formatDriver),
    total,
    page,
    pageSize,
  });
});

// ─── POST /admin/drivers ─────────────────────────────────────────────────────

router.post("/drivers", validate(createDriverSchema), async (req, res) => {
  const { name, phone, email, vehicleType, vehiclePlate, password } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  const existingPhone = await prisma.driver.findUnique({ where: { phone } });
  if (existingPhone) {
    throw new AppError("Driver with this phone already exists", "DRIVER_PHONE_EXISTS", 409);
  }

  const existingEmail = await prisma.driver.findUnique({ where: { email: normalizedEmail } });
  if (existingEmail) {
    throw new AppError("Driver with this email already exists", "DRIVER_EMAIL_EXISTS", 409);
  }

  const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

  const driver = await prisma.driver.create({
    data: {
      name,
      phone,
      email: normalizedEmail,
      vehicleType,
      vehiclePlate,
      passwordHash,
      passwordChangedAt: passwordHash ? new Date() : null,
    },
  });

  res.status(201).json({ driver: formatDriver(driver) });
});

// ─── POST /admin/drivers/:id/reset-password ──────────────────────────────────

router.post(
  "/drivers/:id/reset-password",
  validate(resetDriverPasswordSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const { password } = req.body as { password: string };

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new AppError("Driver not found", "DRIVER_NOT_FOUND", 404);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.driver.update({
      where: { id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    res.json({ message: "Driver password updated" });
  },
);

// ─── PATCH /admin/drivers/:id ────────────────────────────────────────────────

router.patch("/drivers/:id", validate(updateDriverSchema), async (req, res) => {
  const id = req.params.id as string;
  const updates = req.body;

  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) {
    throw new AppError("Driver not found", "DRIVER_NOT_FOUND", 404);
  }

  if (updates.phone && updates.phone !== driver.phone) {
    const existingDriver = await prisma.driver.findUnique({ where: { phone: updates.phone } });
    if (existingDriver) {
      throw new AppError("Driver with this phone already exists", "DRIVER_PHONE_EXISTS", 409);
    }
  }

  const updatedDriver = await prisma.driver.update({
    where: { id },
    data: updates,
  });

  res.json({ driver: formatDriver(updatedDriver) });
});

// ─── DELETE /admin/drivers/:id ───────────────────────────────────────────────

router.delete("/drivers/:id", async (req, res) => {
  const id = req.params.id as string;

  const driver = await prisma.driver.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });

  if (!driver) {
    throw new AppError("Driver not found", "DRIVER_NOT_FOUND", 404);
  }

  if (driver._count.orders > 0) {
    // Soft delete - just deactivate instead of deleting
    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ driver: formatDriver(updatedDriver), message: "Driver deactivated (has order history)" });
  } else {
    await prisma.driver.delete({ where: { id } });
    res.json({ message: "Driver deleted" });
  }
});

// ─── GET /admin/stats ────────────────────────────────────────────────────────

router.get("/stats", async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalOrders,
    deliveredOrders,
    pendingOrders,
    totalRevenue,
    monthlyOrders,
    monthlyRevenue,
    lastMonthRevenue,
    activeDrivers,
    totalDrivers,
    ordersByStatus,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.order.count({ where: { status: { notIn: ["DELIVERED", "FAILED"] } } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { quoteAmount: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", createdAt: { gte: startOfMonth } },
      _sum: { quoteAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { quoteAmount: true },
    }),
    prisma.driver.count({ where: { isActive: true } }),
    prisma.driver.count(),
    prisma.order.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  res.json({
    orders: {
      total: totalOrders,
      delivered: deliveredOrders,
      pending: pendingOrders,
      thisMonth: monthlyOrders,
    },
    revenue: {
      total: totalRevenue._sum.quoteAmount || 0,
      thisMonth: monthlyRevenue._sum.quoteAmount || 0,
      lastMonth: lastMonthRevenue._sum.quoteAmount || 0,
    },
    drivers: {
      total: totalDrivers,
      active: activeDrivers,
    },
    ordersByStatus: ordersByStatus.map((s) => ({
      status: s.status,
      count: s._count.status,
    })),
  });
});

// ─── PATCH /admin/users/:id/admin (super admin only) ────────────────────────

router.patch("/users/:id/admin", requireSuperAdmin, async (req, res) => {
  const id = req.params.id as string;
  const { isAdmin } = req.body as { isAdmin?: boolean };

  if (typeof isAdmin !== "boolean") {
    throw new AppError("isAdmin must be a boolean", "VALIDATION_ERROR", 400);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new AppError("User not found", "USER_NOT_FOUND", 404);
  }

  if (isSuperAdminEmail(target.email) && !isAdmin) {
    throw new AppError(
      "Cannot revoke admin privileges from the super admin",
      "FORBIDDEN",
      403,
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isAdmin },
  });

  res.json({
    user: {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      surname: updated.surname,
      email: updated.email,
      isVerified: updated.isVerified,
      defaultAddress: updated.defaultAddress,
      isAdmin: updated.isAdmin || isSuperAdminEmail(updated.email),
      isSuperAdmin: isSuperAdminEmail(updated.email),
      createdAt: updated.createdAt.toISOString(),
    },
  });
});

// ─── DELETE /admin/users/:id (super admin only) ─────────────────────────────

router.delete("/users/:id", requireSuperAdmin, async (req, res) => {
  const id = req.params.id as string;

  const target = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });

  if (!target) {
    throw new AppError("User not found", "USER_NOT_FOUND", 404);
  }

  if (isSuperAdminEmail(target.email)) {
    throw new AppError("Cannot delete the super admin account", "FORBIDDEN", 403);
  }

  if (target._count.orders > 0) {
    throw new AppError(
      "Cannot delete a user with existing orders",
      "USER_HAS_ORDERS",
      409,
    );
  }

  await prisma.user.delete({ where: { id } });
  res.json({ message: "User deleted" });
});

// ─── GET /admin/invoices ─────────────────────────────────────────────────────

router.get("/invoices", validateQuery(adminInvoicesQuerySchema), async (req, res) => {
  const { page, pageSize, status, businessId } = (req as any).validatedQuery;

  const where: Prisma.InvoiceWhereInput = {};
  if (status) where.status = status;
  if (businessId) where.businessId = businessId;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: [{ status: "asc" }, { weekStart: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        business: { select: { id: true, name: true, surname: true, email: true, companyName: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({
    data: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      business: inv.business,
      weekStart: inv.weekStart.toISOString(),
      weekEnd: inv.weekEnd.toISOString(),
      totalAmount: inv.totalAmount,
      status: inv.status,
      paidAt: inv.paidAt?.toISOString() ?? null,
      paidBy: inv.paidBy,
      orderCount: inv._count.orders,
    })),
    total,
    page,
    pageSize,
  });
});

// ─── GET /admin/invoices/:id ─────────────────────────────────────────────────

router.get("/invoices/:id", async (req, res) => {
  const id = req.params.id as string;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, name: true, surname: true, email: true, phone: true, companyName: true } },
      orders: {
        orderBy: { createdAt: "asc" },
        include: { bulkOrder: { select: { referenceNumber: true } } },
      },
    },
  });

  if (!invoice) {
    throw new AppError("Invoice not found", "INVOICE_NOT_FOUND", 404);
  }

  res.json({
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      business: invoice.business,
      weekStart: invoice.weekStart.toISOString(),
      weekEnd: invoice.weekEnd.toISOString(),
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      paidBy: invoice.paidBy,
      orders: invoice.orders.map(formatOrder),
    },
  });
});

// ─── POST /admin/invoices/:id/mark-paid ──────────────────────────────────────

router.post("/invoices/:id/mark-paid", async (req, res) => {
  const id = req.params.id as string;

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    throw new AppError("Invoice not found", "INVOICE_NOT_FOUND", 404);
  }
  if (invoice.status === "PAID") {
    throw new AppError("Invoice is already marked paid", "INVOICE_ALREADY_PAID", 409);
  }
  if (invoice.status === "VOID") {
    throw new AppError("Invoice is voided", "INVOICE_VOIDED", 409);
  }

  const now = new Date();
  const adminId = req.user!.userId;

  const [updated] = await prisma.$transaction([
    prisma.invoice.update({
      where: { id },
      data: { status: "PAID", paidAt: now, paidBy: adminId },
    }),
    prisma.order.updateMany({
      where: { invoiceId: id },
      data: { paymentStatus: "PAID" },
    }),
  ]);

  res.json({
    invoice: {
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      status: updated.status,
      paidAt: updated.paidAt?.toISOString() ?? null,
      paidBy: updated.paidBy,
      totalAmount: updated.totalAmount,
    },
  });
});

// ─── PATCH /admin/users/:id/business ─────────────────────────────────────────

router.patch("/users/:id/business", async (req, res) => {
  const id = req.params.id as string;
  const { isBusiness, companyName } = req.body as {
    isBusiness?: boolean;
    companyName?: string | null;
  };

  if (typeof isBusiness !== "boolean") {
    throw new AppError("isBusiness must be a boolean", "VALIDATION_ERROR", 400);
  }
  if (isBusiness && !companyName) {
    throw new AppError("companyName is required when promoting to business", "VALIDATION_ERROR", 400);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new AppError("User not found", "USER_NOT_FOUND", 404);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      isBusiness,
      companyName: isBusiness ? companyName ?? target.companyName : null,
    },
  });

  res.json({
    user: {
      id: updated.id,
      email: updated.email,
      isBusiness: updated.isBusiness,
      companyName: updated.companyName,
    },
  });
});

// ─── POST /admin/waybill-batches ─────────────────────────────────────────────

router.post("/waybill-batches", validate(createWaybillBatchSchema), async (req, res) => {
  const { businessId, size, notes } = req.body as {
    businessId: string;
    size: number;
    notes?: string;
  };

  const business = await prisma.user.findUnique({ where: { id: businessId } });
  if (!business) {
    throw new AppError("Business not found", "USER_NOT_FOUND", 404);
  }
  if (!business.isBusiness) {
    throw new AppError("Target user is not a business account", "NOT_A_BUSINESS", 400);
  }

  const codes = await generateUniqueWaybillCodes(prisma, size);
  const batchNumber = await generateBatchNumber(prisma);
  const adminId = req.user!.userId;

  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.waybillBatch.create({
      data: {
        batchNumber,
        businessId,
        size,
        notes: notes ?? null,
        createdBy: adminId,
      },
    });

    await tx.waybill.createMany({
      data: codes.map((code) => ({
        code,
        businessId,
        batchId: batch.id,
      })),
    });

    return batch;
  });

  res.status(201).json({
    batch: {
      id: result.id,
      batchNumber: result.batchNumber,
      businessId: result.businessId,
      size: result.size,
      notes: result.notes,
      createdBy: result.createdBy,
      printedAt: result.printedAt?.toISOString() ?? null,
      createdAt: result.createdAt.toISOString(),
    },
    codes,
  });
});

// ─── GET /admin/waybill-batches ──────────────────────────────────────────────

router.get(
  "/waybill-batches",
  validateQuery(adminWaybillBatchesQuerySchema),
  async (req, res) => {
    const { page, pageSize, businessId } = (req as any).validatedQuery;

    const where: Prisma.WaybillBatchWhereInput = {};
    if (businessId) where.businessId = businessId;

    const [batches, total] = await Promise.all([
      prisma.waybillBatch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          business: {
            select: { id: true, name: true, surname: true, email: true, companyName: true },
          },
          waybills: { select: { status: true } },
        },
      }),
      prisma.waybillBatch.count({ where }),
    ]);

    res.json({
      data: batches.map((b) => {
        const counts = { unused: 0, used: 0, void: 0 };
        for (const w of b.waybills) {
          if (w.status === "UNUSED") counts.unused++;
          else if (w.status === "USED") counts.used++;
          else if (w.status === "VOID") counts.void++;
        }
        return {
          id: b.id,
          batchNumber: b.batchNumber,
          business: b.business,
          size: b.size,
          notes: b.notes,
          counts,
          printedAt: b.printedAt?.toISOString() ?? null,
          createdAt: b.createdAt.toISOString(),
        };
      }),
      total,
      page,
      pageSize,
    });
  },
);

// ─── GET /admin/waybill-batches/:id ──────────────────────────────────────────

router.get("/waybill-batches/:id", async (req, res) => {
  const id = req.params.id as string;

  const batch = await prisma.waybillBatch.findUnique({
    where: { id },
    include: {
      business: {
        select: { id: true, name: true, surname: true, email: true, companyName: true },
      },
      waybills: {
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          status: true,
          orderId: true,
          usedAt: true,
          voidedAt: true,
          voidReason: true,
        },
      },
    },
  });

  if (!batch) {
    throw new AppError("Batch not found", "BATCH_NOT_FOUND", 404);
  }

  res.json({
    batch: {
      id: batch.id,
      batchNumber: batch.batchNumber,
      business: batch.business,
      size: batch.size,
      notes: batch.notes,
      printedAt: batch.printedAt?.toISOString() ?? null,
      createdAt: batch.createdAt.toISOString(),
      waybills: batch.waybills.map((w) => ({
        id: w.id,
        code: w.code,
        status: w.status,
        orderId: w.orderId,
        usedAt: w.usedAt?.toISOString() ?? null,
        voidedAt: w.voidedAt?.toISOString() ?? null,
        voidReason: w.voidReason,
      })),
    },
  });
});

// ─── POST /admin/waybill-batches/:id/printed ─────────────────────────────────

router.post("/waybill-batches/:id/printed", async (req, res) => {
  const id = req.params.id as string;
  const batch = await prisma.waybillBatch.findUnique({ where: { id } });
  if (!batch) {
    throw new AppError("Batch not found", "BATCH_NOT_FOUND", 404);
  }
  const updated = await prisma.waybillBatch.update({
    where: { id },
    data: { printedAt: batch.printedAt ?? new Date() },
  });
  res.json({
    batch: {
      id: updated.id,
      batchNumber: updated.batchNumber,
      printedAt: updated.printedAt?.toISOString() ?? null,
    },
  });
});

// ─── GET /admin/waybill-batches/:id/print.csv ────────────────────────────────

router.get("/waybill-batches/:id/print.csv", async (req, res) => {
  const id = req.params.id as string;

  const batch = await prisma.waybillBatch.findUnique({
    where: { id },
    include: {
      waybills: { orderBy: { code: "asc" }, select: { code: true } },
    },
  });

  if (!batch) {
    throw new AppError("Batch not found", "BATCH_NOT_FOUND", 404);
  }

  const lines = ["code", ...batch.waybills.map((w) => w.code)];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${batch.batchNumber}.csv"`,
  );
  res.send(lines.join("\n") + "\n");
});

// ─── GET /admin/waybills ─────────────────────────────────────────────────────

router.get("/waybills", validateQuery(adminWaybillsQuerySchema), async (req, res) => {
  const { page, pageSize, businessId, status, search } = (req as any).validatedQuery;

  const where: Prisma.WaybillWhereInput = {};
  if (businessId) where.businessId = businessId;
  if (status) where.status = status;
  if (search) where.code = { contains: search, mode: "insensitive" };

  const [waybills, total] = await Promise.all([
    prisma.waybill.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        business: { select: { id: true, name: true, surname: true, email: true, companyName: true } },
        batch: { select: { id: true, batchNumber: true } },
        order: { select: { id: true, trackingNumber: true } },
      },
    }),
    prisma.waybill.count({ where }),
  ]);

  res.json({
    data: waybills.map((w) => ({
      id: w.id,
      code: w.code,
      status: w.status,
      business: w.business,
      batch: w.batch,
      order: w.order,
      issuedAt: w.issuedAt.toISOString(),
      usedAt: w.usedAt?.toISOString() ?? null,
      voidedAt: w.voidedAt?.toISOString() ?? null,
      voidReason: w.voidReason,
    })),
    total,
    page,
    pageSize,
  });
});

// ─── POST /admin/waybills/:id/void ───────────────────────────────────────────

router.post("/waybills/:id/void", validate(voidWaybillSchema), async (req, res) => {
  const id = req.params.id as string;
  const { reason } = req.body as { reason?: string };

  const waybill = await prisma.waybill.findUnique({ where: { id } });
  if (!waybill) {
    throw new AppError("Waybill not found", "WAYBILL_NOT_FOUND", 404);
  }
  if (waybill.status === "USED") {
    throw new AppError(
      "Cannot void a waybill that is already allocated to an order",
      "WAYBILL_ALREADY_USED",
      409,
    );
  }
  if (waybill.status === "VOID") {
    throw new AppError("Waybill is already voided", "WAYBILL_ALREADY_VOID", 409);
  }

  const updated = await prisma.waybill.update({
    where: { id },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidReason: reason ?? null,
    },
  });

  res.json({
    waybill: {
      id: updated.id,
      code: updated.code,
      status: updated.status,
      voidedAt: updated.voidedAt?.toISOString() ?? null,
      voidReason: updated.voidReason,
    },
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatOrder(order: any) {
  return {
    id: order.id,
    trackingNumber: order.trackingNumber,
    senderId: order.senderId,
    driverId: order.driverId,
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    parcelDetails: order.parcelDetails,
    status: order.status,
    quoteAmount: order.quoteAmount,
    paymentStatus: order.paymentStatus,
    receiverPhone: order.receiverPhone,
    receiverEmail: order.receiverEmail,
    bulkOrderId: order.bulkOrderId ?? null,
    bulkOrder: order.bulkOrder ?? null,
    invoiceId: order.invoiceId ?? null,
    invoice: order.invoice ?? null,
    proofOfDelivery: order.proofOfDelivery ?? null,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
  };
}

function formatOrderWithDriver(order: any) {
  return {
    ...formatOrder(order),
    driver: order.driver ? formatDriver(order.driver) : null,
  };
}

function formatDriver(driver: any) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    vehicleType: driver.vehicleType,
    vehiclePlate: driver.vehiclePlate,
    isActive: driver.isActive,
    orderCount: driver._count?.orders ?? undefined,
    createdAt: driver.createdAt instanceof Date ? driver.createdAt.toISOString() : driver.createdAt,
    updatedAt: driver.updatedAt instanceof Date ? driver.updatedAt.toISOString() : driver.updatedAt,
  };
}

function formatNotificationLog(log: any) {
  return {
    id: log.id,
    orderId: log.orderId,
    recipientEmail: log.recipientEmail,
    messageType: log.messageType,
    content: log.content,
    sentAt: log.sentAt instanceof Date ? log.sentAt.toISOString() : log.sentAt,
    deliveryStatus: log.deliveryStatus,
  };
}

export default router;
