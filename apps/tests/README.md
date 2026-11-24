# tests

Automated tests with `bun test`: the API over real HTTP, and the worker's status rule.

## Run them

They write users, websites and regions, so they use a **separate database**, `bstack_test`, never your real one.

One-time setup (with the `rocky_road` container running):

```bash
docker exec -it rocky_road psql -U postgres -c "CREATE DATABASE bstack_test;"
cd packages/db-prisma
# PowerShell: $env:DATABASE_URL = "postgresql://postgres:<password>@localhost:5432/bstack_test"
bunx prisma db migrate
```

Then copy `.env.example` to `.env` (it points at `bstack_test`) and:

```bash
cd apps/tests
bun test
```

After a schema change, migrate `bstack_test` too.

## What's covered (32 tests)

| File | What it checks |
|---|---|
| `user.test.ts` | signup 201 without the password, 409 taken, 400 invalid / bad JSON; signin token + `isAdmin`, the same 401 for wrong password and unknown user; Bearer and raw token; 401 for missing/garbage tokens; no stack traces in errors; 404 for unknown routes; `/health` |
| `website.test.ts` | create adds `https://`, invalid URLs 400, auth required, the list shows only your websites, someone else's website is 404 for get/ticks/delete, the ticks time window and order, delete removes ticks |
| `region.test.ts` | list, create is admin-only (403), 201 + DB id, duplicate 409, the old "no name hangs" case is now 400, `isAdmin` on signin, request → approve (creates the region), approve twice 409, reject, requesting an existing region 409 |
| `worker.test.ts` | `classify()`: 2xx/3xx Up, 429 Unknown, other codes Down with `HTTP <code>`, no response Down with the reason |

## How it works

`helpers.ts` imports the Express `app` from `apps/api/src/app.ts` (the file without `listen()`) and starts it on port `0`, which lets the OS pick a free port. Each test file gets its own server. Tests talk to it with `fetch`, exactly like a client would. `newUser()` signs up a random user and returns their token; `{ admin: true }` also inserts an `Admin` row.

## What you should add next

- Tests for the **worker loop** with a real Redis (a test stream): pending recovery, ack after insert, `XAUTOCLAIM`.
- A **cleanup** step (truncate tables before the run) so `bstack_test` doesn't grow.
- Run the suite in **CI** (GitHub Actions with Postgres + Redis service containers).
- Frontend tests with Playwright (sign up → add monitor → see it on the dashboard).
