"use client";

import { createContext, useContext } from "react";
import type { Session } from "@/lib/types";

const SessionContext = createContext<Session | null>(null);

export const SessionProvider = SessionContext.Provider;

/** For pages inside /dashboard, where the layout guarantees a session. */
export function useRequiredSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useRequiredSession must be used inside the dashboard layout");
  return session;
}
