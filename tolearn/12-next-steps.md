# 12: Next steps: project, resume, and your open To-dos

## 1. Make the project interview-proof (in this order)

| # | Task | Why it pays off in interviews | Effort |
|---|---|---|---|
| 1 | **Understand every file on `feature/ai-changed`.** Explain each to yourself; note anything you can't explain and ask. | You'll be asked about code with your name on it. | 2–3 days |
| 2 | **Re-implement 3 fixes yourself on a branch from `main`:** ack after insert (worker), password hashing + JWT secret from env (API), Zod validation on one route. Compare with `feature/ai-changed`. | Turns "AI fixed it" into "I fixed it and understood the alternatives". | 2 days |
| 3 | **Deploy it** (10 → section 6) and put the live URL at the top of the README. | Recruiters click links; few candidates have a live backend with workers. | 1 day |
| 4 | **Add alerting:** email or a Discord/Slack webhook when a site is Down in ≥2 regions, once, plus a recovery message. | The core feature of the product, and a great design discussion (state machine, dedupe). | 2–3 days |
| 5 | **Add SSRF protection in the worker** (block private IPs). | Shows security awareness; rarely seen in junior projects. | half a day |
| 6 | **docker-compose.yaml** for Postgres + Redis + API + pusher + worker. | One-command setup; shows DevOps basics. | half a day |
| 7 | **CI on GitHub Actions:** type-check + `bun test` with Postgres/Redis service containers. | "Every PR is tested" is a strong signal. | half a day |
| 8 | **Rate limiting on signin** (Redis, 429). | Common interview follow-up; small to build. | half a day |
| 9 | Fix the broken shared ESLint config (`@babel/preset-typescript` missing; TS files aren't linted). | Hygiene; finishes a loose end. | 1 hour |

## 2. Resume bullets (adapt the numbers once deployed)

Strong bullets use **action + what + how + result**:

- Built **bstack**, a multi-region uptime monitor (TypeScript, Express, Next.js, PostgreSQL, Redis Streams), with workers per region coordinated through **consumer groups**.
- Designed **at-least-once job processing**: ack after persisting results, crash recovery from the pending list, and reclaiming stale jobs with `XAUTOCLAIM`.
- Secured the API with **argon2id password hashing, JWT auth, Zod validation and centralised error handling**; fixed an auth bypass found through my own API tests.
- Wrote **32 integration and unit tests** (Bun) against an isolated test database; built a dashboard with per-region uptime and latency charts.

Rules:
- One page.
- Projects above education if you have no work experience.
- GitHub and live demo links.
- No skill you can't discuss for 5 minutes.

## 3. GitHub hygiene (recruiters look)

- **Pin** the repo; the README top shows a one-line description, the live link, a screenshot and the architecture diagram (already in `README.md`).
- **Merge** the work to `main` when you're ready, so the default branch shows the finished project, not the starter.
- Clean commit history on `main` (your commits are descriptive; keep that up).
- Remove stray files (`apps/next-web` if unused, the Turborepo starter leftovers).

## 4. Your open To-dos from the logs (still worth doing)

| From | Item | Do it? |
|---|---|---|
| P39 | Restructure `packages/typescript-config/base.json` (Bun defaults in base, browser configs override) | Yes, before adding more packages |
| P11 | Bun catalogs for shared dependency versions | Nice-to-have |
| P88 | Learn to write types for promises | Yes (07 covers it; practise on the worker) |
| P85 | Learn to read long error messages | Yes: keep adding to your Failure signatures |
| P62 | Redis Streams hands-on lab | Mostly done through P71–P89; skip unless curious |
| P99 | PATH on Windows and Linux | Yes, quick and comes up in DevOps questions |
| P19 | Express types deep dive | After interviews |
| P94 | Decide `apps/web` vs `apps/next-web` | `apps/web` has the finished frontend; remove `next-web` or say why it's kept |
| Frontend Goal | Fill in what you know about React/Next | Yes: do it with 08 as a checklist |
| README_details §12 | JWT security review; bits/bytes/hex/base64url; asymmetric JWT later | Base64url and hex: 30 min; asymmetric JWT: after interviews |

## 5. Interview prep routine (from now until offers)

**Daily:**
- 2 DSA problems (11);
- 10 recall questions mixed across files 03–10 (only 🟡/❌ ones after the first pass);
- 1 job application batch (5–10 tailored applications).

**Twice a week:**
- one mock interview: Pramp, a friend, or record yourself;
- alternate coding, project deep-dive and system design.

**After every real interview:** write down every question you got and how you answered. Add the ones you fumbled to the relevant file here with a better answer.

## 6. Behavioural questions (have a story ready for each)

| Question | Your story |
|---|---|
| A bug you found and fixed | Auth bypass via missing field (P54) |
| Something you learned quickly | Redis Streams consumer groups (P71–P82) |
| A time you were wrong | P60/P71/P86 misconceptions you corrected, e.g. "ack stops re-delivery" (it's the read) |
| A trade-off you made | JWT in localStorage (simple, XSS risk) vs httpOnly cookie |
| How you handle being stuck | The learning log: write the symptom, check the real artifact, form a hypothesis, test it |
| Why this role | Tie it to what you enjoyed: backend reliability, queues, debugging |

Use **STAR**: Situation, Task, Action, Result, and say what you'd do differently.
