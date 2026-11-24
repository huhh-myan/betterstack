"use client";

import type { Session } from "./types";

// The JWT is kept in localStorage (a deliberate choice for now: simple, but any
// script on the page can read it). Every read/write is wrapped because storage
// can throw in private windows or when site data is blocked.

const SESSION_KEY = "bstack:session";
const listeners = new Set<() => void>();

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the session just won't survive a reload.
  }
}

/** Reads the `exp` claim without verifying the signature (the API does that). */
function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    // Not a JWT (e.g. a mock token): let the API decide.
    return false;
  }
}

let cachedRaw: string | null | undefined;
let cachedSession: Session | null = null;

export function getSession(): Session | null {
  const raw = safeGet(SESSION_KEY);
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    cachedSession = parsed && !isExpired(parsed.token) ? { ...parsed, isAdmin: !!parsed.isAdmin } : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

export function setSession(session: Session | null) {
  safeSet(SESSION_KEY, session ? JSON.stringify(session) : null);
  listeners.forEach((l) => l());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const storage = { get: safeGet, set: safeSet };
