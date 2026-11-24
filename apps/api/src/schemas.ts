// Request validation with Zod: every value from the outside world is checked
// here, at the boundary, before any route logic or database call sees it.

import { z } from "zod";

export const credentialsSchema = z.object({
  username: z
    .string({ error: "Username is required." })
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(32, "Username must be at most 32 characters.")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only use letters, numbers, _ . and -"),
  password: z
    .string({ error: "Password is required." })
    .min(6, "Password must be at least 6 characters.")
    .max(128, "Password must be at most 128 characters."),
});

/** Signin doesn't re-check the format rules, so older accounts can still sign in. */
export const signinSchema = z.object({
  username: z.string({ error: "Username is required." }).trim().min(1, "Username is required."),
  password: z.string({ error: "Password is required." }).min(1, "Password is required."),
});

/** Accepts "example.com" and stores "https://example.com": the worker needs a full URL. */
export const websiteSchema = z.object({
  url: z
    .string({ error: "url is required." })
    .trim()
    .min(1, "url is required.")
    .max(2048, "url is too long.")
    .transform((raw, ctx) => {
      const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
      let url: URL;
      try {
        url = new URL(withScheme);
      } catch {
        ctx.addIssue({ code: "custom", message: "That is not a valid URL." });
        return z.NEVER;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        ctx.addIssue({ code: "custom", message: "Only http and https URLs can be monitored." });
        return z.NEVER;
      }
      if (!url.hostname.includes(".") && url.hostname !== "localhost") {
        ctx.addIssue({ code: "custom", message: "The URL needs a full host name, like example.com." });
        return z.NEVER;
      }
      const bare = url.pathname === "/" && !url.search && !url.hash && !raw.endsWith("/");
      return bare ? url.href.slice(0, -1) : url.href;
    }),
});

export const regionNameSchema = z
  .string({ error: "name is required." })
  .trim()
  .min(2, "Region name must be at least 2 characters.")
  .max(40, "Region name must be at most 40 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes, e.g. eu-west-1.");

export const regionCreateSchema = z.object({ name: regionNameSchema });

export const regionRequestSchema = z.object({
  name: regionNameSchema,
  reason: z.string().trim().max(500, "Keep the reason under 500 characters.").optional(),
});

export const ticksQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(24 * 7).default(24),
});

export const idParam = z.object({ id: z.string().min(1).max(64) });
export const numericIdParam = z.object({ id: z.coerce.number().int().positive() });
