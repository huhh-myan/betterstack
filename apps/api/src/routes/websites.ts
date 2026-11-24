import { db } from "@repo/db-prisma/db";
import { Router } from "express";
import { requireAuth } from "../auth";
import { notFound, parse } from "../errors";
import { idParam, ticksQuerySchema, websiteSchema } from "../schemas";

export const websitesRouter = Router();
websitesRouter.use("/user", requireAuth);

const TICK_FIELDS = [
  "id",
  "response_time_ms",
  "status",
  "http_status",
  "error",
  "createdAt",
  "region_id",
  "website_id",
] as const;

/** The website if it belongs to the user, else 404 (also for other users' ids). */
async function ownWebsite(userId: string, id: string) {
  const website = await db.orm.public.Website.where({ id, user_id: userId }).first();
  if (!website) throw notFound("Website not found.");
  return website;
}

function since(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// Your websites, each with its checks from the last 24 hours (one extra query
// for all of them, not one per website).
websitesRouter.get("/user/websites", async (req, res) => {
  const { hours } = parse(ticksQuerySchema, req.query);
  const websites = await db.orm.public.Website.where({ user_id: req.user_id! })
    .orderBy((w) => w.timeAdded.desc())
    .all();
  const ids = websites.map((w) => w.id);
  const ticks = ids.length
    ? await db.orm.public.WebsiteTicks.select(...TICK_FIELDS)
        .where((t) => t.website_id.in(ids))
        .where((t) => t.createdAt.gte(since(hours)))
        .orderBy((t) => t.createdAt.asc())
        .all()
    : [];
  const byWebsite = new Map<string, typeof ticks>();
  for (const t of ticks) {
    const list = byWebsite.get(t.website_id) ?? [];
    list.push(t);
    byWebsite.set(t.website_id, list);
  }
  res.json({ websites: websites.map((w) => ({ ...w, ticks: byWebsite.get(w.id) ?? [] })) });
});

websitesRouter.post("/user/website/create", async (req, res) => {
  const { url } = parse(websiteSchema, req.body);
  const website = await db.orm.public.Website.create({ url, user_id: req.user_id! });
  res.status(201).json({ website });
});

websitesRouter.get("/user/website/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  res.json({ website: await ownWebsite(req.user_id!, id) });
});

websitesRouter.get("/user/website/:id/ticks", async (req, res) => {
  const { id } = parse(idParam, req.params);
  const { hours } = parse(ticksQuerySchema, req.query);
  await ownWebsite(req.user_id!, id);
  const ticks = await db.orm.public.WebsiteTicks.select(...TICK_FIELDS)
    .where({ website_id: id })
    .where((t) => t.createdAt.gte(since(hours)))
    .orderBy((t) => t.createdAt.asc())
    .all();
  res.json({ ticks });
});

websitesRouter.delete("/user/website/:id", async (req, res) => {
  const { id } = parse(idParam, req.params);
  await ownWebsite(req.user_id!, id);
  // Ticks reference the website, so they go first; both in one transaction so
  // a failure can't leave the website without its history (or the reverse).
  await db.transaction(async (tx) => {
    await tx.orm.public.WebsiteTicks.where({ website_id: id }).deleteAll();
    await tx.orm.public.Website.where({ id }).delete();
  });
  res.status(204).end();
});
