import { db } from "@repo/db-prisma/db";
import { Router } from "express";

export const healthRouter = Router();

// No auth: load balancers and uptime monitors (like this one) call it.
healthRouter.get("/health", async (_req, res) => {
  const started = Date.now();
  try {
    await Promise.race([
      db.orm.public.Region.select("id").limit(1).all(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2_000)),
    ]);
    res.json({ status: "ok", db: "up", dbLatencyMs: Date.now() - started });
  } catch {
    // 503 Service Unavailable: the API runs, but can't do its job.
    res.status(503).json({ status: "degraded", db: "down" });
  }
});
