import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authenticate, authenticateDriver, requireAdmin } from "./middleware/auth.js";

import authRoutes from "./routes/auth.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import driverRoutes from "./routes/driver.routes.js";
import healthRoutes from "./routes/health.routes.js";

export function createApp() {
  const app = express();

  // ─── Trust proxy (behind reverse proxy / load balancer) ──────────────────────
  app.set("trust proxy", 1);

  // ─── Security headers ────────────────────────────────────────────────────────
  app.use(helmet());

  // ─── Global middleware ───────────────────────────────────────────────────────

  app.use(
    cors({
      origin: [env.FRONTEND_URL, env.FRONTEND_URL.replace('://www.', '://'), env.FRONTEND_URL.replace('://', '://www.')],
      credentials: true,
    }),
  );

  // Global rate limit: 100 requests per 15 minutes per IP
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many requests — please try again later", code: "RATE_LIMITED", statusCode: 429 },
    }),
  );

  // Parse URL-encoded bodies BEFORE json — PayFast webhook sends form data
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(express.json({ limit: "10kb" }));
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

  // Stricter rate limit on auth routes: 20 requests per 15 minutes per IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many auth requests — please try again later", code: "RATE_LIMITED", statusCode: 429 },
  });
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/driver", driverRoutes);
  app.use("/api/health", healthRoutes);

  // ─── Proof-of-delivery file serving ──────────────────────────────────────────
  // Accessible to the driver who uploaded (Bearer token) or any admin (cookie).
  app.use(
    "/api/uploads/pod",
    async (req, res, next) => {
      if (req.headers.authorization?.startsWith("Bearer ")) {
        try {
          await authenticateDriver(req, res, () => {});
          if (req.driver) return next();
        } catch {
          /* fall through to admin check */
        }
      }
      try {
        await authenticate(req, res, () => {});
        return requireAdmin(req, res, next);
      } catch (err) {
        next(err);
      }
    },
    express.static(path.resolve(process.cwd(), "uploads", "pod"), {
      fallthrough: false,
      maxAge: "1h",
    }),
  );

  // ─── Global error handler (must be last) ─────────────────────────────────────

  app.use(errorHandler);

  return app;
}
