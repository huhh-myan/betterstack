"use client";

// The one place the UI gets data from. With the real API every call goes to
// apps/api; with NEXT_PUBLIC_MOCK=1 the in-browser mock backend answers instead.

import { ApiError, api } from "./api";
import { mockBackend, simulateTicks } from "./mock";
import { setSession } from "./session";
import type { Monitor, Region, RegionRequest, Session, Website } from "./types";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK === "1";

/** Signs the user out when the API says the token is no good (401). */
async function authed<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.unauthorized) setSession(null);
    throw e;
  }
}

// --- Auth ---------------------------------------------------------------------

export async function signIn(username: string, password: string): Promise<Session> {
  if (MOCK_MODE) {
    const { userId, token, isAdmin } = await mockBackend.signin(username, password);
    return { userId, token, username, isAdmin };
  }
  const { token, user } = await api.signin(username, password);
  return { userId: user.id, token, username: user.username, isAdmin: user.isAdmin };
}

export async function signUp(username: string, password: string): Promise<Session> {
  if (MOCK_MODE) await mockBackend.signup(username, password);
  else await api.signup(username, password);
  return signIn(username, password);
}

// --- Monitors -----------------------------------------------------------------

async function regionsOrEmpty(session: Session): Promise<Region[]> {
  try {
    return await listRegions(session);
  } catch (e) {
    if (e instanceof ApiError && e.unauthorized) throw e;
    return [];
  }
}

const withMockTicks = (w: Website, regions: Region[]): Monitor => ({ ...w, ticks: simulateTicks(w, regions) });

export async function listMonitors(session: Session): Promise<{ monitors: Monitor[]; regions: Region[] }> {
  if (MOCK_MODE) {
    const [websites, regions] = await Promise.all([
      mockBackend.listWebsites(session.userId),
      mockBackend.listRegions(),
    ]);
    return { monitors: websites.map((w) => withMockTicks(w, regions)), regions };
  }
  const [{ websites }, regions] = await Promise.all([
    authed(() => api.listWebsites(session.token)),
    regionsOrEmpty(session),
  ]);
  return { monitors: websites, regions };
}

export async function getMonitor(
  session: Session,
  id: string,
): Promise<{ monitor: Monitor | null; regions: Region[] }> {
  if (MOCK_MODE) {
    const [website, regions] = await Promise.all([
      mockBackend.getWebsite(session.userId, id),
      mockBackend.listRegions(),
    ]);
    return { monitor: website ? withMockTicks(website, regions) : null, regions };
  }
  try {
    const [{ website }, { ticks }, regions] = await Promise.all([
      authed(() => api.getWebsite(session.token, id)),
      authed(() => api.getTicks(session.token, id)),
      regionsOrEmpty(session),
    ]);
    return { monitor: { ...website, ticks }, regions };
  } catch (e) {
    // 404: doesn't exist or isn't yours. The page shows "not found".
    if (e instanceof ApiError && e.status === 404) return { monitor: null, regions: [] };
    throw e;
  }
}

export async function createMonitor(session: Session, url: string): Promise<Website> {
  if (MOCK_MODE) return mockBackend.createWebsite(session.userId, url);
  const { website } = await authed(() => api.createWebsite(session.token, url));
  return website;
}

/** Deletes the website and its check history. */
export async function removeMonitor(session: Session, id: string): Promise<void> {
  if (MOCK_MODE) return mockBackend.deleteWebsite(session.userId, id);
  await authed(() => api.deleteWebsite(session.token, id));
}

// --- Regions ------------------------------------------------------------------

export async function listRegions(session: Session): Promise<Region[]> {
  if (MOCK_MODE) return mockBackend.listRegions();
  return authed(() => api.listRegions(session.token));
}

/** Admins only. */
export async function createRegion(session: Session, name: string): Promise<Region> {
  if (MOCK_MODE) return mockBackend.createRegion(name);
  return (await authed(() => api.createRegion(session.token, name))).region;
}

export async function requestRegion(session: Session, name: string, reason?: string): Promise<RegionRequest> {
  if (MOCK_MODE) return mockBackend.requestRegion(session.userId, session.username, name, reason);
  return (await authed(() => api.requestRegion(session.token, name, reason))).request;
}

/** Admins get every request; everyone else gets their own. */
export async function listRegionRequests(session: Session): Promise<RegionRequest[]> {
  if (MOCK_MODE) return mockBackend.listRegionRequests(session.userId, session.isAdmin);
  return (await authed(() => api.listRegionRequests(session.token))).requests;
}

/** Admins only. Approving creates the region. */
export async function decideRegionRequest(
  session: Session,
  id: number,
  decision: "approve" | "reject",
): Promise<RegionRequest> {
  if (MOCK_MODE) return mockBackend.decideRegionRequest(id, decision);
  return (await authed(() => api.decideRegionRequest(session.token, id, decision))).request;
}
