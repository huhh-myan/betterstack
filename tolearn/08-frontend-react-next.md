# 08: Frontend: React and Next.js

You paused the backend to start the frontend (P93), and the frontend on `feature/web-frontend` / `feature/ai-changed` was written by AI. **For interviews you must be able to explain it.** Read `apps/web/README.md` (screenshots + diagrams), then this file, then the code files it names.

## 1. React's mental model

**Problem it solves:** keeping the screen in sync with changing data without manually editing the DOM.

- **UI = f(state).** You describe what the UI looks like for the current state; React works out the DOM changes.
- **Components** are functions that return JSX. **Props** come from the parent (read-only); **state** is owned by the component (`useState`).
- **Re-render** happens when state or props change (or the parent re-renders). Rendering must be **pure**: no side effects while computing JSX.
- **Reconciliation:** React diffs the new tree against the old one. **Keys** in lists tell it which item is which (`key={monitor.id}`, never the array index for reorderable lists).

## 2. Hooks you must know

| Hook | For | Pitfall |
|---|---|---|
| `useState` | local state | updates are async-ish; use the function form `setX(x => x + 1)` when based on the old value |
| `useEffect` | syncing with outside systems (fetching, subscriptions, timers) | missing dependencies → stale values; no cleanup → leaks. **Not for computing derived data.** |
| `useMemo` / `useCallback` | caching expensive results / stable function identity | premature use; they're optimisations, not correctness |
| `useRef` | a mutable box that doesn't trigger renders; DOM refs | reading/writing during render |
| `useContext` | passing values deep without props (your `SessionProvider`) | every consumer re-renders when the value changes |
| `useSyncExternalStore` | subscribing to an external store (your `useSession` reads localStorage) | – |

**Rules of hooks:** call them at the top level of components or custom hooks, never in conditions or loops (React tracks them by call order).

**Custom hooks** package logic: your `useQuery` (fetch on mount, refresh every 60 s, `reload`). In production you'd use **TanStack Query** or **SWR** (caching, deduping, retries).

<details><summary>Why does a `useEffect` that sets state with no dependency array cause an infinite loop?</summary>

An effect with no deps runs after every render; setting state causes a render; that runs the effect again, and so on. Give it the right dependencies (or `[]` for "on mount").
</details>

## 3. Next.js (App Router)

| Concept | Meaning | In your app |
|---|---|---|
| **File-based routing** | `app/dashboard/page.tsx` → `/dashboard`; `[id]` = dynamic segment; `(auth)` = a route group, not in the URL | all pages |
| **Layouts** | wrap child routes and persist across navigation | `app/dashboard/layout.tsx` = header + auth guard |
| **Server Components** (default) | render on the server, no JS shipped, can read data directly | landing page |
| **Client Components** (`"use client"`) | run in the browser: state, effects, event handlers, localStorage | dashboard pages (token is in localStorage) |
| **Rendering modes** | static (build time), dynamic (per request), client-side | `○` static and `ƒ` dynamic in your build output |
| **Rewrites** | proxy a path to another server | `/api/*` → Express, so no CORS |
| **Hydration** | the browser attaches React to server HTML; mismatches = errors | `suppressHydrationWarning` on `<html>` for next-themes |

**Why the dashboard is client-rendered:** the token is in localStorage, which only the browser can read, so auth checks happen client-side. With an httpOnly cookie, the server could check auth (in a Server Component or `proxy.ts`, which is `middleware.ts` in older Next versions) and render data before sending HTML.

## 4. Styling: Tailwind and shadcn/ui

- **Tailwind:** utility classes (`flex gap-2 text-sm`) instead of writing CSS files; design tokens via CSS variables (`--up`, `--down` in `globals.css`).
- **shadcn/ui:** not a library you install, but **components copied into your repo** (`components/ui/*`) that you own and edit. Yours use **Base UI** primitives (P95, P96), so tutorials using Radix's `asChild` don't apply; Base UI uses a `render` prop.
- **Accessibility basics** used in the app: labels tied to inputs, `aria-invalid`, focus rings, status shown by icon + text (not colour alone), keyboard-reachable tooltips.

## 5. Frontend data and auth flow (explain this end to end)

1. Sign in: form → `lib/data.ts` → `POST /api/signin` → Next rewrites to Express → token + user.
2. The session is saved in localStorage; `useSession` re-renders subscribers.
3. `/dashboard/*` layout: no session → redirect to `/signin?next=...`.
4. Pages call `lib/data.ts` → `lib/api.ts` adds `Authorization: Bearer`.
5. A 401 from any call → `setSession(null)` → back to signin.
6. Stats (uptime %, p95, buckets) are computed in `lib/stats.ts` from ticks.

## 6. Performance basics

- Ship less JS (Server Components, code splitting, `next/dynamic`).
- Avoid unnecessary re-renders (state close to where it's used; memoise expensive lists).
- Images: `next/image`; fonts: `next/font` (your local Geist fonts).
- Core Web Vitals: **LCP** (largest paint), **INP** (responsiveness), **CLS** (layout shift).

## Recall questions

<details><summary>Why must list items have stable keys?</summary>

React matches old and new children by key. Unstable keys (like the index when items reorder) make it reuse the wrong component instances, causing wrong state and extra DOM work.
</details>

<details><summary>Server Component or Client Component for a page that reads localStorage? Why?</summary>

Client: localStorage exists only in the browser. Server Components run on the server and can't access it (or use state or effects).
</details>

<details><summary>Your frontend calls `/api/signin`, not `http://localhost:3000/signin`. Why?</summary>

Same origin: the browser only allows cross-origin calls if the server sends CORS headers, and the Express API doesn't. Next.js rewrites `/api/*` to the API server-side, so the browser never makes a cross-origin request.
</details>

<details><summary>What is a hydration mismatch, and why did the theme code need `suppressHydrationWarning`?</summary>

The server-rendered HTML differs from what React renders on the client's first pass. next-themes sets the theme class on `<html>` before React hydrates (to avoid a flash), so the attribute differs from the server's; the flag tells React that difference is expected.
</details>

## Likely interview questions

1. What's the virtual DOM / reconciliation?
2. `useEffect` lifecycle and cleanup; common mistakes.
3. How do you manage server data in React? (TanStack Query/SWR vs `useEffect` fetch.)
4. Server vs Client Components in Next.js.
5. How do you protect routes in a Next.js app?
6. Where would you store an auth token, and why?

## Resources

- react.dev (official docs: "Thinking in React", "You Might Not Need an Effect"): https://react.dev/learn
- Next.js docs (App Router): https://nextjs.org/docs
- Your installed Next docs: `node_modules/next/dist/docs/` (matches your version exactly)
- web.dev Core Web Vitals: https://web.dev/articles/vitals
