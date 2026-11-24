import { describe, expect, test } from "bun:test";
import { classify } from "../worker/check";

describe("worker status rule (classify)", () => {
  test("2xx and 3xx are Up", () => {
    for (const code of [200, 204, 301, 304]) expect(classify({ httpStatus: code })).toEqual({ status: "Up", error: null });
  });

  test("429 is Unknown: the site answered but refused to tell us", () => {
    expect(classify({ httpStatus: 429 }).status).toBe("Unknown");
  });

  test("other 4xx and 5xx are Down, with the code as the reason", () => {
    expect(classify({ httpStatus: 404 })).toEqual({ status: "Down", error: "HTTP 404" });
    expect(classify({ httpStatus: 503 })).toEqual({ status: "Down", error: "HTTP 503" });
  });

  test("no response is Down with the network reason", () => {
    expect(classify({ httpStatus: null, error: "DNS lookup failed" })).toEqual({
      status: "Down",
      error: "DNS lookup failed",
    });
  });
});
