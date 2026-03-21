import { Router } from "express";
import prisma from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { initiatePaymentSchema } from "../validation/schemas.js";
import { AppError } from "../utils/errors.js";
import { buildPayFastUrl, validatePayFastSignature } from "../services/payfast.service.js";
import { sendWhatsAppMessage } from "../services/whatsapp.service.js";
import { OrderStatus, PaymentStatus } from "@prisma/client";

const router = Router();

// ─── POST /payments/initiate ─────────────────────────────────────────────────

router.post("/initiate", authenticate, validate(initiatePaymentSchema), async (req, res) => {
  const { orderId } = req.body as { orderId: string };

  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
  }

  if (order.senderId !== req.user!.userId) {
    throw new AppError(
      "Order does not belong to the authenticated user",
      "FORBIDDEN",
      403,
    );
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    throw new AppError(
      "A payment for this order has already been completed",
      "DUPLICATE_PAYMENT",
      409,
    );
  }

  if (
    order.paymentStatus !== PaymentStatus.PENDING &&
    order.paymentStatus !== PaymentStatus.FAILED
  ) {
    throw new AppError("Payment cannot be retried", "VALIDATION_ERROR", 400);
  }

  const backendUrl = `${req.protocol}://${req.get("host")}`;
  const redirectUrl = buildPayFastUrl({
    orderId: order.id,
    amount: order.quoteAmount,
    itemName: `AWDelivery ${order.trackingNumber}`,
    returnUrl: `${env.FRONTEND_URL}/dashboard`,
    cancelUrl: `${env.FRONTEND_URL}/dashboard`,
    notifyUrl: `${backendUrl}/api/payments/webhook`,
  });

  res.json({ redirectUrl });
});

// ─── POST /payments/webhook (PayFast ITN) ────────────────────────────────────

router.post("/webhook", async (req, res) => {
  // Always return 200 to prevent PayFast retries
  try {
    const payload = req.body as Record<string, string>;

    // Validate MD5 signature
    if (!validatePayFastSignature(payload)) {
      console.error("[PayFast] Invalid webhook signature — discarding");
      res.status(200).send();
      return;
    }

    const orderId = payload.m_payment_id;
    const pfPaymentId = payload.pf_payment_id;
    const paymentStatus = payload.payment_status;

    if (!orderId || !pfPaymentId) {
      console.error("[PayFast] Missing required fields in webhook payload");
      res.status(200).send();
      return;
    }

    // Idempotency check: skip if we already recorded this pf_payment_id
    const existingPayment = await prisma.payment.findUnique({
      where: { reference: pfPaymentId },
    });
    if (existingPayment) {
      console.log(`[PayFast] Duplicate payment ${pfPaymentId} — skipping`);
      res.status(200).send();
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      console.error(`[PayFast] Order ${orderId} not found`);
      res.status(200).send();
      return;
    }

    const amountCents = Math.round(parseFloat(payload.amount_gross || "0") * 100);

    if (paymentStatus === "COMPLETE") {
      // Successful payment
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            orderId,
            amount: amountCents,
            gateway: "payfast",
            reference: pfPaymentId,
            status: PaymentStatus.PAID,
          },
        }),
        prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
          },
        }),
        prisma.orderTimelineEntry.create({
          data: {
            orderId,
            status: OrderStatus.CONFIRMED,
            note: "Payment confirmed via PayFast",
          },
        }),
      ]);

      // Send WhatsApp confirmation (fire and forget)
      sendWhatsAppMessage(
        order.receiverPhone,
        "ORDER_CONFIRMATION",
        { trackingNumber: order.trackingNumber },
        orderId,
      ).catch((err) =>
        console.error("[WhatsApp] Failed to send confirmation:", err),
      );
    } else {
      // CANCELLED or FAILED
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            orderId,
            amount: amountCents,
            gateway: "payfast",
            reference: pfPaymentId,
            status: PaymentStatus.FAILED,
          },
        }),
        prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.FAILED },
        }),
      ]);
    }
  } catch (err) {
    console.error("[PayFast] Webhook processing error:", err);
  }

  res.status(200).send();
});

export default router;
