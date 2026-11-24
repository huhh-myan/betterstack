import { db } from "@repo/db-prisma/db";
import { Router } from "express";
import { isAdmin, requireAdmin, requireAuth } from "../auth";
import { conflict, notFound, parse } from "../errors";
import { numericIdParam, regionCreateSchema, regionRequestSchema } from "../schemas";

export const regionsRouter = Router();
regionsRouter.use("/region", requireAuth);

async function regionNameTaken(name: string) {
  return (await db.orm.public.Region.where({ name }).first()) !== null;
}

/** Adds each requester's username, for the admin's review list. */
async function withUsernames<T extends { user_id: string }>(rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const users = ids.length
    ? await db.orm.public.User.select("id", "username").where((u) => u.id.in(ids)).all()
    : [];
  const names = new Map(users.map((u) => [u.id, u.username]));
  return rows.map((r) => ({ ...r, username: names.get(r.user_id) ?? null }));
}

regionsRouter.get("/region/list", async (_req, res) => {
  const regions = await db.orm.public.Region.orderBy((r) => r.id.asc()).all();
  res.json(regions);
});

// Admins only. The database picks the id (autoincrement).
regionsRouter.post("/region/create", requireAdmin, async (req, res) => {
  const { name } = parse(regionCreateSchema, req.body);
  if (await regionNameTaken(name)) throw conflict(`Region "${name}" already exists.`);
  const region = await db.orm.public.Region.create({ name });
  res.status(201).json({ region, message: `${region.name} created!` });
});

// Any user can ask for a region; an admin decides.
regionsRouter.post("/region/request", async (req, res) => {
  const { name, reason } = parse(regionRequestSchema, req.body);
  if (await regionNameTaken(name)) throw conflict(`Region "${name}" already exists.`);
  const pending = await db.orm.public.RegionRequest.where({ name, user_id: req.user_id!, status: "Pending" }).first();
  if (pending) throw conflict(`You already asked for "${name}". An admin will review it.`);
  const request = await db.orm.public.RegionRequest.create({ name, reason: reason ?? null, user_id: req.user_id! });
  res.status(201).json({ request });
});

// Admins see every request; everyone else sees their own.
regionsRouter.get("/region/requests", async (req, res) => {
  const admin = await isAdmin(req.user_id!);
  const base = admin
    ? db.orm.public.RegionRequest.where((r) => r.id.gt(0))
    : db.orm.public.RegionRequest.where({ user_id: req.user_id! });
  const requests = await base.orderBy((r) => r.createdAt.desc()).limit(200).all();
  res.json({ requests: await withUsernames(requests), isAdmin: admin });
});

async function pendingRequest(id: number) {
  const request = await db.orm.public.RegionRequest.where({ id }).first();
  if (!request) throw notFound("Request not found.");
  if (request.status !== "Pending") throw conflict(`This request was already ${request.status.toLowerCase()}.`);
  return request;
}

regionsRouter.post("/region/requests/:id/approve", requireAdmin, async (req, res) => {
  const { id } = parse(numericIdParam, req.params);
  const request = await pendingRequest(id);
  if (await regionNameTaken(request.name)) throw conflict(`Region "${request.name}" already exists. Reject this request instead.`);
  // Create the region and close the request together, or neither.
  const result = await db.transaction(async (tx) => {
    const region = await tx.orm.public.Region.create({ name: request.name });
    const updated = await tx.orm.public.RegionRequest.where({ id })
      .update({ status: "Approved", decidedAt: new Date(), decided_by: req.user_id! });
    return { region, request: updated };
  });
  res.json(result);
});

regionsRouter.post("/region/requests/:id/reject", requireAdmin, async (req, res) => {
  const { id } = parse(numericIdParam, req.params);
  await pendingRequest(id);
  const request = await db.orm.public.RegionRequest.where({ id })
    .update({ status: "Rejected", decidedAt: new Date(), decided_by: req.user_id! });
  res.json({ request });
});
