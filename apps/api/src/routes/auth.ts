import { db } from "@repo/db-prisma/db";
import { Router } from "express";
import { config } from "../config";
import { ensureAdmin, hashPassword, isAdmin, requireAuth, signToken, verifyPassword } from "../auth";
import { conflict, notFound, parse, unauthorized } from "../errors";
import { credentialsSchema, signinSchema } from "../schemas";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const { username, password } = parse(credentialsSchema, req.body);

  if (await db.orm.public.User.where({ username }).select("id").first()) {
    throw conflict("That username is already taken.");
  }
  let user;
  try {
    user = await db.orm.public.User.select("id", "username").create({
      username,
      password: await hashPassword(password),
    });
  } catch (err) {
    // Two signups with the same name at the same moment: the unique index wins.
    if (err instanceof Error && /unique|duplicate/i.test(err.message)) throw conflict("That username is already taken.");
    throw err;
  }
  if (config.adminUsernames.includes(username)) await ensureAdmin(user.id);

  // Never send the password (or its hash) back.
  res.status(201).json({ user: { id: user.id, username: user.username } });
});

authRouter.post("/signin", async (req, res) => {
  const { username, password } = parse(signinSchema, req.body);
  const user = await db.orm.public.User.where({ username }).select("id", "username", "password").first();

  // The same answer for "no such user" and "wrong password", so the response
  // doesn't reveal which usernames exist.
  const check = user ? await verifyPassword(password, user.password) : { ok: false, needsRehash: false };
  if (!user || !check.ok) throw unauthorized("Wrong username or password.");

  if (check.needsRehash) {
    // A plain-text password from before hashing: replace it with a hash now.
    await db.orm.public.User.where({ id: user.id }).update({ password: await hashPassword(password) });
  }

  const admin = await isAdmin(user.id);
  res.json({
    token: await signToken(user.id),
    user: { id: user.id, username: user.username, isAdmin: admin },
    // Kept for older clients and the manual tests; same value as user.id.
    user_id: user.id,
  });
});

authRouter.get("/user", requireAuth, async (req, res) => {
  const user = await db.orm.public.User.where({ id: req.user_id! }).select("id", "username").first();
  if (!user) throw notFound("Your account no longer exists.");
  res.json({ id: user.id, username: user.username, isAdmin: await isAdmin(user.id), user_id: user.id });
});
