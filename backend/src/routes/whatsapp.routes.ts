import { Router } from "express";

const router = Router();

// ─── POST /whatsapp/webhook ──────────────────────────────────────────────────

router.post("/webhook", (req, res) => {
  // Always return 200 to prevent provider retries
  console.log("[WhatsApp Webhook] Received payload:", JSON.stringify(req.body));

  // In production: validate provider signature header, update WhatsappLog delivery status
  // For now, just acknowledge receipt

  res.status(200).send();
});

export default router;
