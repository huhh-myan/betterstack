# TODO: feature/web-frontend

Work left to make apps/web run on the real API instead of browser-side workarounds.
Status-code cleanup lives in `TODO.md` on `main`.

## Backend (apps/api/index.ts)

- [ ] **`GET /user/website/:id` filters on a field that doesn't exist.** The `where` uses
  `website_id`, but on `Website` the field is `id` (`website_id` is a column on `WebsiteTicks`).
- [ ] **`GET /user/website/:id` returns an array.** `.all()` gives an array, so
  `websiteWithTicks.ticks` is undefined. Use `.first()` so a missing or foreign website comes
  back as `null`.
- [ ] **`GET /user/website/:id` drops website fields.** `.select("url")` leaves out `id`,
  `timeAdded` and `user_id`, which the frontend's `Website` type needs. Drop the `select`.
- [ ] **`GET /user/website/:id` returns every tick ever recorded.** Limit the include to the last
  24 hours (`createdAt` gte now minus 24h), which is the window the frontend draws.
- [ ] **`GET /user/website/:id` response key.** The frontend reads `{ website }`. Either return the
  website-with-ticks under `website` or update `apps/web/lib/api.ts` to match.
- [ ] **`DELETE /user/website/:id` fails for any website with ticks.** The foreign key from
  `WebsiteTicks` blocks it until cascade lands (see `TODO.md` on `main`). Check ownership first,
  then delete the website's ticks, then the website. Deleting ticks by `website_id` before the
  ownership check would let any logged-in user wipe another user's ticks.
- [ ] Remove the unused `websiteTicks` variable in `GET /user/website/:id`.

## Frontend (apps/web)

- [ ] `lib/data.ts`: list monitors from `GET /user/websites` and drop the localStorage id list
  (`lib/session.ts` `rememberWebsiteId` / `getKnownWebsiteIds` / `forgetWebsiteId`).
- [ ] `lib/data.ts`: make `removeMonitor` call `DELETE /user/website/:id`.
- [ ] `lib/data.ts`: use real ticks from the API instead of `simulateTicks`. Set
  `simulatedTicks: false` and remove the "Check results are simulated" notice.
- [ ] Dashboard list needs ticks per website: either one ticks request per website, or have
  `GET /user/websites` include the last 24h of ticks.
- [ ] `lib/api.ts`: add `listWebsites` and `deleteWebsite`, and update `getWebsite`'s response type.
