// Thin client for the Express API in apps/api. Requests go to /api/* on this
// app and next.config.js forwards them to the API server (which has no CORS).

import type { Region, Website, WebsiteWithTicks } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public unauthorized = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  { method = "GET", body, token }: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // The API reads the raw JWT from Authorization, without a "Bearer " prefix.
  if (token) headers["Authorization"] = token;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the API. Is apps/api running?", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // The Next.js proxy answers 500 with an HTML page when the API is down.
    if (data === null) throw new ApiError("Can't reach the API. Is apps/api running?", res.status);
    const message: string = data.meme ?? data.message ?? `Request failed (${res.status})`;
    // jsonMiddleware answers 400 "Authorization Error!" for a missing or bad token.
    throw new ApiError(message, res.status, data.message === "Authorization Error!");
  }
  return data as T;
}

export const api = {
  signup: (username: string, password: string) =>
    request<{ user_id: { id: string; username: string } }>("/signup", {
      method: "POST",
      body: { username, password },
    }),

  signin: (username: string, password: string) =>
    request<{ user_id: string; token: string }>("/signin", {
      method: "POST",
      body: { username, password },
    }),

  me: (token: string) => request<{ user_id: string }>("/user", { token }),

  createWebsite: (token: string, url: string) =>
    request<{ website: Website }>("/user/website/create", { method: "POST", token, body: { url } }),

  listWebsites: (token: string) => request<{ websites: Website[] }>("/user/websites", { token }),

  /** The website with its ticks from the last 24 hours, or null if it isn't the user's. */
  getWebsite: (token: string, id: string) =>
    request<{ websiteWithTicks: WebsiteWithTicks | null }>(`/user/website/${encodeURIComponent(id)}`, {
      token,
    }),

  deleteWebsite: (token: string, id: string) =>
    request<{ message: string }>(`/user/website/${encodeURIComponent(id)}`, { method: "DELETE", token }),

  listRegions: (token: string) => request<Region[]>("/region/list", { token }),

  createRegion: (token: string, name: string) =>
    request<{ message: string }>("/region/create", { method: "POST", token, body: { name } }),
};
