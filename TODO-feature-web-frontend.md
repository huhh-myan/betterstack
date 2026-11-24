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

## Checker pipeline (apps/pusher, apps/worker): needed for real ticks

- [x] **Region 1 must exist.** (Fixed: `/region/create` no longer passes an id.) The worker writes every tick with `region_id: 1` (and reads as
  consumer group `"1"`). `POST /region/create` picks a random id, so region 1 usually doesn't
  exist and every tick insert fails on the foreign key. Either let the DB assign the id
  (drop the random `id` so autoincrement gives the first region 1) or read the region id from env.
- [ ] **Consumer group `1` must exist before the pusher runs** (manual for now; automating it is in `TODO.md` on `main`). `XGROUP CREATE bstack:website 1 $ MKSTREAM`.
  `$` means "only messages added after now", so create the group first.
- [x] **Worker crashes when the stream is empty.** (Fixed: `BLOCK: 0` in `xReadGroup`.) `xReadGroup` has no `BLOCK`, so it returns
  `null` immediately when there's nothing new, and the worker throws "Stream empty". Wait with
  `BLOCK` and loop again instead of throwing.
- [x] **Pusher runs once and exits.** (Fixed: `setInterval` is back.) Still to do: call `main()` once at startup too, or the first push waits 3 minutes. The `setInterval` is commented out, so websites are queued
  once. Run it every 3 minutes (the interval the frontend assumes).
- [ ] **No timeout on `axios.get`.** One site that never answers blocks the whole batch, because
  `Promise.allSettled` waits for it. Set a timeout and record it as Down.
- [ ] `console.log(promisesAxiosArray)` inside the callback that builds `promisesAxiosArray`
  throws a ReferenceError (the variable isn't initialised yet). Ticks still get written, but
  every promise ends up rejected. Move the log after the `await`.
- [ ] Messages are acked before they're checked, so a crash mid-batch loses them. Ack after the tick is written.

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
