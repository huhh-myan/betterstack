// Shared test helpers. Each test file starts the real Express app on a random
// port against the bstack_test database (see .env.example), then talks HTTP.

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { app } from "../api/src/app";
import { ensureAdmin } from "../api/src/auth";

export interface Res<T = any> {
  status: number;
  body: T;
}

export function startServer() {
  let server: Server;
  let base = "";

  const start = () =>
    new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        resolve();
      });
    });
  const stop = () => new Promise<void>((resolve) => server.close(() => resolve()));

  async function call<T = any>(
    method: string,
    path: string,
    { body, token, rawAuth }: { body?: unknown; token?: string; rawAuth?: string } = {},
  ): Promise<Res<T>> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (rawAuth !== undefined) headers["Authorization"] = rawAuth;
    const res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  return { start, stop, call };
}

export const uniqueName = (prefix = "t") => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

/** Creates a user and signs in. Pass admin: true to make them an admin. */
export async function newUser(call: ReturnType<typeof startServer>["call"], { admin = false } = {}) {
  const username = uniqueName();
  const password = "secret123";
  const signup = await call("POST", "/signup", { body: { username, password } });
  if (signup.status !== 201) throw new Error(`signup failed: ${signup.status} ${JSON.stringify(signup.body)}`);
  if (admin) await ensureAdmin(signup.body.user.id);
  const signin = await call("POST", "/signin", { body: { username, password } });
  return { id: signup.body.user.id as string, username, password, token: signin.body.token as string };
}
