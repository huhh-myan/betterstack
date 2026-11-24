"use client";

// The one place the UI gets data from. NEXT_PUBLIC_MOCK=1 swaps the real API
// for the in-browser mock backend, whose ticks are simulated (see lib/mock.ts).
// Against the real API, ticks are the worker's check results from the last 24 hours.

import { ApiError, api } from "./api";
import { mockBackend, simulateTicks } from "./mock";
import { setSession } from "./session";
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

function mockMonitor(website: Website, regions: Region[]): Monitor {
  return { ...website, ticks: simulateTicks(website, regions), simulatedTicks: true };
}

/** One website with its real ticks, or null if it doesn't exist or isn't the user's. */
async function fetchMonitor(session: Session, id: string, regions: Region[]): Promise<Monitor | null> {
  if (MOCK_MODE) {
    const website = await mockBackend.getWebsite(session.userId, id);
    return website ? mockMonitor(website, regions) : null;
  }
  const { websiteWithTicks } = await authed(() => api.getWebsite(session.token, id));
  return websiteWithTicks ? { ...websiteWithTicks, simulatedTicks: false } : null;
}

export async function listMonitors(session: Session): Promise<{ monitors: Monitor[]; regions: Region[] }> {
  const regions = await regionsOrEmpty(session);
  if (MOCK_MODE) {
    const websites = await mockBackend.listWebsites(session.userId);
    return { monitors: websites.map((w) => mockMonitor(w, regions)), regions };
  }
  const { websites } = await authed(() => api.listWebsites(session.token));
  // The list has no ticks, so fetch each website's ticks. A website whose fetch
  // fails still shows, just with no checks, unless the token was rejected.
  const results = await Promise.allSettled(websites.map((w) => fetchMonitor(session, w.id, regions)));
  const unauthorized = results.find(
    (r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.unauthorized,
  );
  if (unauthorized?.status === "rejected") throw unauthorized.reason;
  const monitors = websites.map((w, i): Monitor => {
    const r = results[i]!;
    return r.status === "fulfilled" && r.value ? r.value : { ...w, ticks: [], simulatedTicks: false };
  });
  return { monitors, regions };
}

export async function getMonitor(
  session: Session,
  id: string,
): Promise<{ monitor: Monitor | null; regions: Region[] }> {
  const regions = await regionsOrEmpty(session);
  return { monitor: await fetchMonitor(session, id, regions), regions };
}

export async function createMonitor(session: Session, url: string): Promise<Website> {
  if (MOCK_MODE) return mockBackend.createWebsite(session.userId, url);
  const { website } = await authed(() => api.createWebsite(session.token, url));
  return website;
}

export async function removeMonitor(session: Session, id: string): Promise<void> {
  if (MOCK_MODE) return mockBackend.deleteWebsite(session.userId, id);
  await authed(() => api.deleteWebsite(session.token, id));
}
