"use client";

import { useSyncExternalStore } from "react";
import { getSession, subscribeSession } from "@/lib/session";
import type { Session } from "@/lib/types";

/**
 * `undefined` during server render and hydration (storage isn't readable
 * there), then the session or `null`.
 */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribeSession, getSession, () => undefined);
}
