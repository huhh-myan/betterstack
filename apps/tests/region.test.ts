import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { newUser, startServer } from "./helpers";

const { start, stop, call } = startServer();
beforeAll(start);
afterAll(stop);

const regionName = () => `r-${crypto.randomUUID().slice(0, 8)}`;

describe("regions", () => {
  test("anyone signed in can list regions", async () => {
    const user = await newUser(call);
    const res = await call("GET", "/region/list", { token: user.token });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("only admins create regions (403 otherwise)", async () => {
    const user = await newUser(call);
    const res = await call("POST", "/region/create", { token: user.token, body: { name: regionName() } });
    expect(res.status).toBe(403);
  });

  test("admin creates a region (201, id from the database); duplicate is 409", async () => {
    const admin = await newUser(call, { admin: true });
    const name = regionName();
    const res = await call("POST", "/region/create", { token: admin.token, body: { name } });
    expect(res.status).toBe(201);
    expect(res.body.region.name).toBe(name);
    expect(Number.isInteger(res.body.region.id)).toBe(true);
    const dup = await call("POST", "/region/create", { token: admin.token, body: { name } });
    expect(dup.status).toBe(409);
  });

  test("a missing name is 400 (it used to hang)", async () => {
    const admin = await newUser(call, { admin: true });
    const res = await call("POST", "/region/create", { token: admin.token, body: {} });
    expect(res.status).toBe(400);
  });

  test("signin reports isAdmin", async () => {
    const admin = await newUser(call, { admin: true });
    const res = await call("POST", "/signin", { body: { username: admin.username, password: admin.password } });
    expect(res.body.user.isAdmin).toBe(true);
  });
});

describe("region requests", () => {
  test("user requests, admin approves: the region exists and the request is closed", async () => {
    const user = await newUser(call);
    const admin = await newUser(call, { admin: true });
    const name = regionName();

    const req = await call("POST", "/region/request", { token: user.token, body: { name, reason: "customers there" } });
    expect(req.status).toBe(201);
    expect(req.body.request.status).toBe("Pending");

    const again = await call("POST", "/region/request", { token: user.token, body: { name } });
    expect(again.status).toBe(409);

    const mine = await call("GET", "/region/requests", { token: user.token });
    expect(mine.body.isAdmin).toBe(false);
    expect(mine.body.requests.every((r: any) => r.user_id === user.id)).toBe(true);

    expect((await call("POST", `/region/requests/${req.body.request.id}/approve`, { token: user.token })).status).toBe(403);

    const all = await call("GET", "/region/requests", { token: admin.token });
    expect(all.body.isAdmin).toBe(true);
    expect(all.body.requests.find((r: any) => r.id === req.body.request.id).username).toBe(user.username);

    const approved = await call("POST", `/region/requests/${req.body.request.id}/approve`, { token: admin.token });
    expect(approved.status).toBe(200);
    expect(approved.body.region.name).toBe(name);
    expect(approved.body.request.status).toBe("Approved");

    const list = await call("GET", "/region/list", { token: user.token });
    expect(list.body.map((r: any) => r.name)).toContain(name);

    const twice = await call("POST", `/region/requests/${req.body.request.id}/approve`, { token: admin.token });
    expect(twice.status).toBe(409);
  });

  test("admin rejects a request", async () => {
    const user = await newUser(call);
    const admin = await newUser(call, { admin: true });
    const req = await call("POST", "/region/request", { token: user.token, body: { name: regionName() } });
    const rejected = await call("POST", `/region/requests/${req.body.request.id}/reject`, { token: admin.token });
    expect(rejected.status).toBe(200);
    expect(rejected.body.request.status).toBe("Rejected");
  });

  test("requesting a region that already exists is 409", async () => {
    const admin = await newUser(call, { admin: true });
    const user = await newUser(call);
    const name = regionName();
    await call("POST", "/region/create", { token: admin.token, body: { name } });
    const res = await call("POST", "/region/request", { token: user.token, body: { name } });
    expect(res.status).toBe(409);
  });
});
