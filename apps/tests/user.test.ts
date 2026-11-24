import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { newUser, startServer, uniqueName } from "./helpers";

const { start, stop, call } = startServer();
beforeAll(start);
afterAll(stop);

describe("signup", () => {
  test("creates a user, answers 201, never returns the password", async () => {
    const username = uniqueName();
    const res = await call("POST", "/signup", { body: { username, password: "secret123" } });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(username);
    expect(JSON.stringify(res.body)).not.toContain("secret123");
    expect(res.body.user.password).toBeUndefined();
  });

  test("a taken username is 409", async () => {
    const user = await newUser(call);
    const res = await call("POST", "/signup", { body: { username: user.username, password: "another1" } });
    expect(res.status).toBe(409);
  });

  test("invalid input is 400 with a reason", async () => {
    const res = await call("POST", "/signup", { body: { username: "ab", password: "1" } });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  test("malformed JSON is 400, not 500", async () => {
    const res = await call("POST", "/signup", { body: "{not json" });
    expect(res.status).toBe(400);
  });
});

describe("signin", () => {
  test("returns a token and the user", async () => {
    const user = await newUser(call);
    const res = await call("POST", "/signin", { body: { username: user.username, password: user.password } });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toEqual({ id: user.id, username: user.username, isAdmin: false });
  });

  test("wrong password and unknown user get the same 401", async () => {
    const user = await newUser(call);
    const wrong = await call("POST", "/signin", { body: { username: user.username, password: "wrong-pass" } });
    const unknown = await call("POST", "/signin", { body: { username: uniqueName(), password: "wrong-pass" } });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  test("a missing field is 400", async () => {
    const res = await call("POST", "/signin", { body: { username: "someone" } });
    expect(res.status).toBe(400);
  });
});

describe("auth", () => {
  test("GET /user with a Bearer token", async () => {
    const user = await newUser(call);
    const res = await call("GET", "/user", { token: user.token });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, username: user.username, isAdmin: false });
  });

  test("the raw token without 'Bearer' still works (compatibility)", async () => {
    const user = await newUser(call);
    const res = await call("GET", "/user", { rawAuth: user.token });
    expect(res.status).toBe(200);
  });

  test("no token or a bad token is 401", async () => {
    expect((await call("GET", "/user")).status).toBe(401);
    expect((await call("GET", "/user", { rawAuth: "Bearer garbage" })).status).toBe(401);
  });

  test("errors don't leak stack traces", async () => {
    const res = await call("GET", "/user", { rawAuth: "Bearer garbage" });
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.(ts|js):\d+/);
  });
});

describe("misc", () => {
  test("unknown routes are 404, not an auth error", async () => {
    const res = await call("GET", "/definitely-not-a-route");
    expect(res.status).toBe(404);
  });

  test("health reports the database", async () => {
    const res = await call("GET", "/health");
    expect(res.status).toBe(200);
    expect(res.body.db).toBe("up");
  });
});
