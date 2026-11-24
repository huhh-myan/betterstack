import { db } from "@repo/db-prisma/db";
import type { NextFunction, Request, Response } from "express";
import * as jose from "jose";
import { config } from "./config";
import { forbidden, unauthorized } from "./errors";

const ALG = "HS256";

export function signToken(userId: string) {
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.tokenTtl)
    .sign(config.jwtSecret);
}

/**
 * Reads the token from `Authorization: Bearer <token>`. The raw token (no
 * "Bearer ") is still accepted so old curl commands keep working; drop that
 * once nothing sends it.
 */
function tokenFrom(req: Request): string | null {
  const header = req.headers.authorization?.trim();
  if (!header) return null;
  const [scheme, value] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() === "bearer") return value ?? null;
  return header;
}

/** Sets req.user_id from a valid token, or answers 401. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = tokenFrom(req);
  if (!token) throw unauthorized("Missing token. Send Authorization: Bearer <token>.");
  try {
    const { payload } = await jose.jwtVerify(token, config.jwtSecret, { algorithms: [ALG] });
    if (!payload.sub) throw new Error("no subject");
    req.user_id = payload.sub;
  } catch {
    // One message for every token problem (expired, bad signature, garbage):
    // the details would only help someone forging tokens.
    throw unauthorized("Your session is invalid or has expired. Sign in again.");
  }
  next();
}

export async function isAdmin(userId: string) {
  const row = await db.orm.public.Admin.where({ user_id: userId }).first();
  return row !== null;
}

/** Use after requireAuth. Answers 403 for signed-in users who aren't admins. */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user_id || !(await isAdmin(req.user_id))) throw forbidden("Only admins can do that.");
  next();
}

/** Makes every username in ADMIN_USERNAMES an admin, if that user exists. */
export async function seedAdmins() {
  for (const username of config.adminUsernames) {
    const user = await db.orm.public.User.where({ username }).select("id").first();
    if (user) await ensureAdmin(user.id);
  }
}

export async function ensureAdmin(userId: string) {
  if (await isAdmin(userId)) return;
  await db.orm.public.Admin.create({ user_id: userId });
}

// --- Passwords ---------------------------------------------------------------

/** argon2id via Bun's built-in hasher. Hashes start with "$argon2". */
export const hashPassword = (password: string) => Bun.password.hash(password);

const isHash = (stored: string) => stored.startsWith("$argon2") || stored.startsWith("$2");

/**
 * Checks a password. Rows created before hashing hold the plain password;
 * those still match once, and the caller re-hashes them (`needsRehash`).
 */
export async function verifyPassword(password: string, stored: string) {
  if (isHash(stored)) return { ok: await Bun.password.verify(password, stored), needsRehash: false };
  const a = Buffer.from(password);
  const b = Buffer.from(stored);
  // Constant-time compare, so response time doesn't leak how much matched.
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}
