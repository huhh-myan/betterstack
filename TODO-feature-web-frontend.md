# TODO: feature/web-frontend

Work left to make apps/web run on the real API instead of browser-side workarounds.
Status-code cleanup lives in `TODO.md` on `main`.

## Backend (apps/api/index.ts)

- [x] `GET /user/website/:id` filters on `id` (was `website_id`).
- [x] `GET /user/website/:id` uses `.first()` (was `.all()`).
- [x] `GET /user/website/:id` no longer narrows fields with `.select("url")`.
- [ ] **`GET /user/website/:id` include callback returns nothing.** The callback has a block body
  `{ tick.where(...) }` with no `return`, so the refinement is lost.
- [ ] **`GET /user/website/:id` time filter is wrong.** `createdAt.gt(Date.now())` asks for ticks
  newer than now, which matches none. It needs ticks newer than now minus 24 hours, passed as a
  `Date` rather than a number.
- [ ] **`GET /user/website/:id` crashes on someone else's website.** `.first()` returns `null`
  for a missing or foreign website, and `websiteWithTicks.ticks` then throws, so the route
  answers 400. Remove that unused line.
- [ ] **`(tick: any)` / `(t: any)` annotations.** They switch off the ORM's typing, which would
  have flagged the two bugs above. Let the types be inferred.
- [ ] **`GET /user/website/:id` response key.** The frontend reads `{ website }`, the route
  returns `{ websiteWithTicks }`. Rename one side.
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

- [ ] `lib/data.ts`: list monitors from `GET /user/websites` and drop the localStorage id list
  (`lib/session.ts` `rememberWebsiteId` / `getKnownWebsiteIds` / `forgetWebsiteId`).
- [ ] `lib/data.ts`: make `removeMonitor` call `DELETE /user/website/:id`.
- [ ] `lib/data.ts`: use real ticks from the API instead of `simulateTicks`. Set
  `simulatedTicks: false` and remove the "Check results are simulated" notice.
- [ ] Dashboard list needs ticks per website: either one ticks request per website, or have
  `GET /user/websites` include the last 24h of ticks.
- [ ] `lib/api.ts`: add `listWebsites` and `deleteWebsite`, and update `getWebsite`'s response type.
