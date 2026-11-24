# web: bstack frontend

Next.js 16 (App Router) + Tailwind CSS v4 + shadcn/ui (`base-nova` style, Base UI primitives) frontend for the uptime monitor in `apps/api`.

## Run it

```bash
bun run dev                  # http://localhost:3001
```

The web app runs on **3001** because the API (`apps/api`) uses 3000. Copy `.env.example` to `.env.local` if you need to change anything.

### Demo mode (no backend)

PowerShell:

```powershell
$env:NEXT_PUBLIC_MOCK = "1"; bun run dev
```

Everything (accounts, websites, regions, checks) is mock data kept in this browser's localStorage. Any username/password works and new accounts get five sample monitors.

## Pages

| Route | What it does | API calls |
|---|---|---|
| `/` | Landing page | none |
| `/signin`, `/signup` | Auth forms. Sign-up signs you in straight after. | `POST /signup`, `POST /signin` |
| `/dashboard` | Monitors list: status, 24 h uptime strip, uptime %, avg response, add-monitor dialog | `GET /user/website/:id` per known id, `GET /region/list` |
| `/dashboard/monitors/[id]` | Monitor detail: status, uptime/avg/p95, 24 h uptime bar, response-time chart per region, region table, recent checks | `GET /user/website/:id`, `GET /region/list` |
| `/dashboard/regions` | List and create regions | `GET /region/list`, `POST /region/create` |

## How it talks to the API

- **No CORS needed.** The browser calls `/api/*` on this app; `next.config.js` rewrites it to `API_URL` (default `http://localhost:3000`).
- **Auth:** the JWT from `/signin` is stored in localStorage (`bstack:session`) and sent as the raw `Authorization` header (no `Bearer`), as `apps/api/middleware.ts` expects. A 400 `"Authorization Error!"` from the API signs you out and sends you to `/signin`. `/dashboard/*` is guarded in the browser (`app/dashboard/layout.tsx`).
- All data access goes through **`lib/data.ts`**. Pages never call `fetch` directly.

## What's simulated, and how to replace it

The API is missing a few endpoints, so `lib/data.ts` fills the gaps. The dashboard shows a banner saying so.

| Gap in the API | What the frontend does now | Swap it for |
|---|---|---|
| No "list my websites" endpoint | Remembers ids of websites created in this browser (`bstack:websites:<userId>`) and fetches each one. Websites created elsewhere (curl, tests) can be added by id from the "Add monitor" dialog. | `GET /user/websites` → replace the id loop in `listMonitors` |
| No endpoint for ticks | `simulateTicks()` in `lib/mock.ts` makes 24 h of deterministic checks every 3 min per region | Return ticks from the API (e.g. `GET /user/website/:id/ticks?since=…`) and drop `simulateTicks` in `toMonitor` |
| No delete endpoint | "Remove from dashboard" only forgets the id locally | `DELETE /user/website/:id` → call it in `removeMonitor` |

Once ticks come from the API, every chart, uptime bar and stat works unchanged: they're computed in `lib/stats.ts` from a `WebsiteTick[]` shaped like the Prisma model.

## Layout

```
app/
  page.tsx                    landing
  (auth)/signin, signup       auth pages (shared components/auth-form.tsx)
  dashboard/                  client-guarded app
    page.tsx                  monitors list
    monitors/[id]/page.tsx    monitor detail
    regions/page.tsx          regions
components/
  ui/                         shadcn components (generated: `bunx shadcn add <name>`)
  uptime-bar.tsx, response-chart.tsx, status.tsx, add-monitor-dialog.tsx, …
lib/
  api.ts      typed fetch client for apps/api
  data.ts     the data layer the UI uses (real / hybrid / mock)
  mock.ts     tick simulator + full mock backend
  stats.ts    uptime %, avg/p95, buckets, chart series
  session.ts  token + known-website storage
```

## Theme

Dark by default with a light/system toggle (`next-themes`). Status colors are `--up`, `--down`, `--unknown` in `app/globals.css`, and status is always shown with an icon or label too, never by color alone. Region lines use `--chart-1..3`, a palette checked for color-blind readability.
