import { db } from "@repo/db-prisma/db";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { newUser, startServer } from "./helpers";

const { start, stop, call } = startServer();
beforeAll(start);
afterAll(stop);

async function aRegionId() {
  const existing = await db.orm.public.Region.first();
  if (existing) return existing.id;
  return (await db.orm.public.Region.create({ name: `test-${Date.now()}` })).id;
}

describe("websites", () => {
  test("create adds https:// and answers 201", async () => {
    const user = await newUser(call);
    const res = await call("POST", "/user/website/create", { token: user.token, body: { url: "example.com" } });
    expect(res.status).toBe(201);
    expect(res.body.website.url).toBe("https://example.com");
    expect(res.body.website.user_id).toBe(user.id);
  });

  test("an invalid URL is 400", async () => {
    const user = await newUser(call);
    for (const url of ["not a url", "ftp://example.com", "localhostish", ""]) {
      const res = await call("POST", "/user/website/create", { token: user.token, body: { url } });
      expect(res.status).toBe(400);
    }
  });

  test("needs a token", async () => {
    const res = await call("POST", "/user/website/create", { body: { url: "example.com" } });
    expect(res.status).toBe(401);
  });

  test("list returns only my websites, each with ticks", async () => {
    const me = await newUser(call);
    const other = await newUser(call);
    await call("POST", "/user/website/create", { token: me.token, body: { url: "https://mine.example" } });
    await call("POST", "/user/website/create", { token: other.token, body: { url: "https://theirs.example" } });

    const res = await call("GET", "/user/websites", { token: me.token });
    expect(res.status).toBe(200);
    expect(res.body.websites.map((w: any) => w.url)).toEqual(["https://mine.example"]);
    expect(res.body.websites[0].ticks).toEqual([]);
  });

  test("someone else's website is 404 (not 403: don't confirm it exists)", async () => {
    const me = await newUser(call);
    const other = await newUser(call);
    const created = await call("POST", "/user/website/create", { token: other.token, body: { url: "https://x.example" } });
    const id = created.body.website.id;
    expect((await call("GET", `/user/website/${id}`, { token: me.token })).status).toBe(404);
    expect((await call("GET", `/user/website/${id}/ticks`, { token: me.token })).status).toBe(404);
    expect((await call("DELETE", `/user/website/${id}`, { token: me.token })).status).toBe(404);
  });

  test("ticks: only recent ones, oldest first, with status details", async () => {
    const user = await newUser(call);
    const created = await call("POST", "/user/website/create", { token: user.token, body: { url: "https://t.example" } });
    const websiteId = created.body.website.id;
    const regionId = await aRegionId();
    const now = Date.now();
    for (const [minutesAgo, status, http] of [
      [60 * 30, "Up", 200], // 30 h ago: outside the default 24 h
      [10, "Down", 503],
      [5, "Up", 200],
    ] as const) {
      await db.orm.public.WebsiteTicks.create({
        response_time_ms: 100,
        status,
        http_status: http,
        error: status === "Down" ? "HTTP 503" : null,
        createdAt: new Date(now - minutesAgo * 60_000),
        region_id: regionId,
        website_id: websiteId,
      });
    }

    const res = await call("GET", `/user/website/${websiteId}/ticks`, { token: user.token });
    expect(res.status).toBe(200);
    expect(res.body.ticks.map((t: any) => t.status)).toEqual(["Down", "Up"]);
    expect(res.body.ticks[0]).toMatchObject({ http_status: 503, error: "HTTP 503" });

    const wide = await call("GET", `/user/website/${websiteId}/ticks?hours=48`, { token: user.token });
    expect(wide.body.ticks).toHaveLength(3);

    const list = await call("GET", "/user/websites", { token: user.token });
    expect(list.body.websites[0].ticks).toHaveLength(2);
  });

  test("delete removes the website and its ticks (204), then 404", async () => {
    const user = await newUser(call);
    const created = await call("POST", "/user/website/create", { token: user.token, body: { url: "https://d.example" } });
    const id = created.body.website.id;
    await db.orm.public.WebsiteTicks.create({
      response_time_ms: 50,
      status: "Up",
      region_id: await aRegionId(),
      website_id: id,
    });
    expect((await call("DELETE", `/user/website/${id}`, { token: user.token })).status).toBe(204);
    expect((await call("GET", `/user/website/${id}`, { token: user.token })).status).toBe(404);
    expect(await db.orm.public.WebsiteTicks.where({ website_id: id }).first()).toBeNull();
  });
});
