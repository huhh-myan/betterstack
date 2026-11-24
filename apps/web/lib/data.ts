"use client";

// The one place the UI gets data from. It hides two things:
// - NEXT_PUBLIC_MOCK=1 swaps the real API for the in-browser mock backend.
// - Gaps in the real API (no website list, no ticks) are filled in here:
//   the website list comes from ids remembered in this browser, and ticks
//   are simulated (see lib/mock.ts).

import { ApiError, api } from "./api";
import { mockBackend, simulateTicks } from "./mock";
import { forgetWebsiteId, getKnownWebsiteIds, rememberWebsiteId, setSession } from "./session";
import type { Monitor, Region, Session, Website } from "./types";

export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK === "1";

/** Signs the user out when the API rejects the token. */
async function authed<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.unauthorized) setSession(null);
    throw e;
  }
}

export async function signIn(username: string, password: string): Promise<Session> {
  if (MOCK_MODE) {
    const { userId, token } = await mockBackend.signin(username, password);
    return { userId, token, username };
  }
  const { user_id, token } = await api.signin(username, password);
  return { userId: user_id, token, username };
}

export async function signUp(username: string, password: string): Promise<Session> {
  if (MOCK_MODE) await mockBackend.signup(username, password);
  else {
    try {
      await api.signup(username, password);
    } catch (e) {
      // The API answers 409 for any create failure; a taken username is the usual cause.
      if (e instanceof ApiError && e.status === 409) {
        throw new ApiError("That username is already taken.", 409);
      }
      throw e;
    }
  }
  return signIn(username, password);
}

export async function listRegions(session: Session): Promise<Region[]> {
  if (MOCK_MODE) return mockBackend.listRegions();
  return authed(() => api.listRegions(session.token));
}

export async function createRegion(session: Session, name: string): Promise<string> {
  if (MOCK_MODE) return (await mockBackend.createRegion(name)).message;
  return authed(async () => (await api.createRegion(session.token, name)).message);
}

async function regionsOrEmpty(session: Session): Promise<Region[]> {
  try {
    return await listRegions(session);
  } catch (e) {
    if (e instanceof ApiError && e.unauthorized) throw e;
    return [];
  }
}

function toMonitor(website: Website, regions: Region[]): Monitor {
  return { ...website, ticks: simulateTicks(website, regions), simulatedTicks: true };
}

async function fetchWebsite(session: Session, id: string): Promise<Website | null> {
  if (MOCK_MODE) return mockBackend.getWebsite(session.userId, id);
  const { website } = await authed(() => api.getWebsite(session.token, id));
  return website;
}

export async function listMonitors(session: Session): Promise<{ monitors: Monitor[]; regions: Region[] }> {
  const regions = await regionsOrEmpty(session);
  let websites: Website[];
  if (MOCK_MODE) {
    websites = await mockBackend.listWebsites(session.userId);
  } else {
    const ids = getKnownWebsiteIds(session.userId);
    const results = await Promise.allSettled(ids.map((id) => fetchWebsite(session, id)));
    const unauthorized = results.find(
      (r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.unauthorized,
    );
    if (unauthorized?.status === "rejected") throw unauthorized.reason;
    websites = results.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  }
  return { monitors: websites.map((w) => toMonitor(w, regions)), regions };
}

export async function getMonitor(
  session: Session,
  id: string,
): Promise<{ monitor: Monitor | null; regions: Region[] }> {
  const [website, regions] = await Promise.all([fetchWebsite(session, id), regionsOrEmpty(session)]);
  return { monitor: website ? toMonitor(website, regions) : null, regions };
}

export async function createMonitor(session: Session, url: string): Promise<Website> {
  if (MOCK_MODE) return mockBackend.createWebsite(session.userId, url);
  const { website } = await authed(() => api.createWebsite(session.token, url));
  rememberWebsiteId(session.userId, website.id);
  return website;
}

/**
 * Real API: there is no delete endpoint, so this only hides the website in this
 * browser; it stays in the database and keeps being checked.
 * Mock mode: deletes it from the mock db.
 */
export async function removeMonitor(session: Session, id: string): Promise<void> {
  if (MOCK_MODE) return mockBackend.deleteWebsite(session.userId, id);
  forgetWebsiteId(session.userId, id);
}

/** Lets the user add an existing website by id (e.g. one created with curl). */
export async function trackExistingMonitor(session: Session, id: string): Promise<Website> {
  const website = await fetchWebsite(session, id);
  if (!website) throw new ApiError("No website with that id belongs to your account.", 404);
  if (!MOCK_MODE) rememberWebsiteId(session.userId, website.id);
  return website;
}
