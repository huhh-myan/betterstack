# Running bstack

Two ways to run it:

- **[Demo mode](#1-demo-mode-frontend-only)**: just the frontend, with mock data in your browser. No database, Redis or API needed. Start here.
- **[Full stack](#2-full-stack-frontend--api)**: the frontend talking to the real API (`apps/api`), which needs Postgres. Redis, the pusher and the worker are optional.

## Prerequisites

- **[Bun](https://bun.sh) 1.3.14** (the repo's package manager and runtime)
- **Node.js 24+** (the root `package.json` asks for it)
- **Git**
- Full stack only: **Docker** (or local installs) for **Postgres 15+** and **Redis**

## Get the code

The frontend lives on the `feature/web-frontend` branch.

New clone:

```bash
git clone -b feature/web-frontend https://github.com/huhh-myan/betterstack.git
cd betterstack
```

Existing clone:

```bash
git fetch origin
git switch feature/web-frontend
```

Then install everything from the repo root:

```bash
bun install
```

## 1. Demo mode (frontend only)

```bash
cd apps/web
```

Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_MOCK = "1"; bun run dev
```

macOS / Linux:

```bash
NEXT_PUBLIC_MOCK=1 bun run dev
```

Open **http://localhost:3001** and sign up with **any** username and password. The new account comes with five sample monitors, one of them currently down.

Things to try: open a monitor, hover the uptime bar and the chart, add a monitor (`mysite.io` works), create a region, switch light/dark from the sun/moon icon.

Demo data is stored in your browser's localStorage. To reset it, clear site data for `localhost:3001` in the browser's dev tools.

Stop the server with **Ctrl+C**.

## 2. Full stack (frontend + API)

### Start Postgres (and Redis, if you want the checker pipeline)

With Docker, for example:

```bash
docker run -d --name bstack-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=bstack -p 5432:5432 postgres:18
docker run -d --name bstack-redis -p 6379:6379 redis
```

### Point the API at the database

Each backend app loads `.env` from the folder you run it in. Create `apps/api/.env` (see `packages/db-prisma/.env.example`):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bstack"
```

Make sure the database schema is applied (see `packages/db-prisma/prisma-8.md` and `README_details.md`).

### Start the API (port 3000)

```bash
cd apps/api
bun index.ts
```

### Start the frontend (port 3001)

In a second terminal:

```bash
cd apps/web
bun run dev
```

Open **http://localhost:3001**, create an account and add monitors. The browser sends every request to `/api/*` on port 3001 and Next.js forwards it to the API on port 3000, so the API needs no CORS setup. To use an API somewhere else, set `API_URL` (copy `apps/web/.env.example` to `apps/web/.env.local`).

**Still simulated with the real API:** the uptime and response-time numbers. The API doesn't have an endpoint for check results (ticks) yet, so the frontend generates them and shows a banner saying so. Accounts, websites and regions are real. Details: `apps/web/README.md`.

### Optional: the checker pipeline (pusher + worker)

These write real ticks to the database (the frontend doesn't read them yet). Per `README_details.md`:

1. Create each region's consumer group once, in `redis-cli`:
   ```
   XGROUP CREATE bstack:website <region-id> $ MKSTREAM
   ```
2. Give `apps/pusher` and `apps/worker` the same `.env` as the API.
3. Run each from its own folder:
   ```bash
   cd apps/pusher && bun index.ts   # queues every website once, then Ctrl+C
   cd apps/worker && bun index.ts   # checks a batch, then Ctrl+C
   ```

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
| Sign-in says **"Can't reach the API. Is apps/api running?"** | The API isn't running on :3000 (and demo mode is off) | Start `apps/api`, or run the frontend in demo mode |
| Port 3001 is already in use, or Next.js says a dev server is already running | Another dev server for `apps/web` is still running (Next.js allows one per app folder) | Stop it (Ctrl+C in its terminal, or end the process using port 3001) |
| Sent to the sign-in page while using the dashboard | The API rejected the token. Tokens expire after 2 hours. | Sign in again |
| Demo mode isn't on even though you set the variable | `NEXT_PUBLIC_*` is read when the server starts | Set it in the same terminal *before* `bun run dev`, then restart |
| The API crashes on start with a database error | `DATABASE_URL` missing or Postgres not running | Check `apps/api/.env` and that the Postgres container is up |

## Checks

From `apps/web`:

```bash
bun run check-types   # TypeScript
bun run build         # production build
```
