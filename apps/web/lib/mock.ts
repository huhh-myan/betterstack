// Demo mode only (NEXT_PUBLIC_MOCK=1): an in-browser stand-in for the whole API.
// `simulateTicks` invents check results, since no worker runs in demo mode.
// With the real API none of this is used.

import { storage } from "./session";
import type { Region, RegionRequest, TickStatus, Website, WebsiteTick } from "./types";

/** The pusher is meant to enqueue every website every 3 minutes. */
export const CHECK_INTERVAL_MS = 3 * 60 * 1000;
export const TICK_WINDOW_MS = 24 * 60 * 60 * 1000;

export const FALLBACK_REGIONS: Region[] = [
  { id: 1, name: "us-east-1" },
  { id: 2, name: "eu-west-1" },
  { id: 3, name: "ap-south-1" },
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0..1 value, so a reload shows the same history. */
function rand(...parts: (string | number)[]): number {
  return hash(parts.join("|")) / 4294967295;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

const lastSlotOf = (now: number) => Math.floor(now / CHECK_INTERVAL_MS);

export function simulateTicks(website: Website, regions: Region[], now = Date.now()): WebsiteTick[] {
  const useRegions = (regions.length ? regions : FALLBACK_REGIONS).slice(0, 3);
  const added = new Date(website.timeAdded).getTime();
  const start = Math.max(Number.isNaN(added) ? 0 : added, now - TICK_WINDOW_MS);
  const firstSlot = Math.ceil(start / CHECK_INTERVAL_MS);
  const lastSlot = lastSlotOf(now);

  // Per-site personality: base latency and how flaky it is.
  const base = 60 + Math.floor(rand(website.id, "base") * 420);
  const flaky = rand(website.id, "flaky");
  const alwaysDown = flaky > 0.93;
  const incidentEvery = flaky > 0.6 ? 90 : 260; // in slots
  // Demo flavour: a "staging." host is in the middle of an outage, so the
  // Down state is visible without waiting for a random incident.
  const ongoingOutageFrom = /^staging\./.test(hostOf(website.url)) ? lastSlot - 9 : Infinity;

  const ticks: WebsiteTick[] = [];
  let id = 1;
  for (let slot = firstSlot; slot <= lastSlot; slot++) {
    const period = Math.floor(slot / incidentEvery);
    const inIncident =
      rand(website.id, "incident", period) > 0.55 &&
      slot % incidentEvery < 4 + Math.floor(rand(website.id, "len", period) * 6);
    useRegions.forEach((region, ri) => {
      const r = rand(website.id, slot, region.id);
      let status: TickStatus = "Up";
      if (alwaysDown || slot >= ongoingOutageFrom || (inIncident && r > 0.15)) status = "Down";
      else if (r > 0.9995) status = "Unknown";

      const regionOffset = ri * (40 + base * 0.35);
      const jitter = (rand(website.id, slot, region.id, "j") - 0.5) * base * 0.5;
      const spike = rand(website.id, slot, "spike") > 0.985 ? base * 2.5 : 0;
      const response =
        status === "Up"
          ? Math.round(base + regionOffset + jitter + spike)
          : Math.round(2000 + rand(website.id, slot, region.id, "t") * 8000);

      const failure = rand(website.id, slot, region.id, "why");
      ticks.push({
        id: id++,
        response_time_ms: Math.max(12, response),
        status,
        http_status: status === "Up" ? 200 : status === "Unknown" ? 429 : failure > 0.5 ? 503 : null,
        error:
          status === "Up"
            ? null
            : status === "Unknown"
              ? "HTTP 429 (rate limited)"
              : failure > 0.5
                ? "HTTP 503"
                : "timed out after 10000 ms",
        createdAt: new Date(slot * CHECK_INTERVAL_MS + ri * 1500).toISOString(),
        region_id: region.id,
        website_id: website.id,
      });
    });
  }
  return ticks;
}

// --- Mock backend -------------------------------------------------------------

interface MockDb {
  users: { id: string; username: string; password: string }[];
  websites: Website[];
  regions: Region[];
  requests: RegionRequest[];
}

const DB_KEY = "bstack:mock-db:v2";

function load(): MockDb {
  try {
    const raw = storage.get(DB_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch {
    // fall through to a fresh db
  }
  return { users: [], websites: [], regions: [...FALLBACK_REGIONS], requests: [] };
}

function save(db: MockDb) {
  storage.set(DB_KEY, JSON.stringify(db));
}

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/** Demo mode: usernames starting with "admin" are admins, so both views can be tried. */
export const isMockAdmin = (username: string) => username.toLowerCase().startsWith("admin");

const DEMO_SITES = [
  "https://example.com",
  "https://github.com",
  "https://news.ycombinator.com",
  "https://api.my-startup.dev/health",
  "https://staging.my-startup.dev",
];

export const mockBackend = {
  async signup(username: string, password: string) {
    await delay();
    const db = load();
    if (db.users.some((u) => u.username === username)) throw new Error("That username is already taken.");
    const user = { id: uuid(), username, password };
    db.users.push(user);
    // Give new demo accounts something to look at.
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    for (const url of DEMO_SITES) {
      db.websites.push({ id: uuid(), url, timeAdded: threeDaysAgo, user_id: user.id });
    }
    save(db);
    return user;
  },

  async signin(username: string, password: string) {
    await delay();
    const db = load();
    let user = db.users.find((u) => u.username === username);
    // Demo mode: any credentials work; unknown usernames get an account.
    if (!user) user = await mockBackend.signup(username, password);
    return { userId: user.id, token: `mock.${user.id}`, isAdmin: isMockAdmin(username) };
  },

  async listWebsites(userId: string) {
    await delay(150);
    return load().websites.filter((w) => w.user_id === userId);
  },

  async getWebsite(userId: string, id: string) {
    await delay(150);
    return load().websites.find((w) => w.user_id === userId && w.id === id) ?? null;
  },

  async createWebsite(userId: string, url: string) {
    await delay();
    const db = load();
    const website: Website = { id: uuid(), url, timeAdded: new Date().toISOString(), user_id: userId };
    db.websites.unshift(website);
    save(db);
    return website;
  },

  async deleteWebsite(userId: string, id: string) {
    await delay(150);
    const db = load();
    db.websites = db.websites.filter((w) => !(w.user_id === userId && w.id === id));
    save(db);
  },

  async listRegions() {
    await delay(150);
    return load().regions;
  },

  async createRegion(name: string) {
    await delay();
    const db = load();
    if (db.regions.some((r) => r.name === name)) throw new Error(`Region "${name}" already exists.`);
    const region = { id: Math.max(0, ...db.regions.map((r) => r.id)) + 1, name };
    db.regions.push(region);
    save(db);
    return region;
  },

  async requestRegion(userId: string, username: string, name: string, reason?: string) {
    await delay();
    const db = load();
    if (db.regions.some((r) => r.name === name)) throw new Error(`Region "${name}" already exists.`);
    if (db.requests.some((r) => r.user_id === userId && r.name === name && r.status === "Pending")) {
      throw new Error(`You already asked for "${name}". An admin will review it.`);
    }
    const request: RegionRequest = {
      id: Math.max(0, ...db.requests.map((r) => r.id)) + 1,
      name,
      reason: reason || null,
      status: "Pending",
      user_id: userId,
      username,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    db.requests.unshift(request);
    save(db);
    return request;
  },

  async listRegionRequests(userId: string, admin: boolean) {
    await delay(150);
    const all = load().requests;
    return admin ? all : all.filter((r) => r.user_id === userId);
  },

  async decideRegionRequest(id: number, decision: "approve" | "reject") {
    await delay();
    const db = load();
    const request = db.requests.find((r) => r.id === id);
    if (!request) throw new Error("Request not found.");
    if (request.status !== "Pending") throw new Error(`This request was already ${request.status.toLowerCase()}.`);
    if (decision === "approve") {
      if (db.regions.some((r) => r.name === request.name)) throw new Error(`Region "${request.name}" already exists.`);
      db.regions.push({ id: Math.max(0, ...db.regions.map((r) => r.id)) + 1, name: request.name });
    }
    request.status = decision === "approve" ? "Approved" : "Rejected";
    request.decidedAt = new Date().toISOString();
    save(db);
    return request;
  },
};

