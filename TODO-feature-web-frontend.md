# TODO: feature/web-frontend

Work left to make apps/web run on the real API instead of browser-side workarounds.
Status-code cleanup lives in `TODO.md` on `main`.

## Backend (apps/api/index.ts)

- [x] `GET /user/website/:id` filters on `id` (was `website_id`).
- [ ] **`GET /user/website/:id` lost `.first()` again.** The braces fix removed it, so the chain
  ends at `.include(...)` and no query runs. Add `.first()` back after the include.
- [x] `GET /user/website/:id` include callback now has an expression body (logged as P101 on `main`).
- [x] `GET /user/website/:id` no longer narrows fields with `.select("url")`.
- [ ] **`GET /user/website/:id` time filter is a number.** The 24h window is right now, but
  `Date.now() - 24*60*60*1000` is a number of milliseconds and `createdAt` is a `DateTime`.
  Wrap it in `new Date(...)`.
- [ ] **`GET /user/website/:id` crashes on someone else's website.** `.first()` returns `null`
  for a missing or foreign website, and `websiteWithTicks.ticks` then throws, so the route
  answers 400. Remove that unused line.
- [ ] **`(tick: any)` / `(t: any)` annotations.** They switch off the ORM's typing, which would
  have flagged the two bugs above. Let the types be inferred.
- [x] `GET /user/website/:id` response key: the frontend now reads `{ websiteWithTicks }`.
- [ ] **`DELETE /user/website/:id` filters ticks on `user_id`, which `WebsiteTicks` doesn't have.**
  A tick only knows its `website_id`; ownership lives on `Website`. Look up the website by `id`
  and `user_id` first, stop with 404 if it's `null`, then delete its ticks by `website_id`.
- [x] `DELETE /user/website/:id` deletes ticks before the website (race tracked in `TODO.md` on `main`).
- [ ] **`DELETE /user/website/:id` model name.** It uses `db.orm.public.websiteTicks`; the model is
  `WebsiteTicks`. The lowercase name is undefined, so every delete throws.
- [ ] **`DELETE /user/website/:id` has no ownership check before the tick delete.** Ticks are
  deleted by `website_id` alone, so any logged-in user can wipe another user's ticks (the
  website delete then matches nothing and the route still says "Successfully deleted"). Look up
  the website by `id` and `user_id` first and stop if it's `null`.
- [ ] **`DELETE /user/website/:id` `.deleteAll({})`.** The ORM docs show `deleteAll()` with no
  argument; check whether the `{}` is accepted.

## Frontend (apps/web)

- [x] `lib/data.ts`: list monitors from `GET /user/websites`; localStorage id list removed from
  `lib/session.ts`, along with the "add an existing website by id" option in the add dialog.
- [x] `lib/data.ts`: `removeMonitor` calls `DELETE /user/website/:id`; the delete dialog says it
  really deletes, and a failed delete shows an error toast instead of navigating away.
- [x] `lib/data.ts`: real ticks from the API; `simulateTicks` is only used in mock mode, and the
  "Check results are simulated" banner only shows in mock mode.
- [x] `lib/api.ts`: `listWebsites`, `deleteWebsite`, and `getWebsite` typed as `{ websiteWithTicks }`.
- [ ] **Dashboard list makes one request per website (N+1).** Fine for a handful of monitors.
  Later: have `GET /user/websites` include the last 24h of ticks and drop the per-website calls.
- [ ] **`bun run lint` in apps/web fails to start:** `Cannot find package 'eslint' imported from
  packages/eslint-config/next.js`. The eslint-config package doesn't declare `eslint` itself.
- [ ] Test the frontend against the real API once the backend items above are fixed.
