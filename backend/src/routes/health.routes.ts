import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// ─── GET /health ─────────────────────────────────────────────────────────────

router.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Database unavailable",
    });
  }
});

export default router;
