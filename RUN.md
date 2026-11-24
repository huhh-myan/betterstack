# Running bstack

Two ways to run it:

- **[Demo mode](#1-demo-mode-frontend-only)**: just the frontend, with mock data in your browser. No database, Redis or API needed.
- **[Full stack](#2-full-stack)**: Postgres + Redis + API + pusher + worker + frontend, with real checks of real websites.

## Prerequisites

- **[Bun](https://bun.sh) 1.3.14**, **Node.js 24+**, **Git**
- Full stack only: **Docker** (or local installs) for **Postgres 15+** and **Redis**

## Get the code

```bash
git clone -b feature/ai-changed https://github.com/huhh-myan/betterstack.git
cd betterstack
bun install
```

Existing clone: `git fetch origin`, then `git switch feature/ai-changed`, then `bun install`.

## 1. Demo mode (frontend only)

```bash
cd apps/web
```

PowerShell:

```powershell
$env:NEXT_PUBLIC_MOCK = "1"; bun run dev
```

macOS / Linux:

```bash
NEXT_PUBLIC_MOCK=1 bun run dev
```

Open **http://localhost:3001** and sign up with any username and password. New accounts get five sample monitors (one is down). A username starting with **`admin`** (e.g. `admin1`) is an admin in demo mode, so you can try both region views. Demo data lives in localStorage; clear site data for `localhost:3001` to reset it.

## 2. Full stack

### 2.1 Start Postgres and Redis

Existing containers:

```bash
docker start rocky_road wizardly_rubin
```

Or new ones:

```bash
docker run -d --name bstack-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bstack -p 5432:5432 postgres:18
docker run -d --name bstack-redis -p 6379:6379 redis
```

### 2.2 Environment files

Each app loads `.env` from its own folder. All four need the same `DATABASE_URL`:

| File | Contents |
|---|---|
| `packages/db-prisma/.env` | `DATABASE_URL=...` (used by the Prisma CLI) |
| `apps/api/.env` | copy `apps/api/.env.example`: `DATABASE_URL`, **`JWT_SECRET`** (32+ random chars), `ADMIN_USERNAMES=admin` |
| `apps/pusher/.env` | `DATABASE_URL=...` |
| `apps/worker/.env` | `DATABASE_URL=...` |

Generate a JWT secret:

```bash
bun -e "console.log(crypto.randomUUID().replaceAll('-','') + crypto.randomUUID().replaceAll('-',''))"
```

### 2.3 Apply the database migrations

```bash
cd packages/db-prisma
bunx prisma db migrate
bunx prisma migration status
```

`status` should say **Up to date**.

### 2.4 Start the four processes (four terminals)

API (port 3000):

```bash
cd apps/api
bun run dev
```

Frontend (port 3001):

```bash
cd apps/web
bun run dev
```

Pusher (queues every website every 3 minutes; set `PUSH_INTERVAL_MS=30000` for faster results while testing):

```bash
cd apps/pusher
bun index.ts
```

Worker. `REGION_ID` must be the id of an existing region, and `WORKER_ID` a name that stays the same across restarts. PowerShell:

```powershell
cd apps/worker
$env:REGION_ID = "1"; $env:WORKER_ID = "w1"; bun index.ts
```

macOS / Linux:

```bash
cd apps/worker
REGION_ID=1 WORKER_ID=w1 bun index.ts
```

### 2.5 Use it

1. Open **http://localhost:3001** and sign up.
2. Add a monitor. Its first check appears after the next pusher cycle (up to 3 minutes).
3. **Admin:** sign up with a username listed in `ADMIN_USERNAMES` (default `admin`). Existing users in that list become admins when the API starts. Admins create regions and approve requests on the **Regions** page; everyone else can request a region there.
4. **New region:** after creating it, start a worker for it: `REGION_ID=<its id>`, plus a `WORKER_ID` of your choice.

## 3. Tests

```bash
docker exec -it rocky_road psql -U postgres -c "CREATE DATABASE bstack_test;"
```

Then migrate `bstack_test` (see `apps/tests/README.md`), copy `apps/tests/.env.example` to `apps/tests/.env`, and run:

```bash
cd apps/tests
bun test
```

Type checks: `bunx tsc --noEmit -p .` in `apps/api`, `apps/worker`, `apps/pusher`, `apps/tests`, `packages/redis` and `packages/db-prisma`, and `bun run check-types` in `apps/web`.

## Ports

| What | Port |
|---|---|
| Frontend (`apps/web`) | 3001 |
| API (`apps/api`) | 3000 |
| Postgres | 5432 |
| Redis | 6379 |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Sign-in says **"Can't reach the API. Is apps/api running?"** | The API isn't running on :3000 | Start `apps/api`, or use demo mode |
| API exits: **`JWT_SECRET is not set`** / **must be at least 32 characters** | `apps/api/.env` incomplete | Add a generated secret (2.2) |
| Any app exits: **`DATABASE_URL is not set`** | No `.env` in the folder you ran it from | Run from the app's folder, or add its `.env` |
| **`Can't connect to Redis`** | Redis container stopped | `docker start wizardly_rubin` |
| Worker exits: **`Region N doesn't exist`** | Wrong `REGION_ID` | Use an id from the Regions page, or create the region |
| Monitors stay "Waiting…" | Pusher or worker not running, or no worker for any region | Start both; check the worker log for `Up`/`Down` lines |
| Port 3001 already in use / "a dev server is already running" | Another `apps/web` dev server | Stop it (Ctrl+C, or end the process on port 3001) |
| Sent back to sign in | Token expired (2 h) or the API's `JWT_SECRET` changed | Sign in again |
| Demo mode isn't on | `NEXT_PUBLIC_*` is read when the server starts | Set it in the same terminal, before `bun run dev` |
| Can't create regions | You're not an admin | Use a username from `ADMIN_USERNAMES`, then restart the API (or sign up with it) |
