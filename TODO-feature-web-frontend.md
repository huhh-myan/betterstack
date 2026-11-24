# TODO: feature/web-frontend

Work left to make apps/web run on the real API instead of browser-side workarounds.
Status-code cleanup lives in `TODO.md` on `main`.

## Backend (apps/api/index.ts)

- [x] `GET /user/websites` lists the user's websites.
- [x] `GET /user/website/:id` returns `{ websiteWithTicks }` (website plus last 24h of ticks), or
  `null` when the website isn't the user's. `tick`/`t` now inferred (the `any`s are gone).
- [x] `DELETE /user/website/:id` checks ownership, deletes the ticks, then the website.
  Three DB calls and the delete race are tracked in `TODO.md` on `main`.
- [x] `packages/db-prisma` had no `node_modules`, so the ORM resolved to `any` and the API
  couldn't import it. Fixed with `bun install` at the root.

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
