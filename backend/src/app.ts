import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";
import healthRoutes from "./routes/health.routes.js";

export function createApp() {
  const app = express();

  // ─── Global middleware ───────────────────────────────────────────────────────

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // Parse URL-encoded bodies BEFORE json — PayFast webhook sends form data
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());

  // ─── Request logger ──────────────────────────────────────────────────────────

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`,
      );
    });
    next();
  });

  // ─── Routes ──────────────────────────────────────────────────────────────────

  app.use("/api/auth", authRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/whatsapp", whatsappRoutes);
  app.use("/api/health", healthRoutes);

  // ─── Global error handler (must be last) ─────────────────────────────────────

  app.use(errorHandler);

  return app;
}
