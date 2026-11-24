# TODO

- [ ] **Cascade-delete website ticks.** `WebsiteTicks.website_id` references `Website.id` with no
  `onDelete` rule, so deleting a website that has ticks fails on the foreign key. Add
  `onDelete: Cascade` to the `website` relation on `WebsiteTicks` in
  `packages/db-prisma/src/prisma/contract.prisma`, re-emit the contract, and migrate. Until then,
  `DELETE /user/website/:id` must delete the website's ticks first.
  - **Race in the two-step delete.** The route deletes the ticks, then the website. If the worker
    inserts a tick between those two statements, the website delete hits the foreign key and
    fails. Wrapping both in a transaction doesn't fix it: the worker's insert still lands between
    them. Cascade fixes it, because Postgres removes the website and its ticks in one statement.
    Once cascade is in, drop the tick delete from the route.
- [ ] **`DELETE /user/website/:id` makes three DB calls.** It looks the website up to check
  ownership, deletes its ticks, then deletes the website. With cascade in place this collapses to
  one call: delete the website filtered by `id` and `user_id`, and use the returned row (or `null`)
  to tell "deleted" from "not found / not yours". No separate ownership lookup or tick delete needed.

## Status codes and error responses (apps/api/index.ts)

- [ ] **Auth failures return 400.** `jsonMiddleware` answers a missing or bad token with 400. It
  should be 401. The web frontend spots a logged-out user by the exact message
  `"Authorization Error!"` (`apps/web/lib/api.ts`), so update that check in the same change.
- [ ] **Every signup failure is 409.** `/signup` answers 409 for any error. Return 409 only for a
  taken username, 400 for bad input and 500 for everything else. The frontend turns any 409
  into "That username is already taken."
- [ ] **Signin failures are 409.** Wrong credentials should be 401, missing fields 400.
- [ ] **Signup leaks the password.** `/signup` returns the whole user row, password included,
  as `user_id`. Return only `{ id, username }`.
- [ ] **`DELETE /user/website/:id` mislabels results.** Any thrown error is 404, so a database
  failure looks like "not found". When nothing matched, `.delete()` returns null and the route
  still answers 200 "Successfully deleted". It should be 404 when nothing matched and 500 when
  the delete throws.
- [ ] **`POST /region/create` never responds without a name.** It runs a bare `return;`, so the
  request hangs. It should answer 400.
- [ ] **Catch-all 400s.** Most routes answer 400 for any thrown error, including database
  failures. Server faults should be 500.

## Type errors

- [ ] **`packages/db-prisma/src/prisma/db.ts:7` TS1484.** `SqlMigrationRunnerFailure` is a type
  imported as a value, which `verbatimModuleSyntax` rejects. It's unused, along with
  `createSqlTextSources`, `warn` and `before` on nearby lines: remove them, or use `import type`.

## Checker pipeline

- [ ] **Consumer groups are created by hand.** Each region's worker reads `bstack:website` as a
  consumer group named after the region id, and the group has to exist before the pusher queues
  anything (`XGROUP CREATE bstack:website <region-id> $ MKSTREAM`; `$` skips messages added
  before the group existed). Options:
  - Create the group when a region is created (`POST /region/create` calls `xGroupCreate` after the insert).
  - Or have each worker create its own group on startup, ignoring the `BUSYGROUP` error if it
    already exists. This is the usual pattern: the worker is the one that needs the group, and it
    also covers regions created before this change.
  - Until then: document the `XGROUP CREATE` step in RUN.md as a manual step before starting.
