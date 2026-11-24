# Learning log: Bun project setup for betteruptime

## 1. Goal

- **Already know:** not stated yet. To fill in.
- **Want to be able to do:** build the betteruptime project (an uptime monitor) on Bun, writing every line myself. First step: understand what `bun init` scaffolds and pick the right template.
- **Milestone (2026-11-08): base setup done.** Turborepo + Bun workspaces. `apps/api` (Express 5 on Bun) imports `@repo/db-prisma/db` (Prisma 8 RC, Postgres 18 in Docker with a named volume). The shared tsconfig was restructured (P39). A test route writes a user and it works. **Next phase: build the actual app.**
- **⭐ Important: revise these first** (topics I've marked as important; the full entries are under Concepts):
  - **P59: Declaration merging.** Adding fields (e.g. `userId`) to a library's types without editing them. Interfaces with the same name merge, Express ships an empty `Express.Request` for exactly this, and `declare global` is needed inside a module file (`export {}`). It extends the *type*, not the runtime object.
- **Look back, transferable lessons from setup:**
  - "Latest" always moves. Pin versions: Docker tags, Prisma RCs, TypeScript (P21, P28, P36).
  - In a workspace, nothing is visible until it's declared: packages, tsconfig bases (P7, P35).
  - Defaults are runtime-specific: one shared config can't fit Node, Bun and the browser (P8, P39).
  - Check the real artifact (`.d.ts`, `--help`, `\d`, `tsc --showConfig`) before trusting memory, mine or the tutor's (P9, P35, P38 corrections).

**Problem numbering (P1, P2, …)**, used in chat and in this log:
- P1: Bun's `.gitignore` has `_.log` instead of `*.log`, so log files aren't ignored.
- P2: `git check-ignore -v` (a tool for checking which rule ignores a path).
- P3: TypeScript version mismatch, api peerDependency vs web/root.
- P4: one lockfile at the root, thanks to workspaces (no action needed).
- P5: the Blank template is `"private": true` (confirmed).
- P6: the repo is nested at `betteruptime/betteruptime/`.
- P7: api's tsconfig `extends: "@repo/typescript-config/base.json"` won't resolve.
- P8: which compilerOptions a Bun API needs on top of base.json. (Done: my tsconfig now overrides lib/module/moduleResolution and adds types/noEmit.)
- P9: do Express `req`/`res` need type annotations? (contextual typing)
- P10: why `typescript` is a peerDependency, and why there's no outDir/compile step on Bun.
- P11: Bun catalogs (also on the To-do list).
- P12: review of my tsconfig/package.json edits (two wrong comments, one dependency in the wrong section).
- P13: index.ts never starts the server. (I'll handle it myself.)
- P14–P17: Node vs Bun follow-ups (transpiler, no type-check, Node differences, outDir vs bundling). Parked in To do.
- P18: learn tsconfig setup properly. Parked in To do.
- P20: what each flag in `bunx prisma@latest orm init --yes --target postgres --authoring psl --write-env` means, and what happens without them.
- P21: `prisma@latest` is currently **8.0.0-rc.33**, a release candidate of the new Prisma 8.
- P22: `orm init` modifies tsconfig.json and package.json, which I just hand-tuned.
- P23: where Prisma should live in the monorepo (apps/api vs a shared package). **Decided: a shared package at `packages/db-prisma`.**
- P24: why Prisma installs `@types/node` when Bun "already has types".
- P25: should `packages/db-prisma` use the **Library** template in `bun init`?
- P26: `process.env['DATABASE_URL']!` vs `process.env.DATABASE_URL` in prisma.config.ts.
- P27: review of my `docker run postgres …` command for local Postgres.
- P28: why the postgres 18 image mounts at `/var/lib/postgresql` (17: `/var/lib/postgresql/data`), how to tell which version I have, and whether to write `latest`.
- P29: how to update a local Docker image (and what that does and doesn't change).
- P30: anatomy of a Postgres/DB connection URL vs a web URL.
- P31: what `bunx prisma db init` did, and the "agent skills are out of date" line.
- P32: psql meta-commands for listing DBs, connecting, and inspecting tables and columns.
- P33: schema changed (Post → Page) but the old `Post` table is still in the DB. Drop it manually?
- P34: db-prisma tsconfig. Extend the shared config? Remove outDir?
- P35: db-prisma `exports` points at `*.tsx`, but the Prisma files are `.ts`.
- P36: version drift in db-prisma (`prisma` rc.33 vs `@prisma/orm-postgres` rc.23; `@types/node` ^26.6.6 vs 26.4.1 elsewhere).
- P37: does `exports` need separate entries for types (`.d.ts`) and code, like npm packages?
- P38: TS2742 in db.ts: "The inferred type of 'db' cannot be named without a reference to 'NoCollectionClasses'… not portable."
- P39: should base.json use `ESNext` instead of `NodeNext` for module, moduleResolution and target?
- P40: "I didn't add `?` to `pages Page[]`, so a user with no pages can't exist?"
- P41: do I need `await db.close()`? Isn't the Prisma client a singleton already?
- P42: `globalThis` singleton for db (and other things that need one instance). Parked in To do.
- P43: Express `Router`, and how a backend is usually structured. Now or later?
- P45: how to generate a UUID id in a Prisma 8 contract model.
- P59: declaration merging. How do I add `userId` to Express's `Request` type so the middleware can pass it to routes? ("Extend the Request object, right?")
- P58: what `jwtVerify` returns (`payload`, `protectedHeader`), and do I pass `subject` to it because I used `setSubject`?
- P57: signing a JWT with `jose`. What are `setProtectedHeader`, `alg`, `setIssuer`, `setAudience`, and the `TextEncoder` secret? (jsonwebtoken didn't need them.)
- P56: where should `middleware.ts` go? Under `apps/api`? (Revisits the P43 structure.)
- P55: "what is runtime.md?" Can I log a plan and then run it with `db.query(plan)`? Review of my first query-logger middleware in db.ts.
- P54: test 2: signin with **no password field** logged in as the user (auth bypass). Wrong password / unknown user → 200 with null.
- P53: `req.body` was undefined. Added `express.json()` + `express.urlencoded({ extended: true })`. Why?
- P52: first manual run of the endpoints (Claude called them with curl, and I check the DB).
- P51: manually testing endpoints in Postman is painful. What else is there?
- P50: Zod schema validation for request bodies (parked in To do).
- P49: what about errors *other* than "username taken"?
- P48: what status code for a signup whose username is already taken?
- P47: "I emitted the contract. How do I apply it to the DB?"
- P46: the uptime schema from the video (Website, Region, WebsiteTicks). Why is there a `Region`, and how does it connect to `WebsiteTicks`?
- P44: what an MCP server actually is. Docs MCP for Bun/Prisma/Express without a login. "Is MCP just documentation search?"
- P19: deep dive into how Express's types work internally (generics, template literal types, contextual typing, index signatures). Parked in To do, for after the project is finished.

P3 lockfile: resolved, after reinstall `bun.lock` shows `^7`. P7: resolved, api now declares `@repo/typescript-config` and `apps/api/node_modules/@repo/typescript-config` exists.

## 2. Concepts

### `bun init` templates (Blank / React / Library)
**The problem it solves:** a new project needs the same boilerplate every time (package.json, tsconfig, .gitignore, entry file, Bun type definitions). Without a scaffold you either copy it from an old project or forget a piece, for example `@types/bun`, and the editor then doesn't know about `Bun.*` APIs.

**How it works:** `bun init [dir]` shows an interactive "Select a project template" prompt.
- **Blank:** a minimal TypeScript project. Creates `index.ts`, `tsconfig.json` (or `jsconfig.json` for a JS entry), `.gitignore`, `README.md` and `package.json` (name defaults to the folder name, plus a `typecheck` script). Then runs `bun install`, which adds `@types/bun` and `typescript`. Good for servers, workers and CLIs.
- **React:** a full-stack React app served by Bun itself, with no Vite. Also selected with `--react`. Presets: `--react=tailwind` (adds Tailwind CSS) and `--react=shadcn` (Tailwind plus shadcn/ui). The docs page doesn't list its files. From memory: a `src/` folder with a `Bun.serve` server entry that imports `index.html`, a React entry, an `App` component, a `build.ts`, and dev / build / start scripts (dev runs with hot reload).
- **Library:** the same TypeScript skeleton as Blank, but set up to be *published* as a package rather than run as an app. The docs page doesn't describe it. From memory: the main difference is in `package.json`. Blank is marked private, so it can't be accidentally published to npm, and Library is not. Not yet verified against the source.

**Confirmed from my own apps/api/package.json (Blank template):** `"module": "index.ts"`, `"type": "module"`, `"private": true`, `devDependencies: { "@types/bun": "latest" }`, `peerDependencies: { "typescript": "^5" }`. Blank really is private.

**Flags:** `-y` / `--yes` (accept every default), `-m` / `--minimal` (type definitions only, no app scaffolding), `--react[=tailwind|shadcn]`, `-h`.

**Worked through:** asked what each template is. The docs cover Blank and the React presets, but not Library's contents.

**Gotchas / would have missed:**
- `bun init` writes a `CLAUDE.md` if it detects the Claude CLI, and `.cursor/rules/*.mdc` if it detects Cursor. Turn this off with `BUN_AGENT_RULE_DISABLED=1`, or per tool with `CLAUDE_CODE_AGENT_RULE_DISABLED` / `CURSOR_AGENT_RULE_DISABLED`.
- `bun init` runs `bun install` at the end, so it needs network access the first time.
- The React template is Bun's own full-stack setup (HTML imports plus `Bun.serve`). Vite/Next tutorials don't map onto it one to one.

**Connects to:** `npm init` / `npm create vite@latest`, which do the same job. Bun just merges "init" and "pick a template" into one prompt.

### Nested `.gitignore` files in a monorepo
**The problem it solves:** different parts of a repo produce different junk. A Next app makes `.next/`, a Bun API makes `dist/`. Without per-folder ignore files, the root file has to know about every app's quirks.

**How it works:** Git reads *every* `.gitignore` from the repo root down to the file's folder, and their rules **add up**. Nothing conflicts or overrides unless you write a `!pattern` negation, and the deeper file wins if you do. Rules are relative to the folder the `.gitignore` sits in:
- No slash (`node_modules`, `dist`): matches at **any depth** below that folder.
- Leading slash (`/build`): matches only directly in that folder.
- Trailing slash (`.next/`): matches only directories.

My root file (from create-turbo) uses mostly no-slash patterns, so `node_modules`, `dist`, `.env`, `coverage` and `out` already cover apps/api. That makes most of apps/api/.gitignore redundant, but not harmful.

**Worked through:** saw that bun init wrote apps/api/.gitignore even though turborepo has a root one, and wondered whether that's a problem. Noticed that apps/web (create-next-app) *also* ships its own nested `.gitignore`. The turborepo starter already lives with this pattern.

**Gotchas / would have missed:**
- **(P1)** Bun's generated `.gitignore` contains `_.log` and `report.[0-9]_.[0-9]_...json`. These look like a mangled `*.log`, with the asterisks lost to a Markdown formatting step. As written, they **don't ignore `.log` files**, and the root file only ignores `npm-debug.log*` / `yarn-*.log*`.
- To ask git *which* file and line is ignoring a path: `git check-ignore -v <path>`.
- `peerDependencies: typescript ^5` in apps/api doesn't match the root's `typescript 7.0.2`. That's an unmet-peer warning waiting to happen.

  - *Re-explained (I didn't get it the first time):* in `.gitignore`, `*` is the wildcard meaning "any characters". `*.log` matches `server.log`, `error.log`, and so on. `_` is not a wildcard, just an underscore, so `_.log` matches only a file literally named `_.log`. The asterisks were probably swallowed by Markdown formatting, where `*…*` means italics. It only matters if the API ever writes `.log` files to disk.

**Connects to:** CSS cascade and scoped config files (`.eslintrc` / `tsconfig` per folder): more specific files add to, or override, general ones.

### P3: one tool, many package.json files (TypeScript version drift)
**The problem it solves:** every workspace package lists its own `typescript` version, typed by hand. Nothing forces them to agree. They drift, and then the same shared tsconfig behaves differently per package.

**How it works:**
- `^7` means `>=7.0.0 <8.0.0`. That part is right.
- The root `bun.lock` resolves each package's range. If one version satisfies everyone, Bun installs **one copy**. Right now api and web both point to `node_modules/.bun/typescript@7.0.2`. If the ranges can't overlap, Bun's isolated linker gives each package **its own copy**, and nothing crashes at install time.
- What breaks when they differ: each package type-checks with its own `tsc`. A shared `@repo/typescript-config` option that only the newer version knows makes the older one fail with "unknown compiler option". Behaviour changes between versions, like TS 6's `types` default, show up in only one app.
- **Peer vs dev dependency:** `peerDependencies` is how a *library* says "whoever installs me must provide X". api is an app and nobody installs it, so the Blank template's peerDependency is a library-ish choice. Apps normally list build tools under `devDependencies`.
- Ways monorepos keep one version: declare it once at the root (the root already has `typescript 7.0.2`), or use **Bun catalogs**. A catalog is a version map in the root package.json's `workspaces` section, and each package writes `"catalog:"` instead of a version. Lint tools like syncpack check for drift.
- The `bun.lock` entry for apps/api still says `^5`, so `bun install` hasn't been rerun since I edited it to `^7`.

**Worked through:** changed `^5` → `^7` (correct for the range), then asked what happens when web's and api's hand-written versions disagree.

**Gotchas / would have missed:** editing package.json does nothing until you rerun `bun install`. The lockfile is what's actually installed.

**Connects to:** single source of truth / DRY. The same reason `@repo/typescript-config` exists for tsconfig.

### P7: `extends` resolves like an import
**The problem it solves:** sharing one base tsconfig across apps without copy-pasting it.

**How it works:** `"extends": "@repo/typescript-config/base.json"` is looked up through `node_modules`, exactly like `import`. With Bun's isolated installs, a workspace package sees **only the packages it declares**. apps/web lists `@repo/typescript-config` in its devDependencies, so `apps/web/node_modules/@repo/typescript-config` exists. apps/api doesn't declare it, so there's nothing to find. Expect a "file not found" error when type-checking.

**Gotchas:** being in the same repo is not enough. In a workspace you have to *declare* internal packages too.

**Connects to:** how `@repo/ui` reaches apps/web.

### P8: tsconfig for a Bun API, extending the turborepo base
**The problem it solves:** base.json was written for generic, Node-style **packages that emit files**. api is a **Bun app that never emits**: Bun runs `.ts` directly, so tsc is only a type-checker here. Options that fit one are wrong for the other.

**What base.json already gives me (no need to repeat):** `strict`, `skipLibCheck`, `noUncheckedIndexedAccess`, `moduleDetection: force`, `isolatedModules`, `esModuleInterop` (lets `import express from "express"` work with a CommonJS package), `resolveJsonModule`.

**Base settings that are wrong for a Bun API (override them):**
- `module` / `moduleResolution: NodeNext`: Node's strict ESM rules. Relative imports need explicit `.js` extensions, so tsc errors on `./routes` even though Bun runs it fine. Bun resolves like a bundler, so override with `module: Preserve` + `moduleResolution: bundler`.
- `lib` includes `DOM`: types for `window` / `document`, which don't exist on a server. Your editor would happily autocomplete code that crashes. `ESNext` is enough, and `@types/bun` supplies fetch/Request/Response.
- `declaration` / `declarationMap`: make `.d.ts` files for a package others import. An app has no consumers, and it's moot with `noEmit`.

**Needed additions:**
- `types: ["bun"]`: **required on TS 6+/7**. The default changed from "every @types package" to `[]`, so without it `Bun`, `process` and similar globals are unknown.
- `noEmit: true`: without it, running `tsc` writes `.js` files next to your sources, because there's no `outDir`.

**Optional (nice, not needed):** `target: ESNext` (Bun runs the latest syntax, though with noEmit this barely matters). `verbatimModuleSyntax` (forces `import type` for type-only imports; a stronger version of isolatedModules). `allowImportingTsExtensions` (only if you want to write `./db.ts`; requires noEmit). `noFallthroughCasesInSwitch`. `noImplicitOverride` (only matters with classes).

**Not needed:**
- `jsx`: no JSX in an API.
- `allowJs`: no `.js` source files.
- The three `false` flags: they're already the defaults, so setting them is a no-op.

**Gotchas:** `bun check` behaves like TS 7 whatever version is installed.

**Connects to:** `nextjs.json` in packages/typescript-config already does exactly this pattern for Next: extend base, override module/resolution, add noEmit.

**Sources:** https://bun.com/docs/typescript-6 · https://blog.openreplay.com/whats-new-typescript-6-0/ · https://www.typescriptlang.org/tsconfig/

### P9: Express `req`/`res` types, contextual typing
**The problem it solves:** annotating every callback parameter by hand is noise, and it can be *less* precise than what TypeScript works out itself.

**How it works:**
- `express` itself is plain JS. Its types come from `@types/express` (DefinitelyTyped), which TS finds **automatically when you `import "express"`**. The `types: ["bun"]` option only limits *global* type packages. It doesn't block types for modules you import.
- **Contextual typing:** when you pass an inline arrow function to `app.get(...)`, TS already knows the parameter's expected function type (`RequestHandler`, which takes `req`, `res`, `next`). It types `req` and `res` from that context, so no annotation is needed. It's the same thing as `window.onmousedown = function (e) {…}`, where `e` becomes `MouseEvent`.
- You **do** need annotations when the handler is written **away from** the call, for example `const getHome = (req, res) => …` in a controllers file. There's no context there, so the parameters are implicitly `any`, which is an error under `strict`. Annotate with `Request`/`Response`, or type the whole function as `RequestHandler`.
- Nothing about this is Bun-specific. Bun doesn't take part in type checking at all.

**Gotcha (the annotation can make things worse):** in `@types/express-serve-static-core@5.1.3` (what's installed), `app.get` is generic over the path string: `P = RouteParameters<Route>`. For `app.get("/monitors/:id", (req, res) => …)`, the inferred `req.params` is `{ id: string }`. Annotating `req: Request` resets it to `Request`'s default, `ParamsDictionary` (any string key). Inline handlers are better left unannotated.
- **Correction (2026-11-08):** I first wrote that this makes `req.params.id` `string | undefined`. The real `ParamsDictionary` is `{ [key: string]: string | string[]; [key: number]: string }`, so the annotated version is **`string | string[] | undefined`**. The `string[]` is for wildcard (`*name`) params in Express 5. The `undefined` comes from `noUncheckedIndexedAccess`.

**Step by step, why the annotation changes the type** (asked to re-explain):
1. `Request` is a **generic** type: `Request<P = ParamsDictionary, ResBody, ReqBody, …>`. `P` is the shape of `req.params`. If you write bare `Request`, you get the default `P`: ParamsDictionary, an "any key" dictionary.
2. `app.get` is **also generic**, over the path string (`Route`). Calling `app.get("/monitors/:id", …)` captures the literal type `"/monitors/:id"`, and `RouteParameters<"/monitors/:id">` computes `{ id: string }` (template-literal types parse out each `:name`, lines 103–122).
3. The handler is expected to be `RequestHandler<P>`, so an **unannotated** inline `req` is contextually typed as `Request<{ id: string }>`, and `req.params.id: string`.
4. An explicit annotation **beats** contextual typing (same as `uiEvent: any` in the handbook). `req: Request` means `Request<ParamsDictionary>`. TS even infers `P = ParamsDictionary` for the whole call from it, so the route-string knowledge is thrown away.
5. Reading `.id` from a type that has only an **index signature** (`[key: string]: …`): TS can't know the key exists. With `noUncheckedIndexedAccess` (from base.json), every such read adds `| undefined`. With a known property (`{ id: string }`), there's nothing to add.
- Analogy: `const a: { id: string }` vs `const b: Record<string, string>`. `a.id` must exist. `b.id` might not.

**Worked through:** I'd been importing `Request`/`Response` every time in Node and asked how a default type could get assigned. Answer: it isn't a default. The type flows *in* from `app.get`'s declared parameter type.
- My restatement: "app.get comes from express, so the req/res inside are automatically assigned types from express." Graded **mostly right**, with two precisions. (a) The types come from `@types/express`, not from express itself, which is plain JS. (b) The automatic part only works when the function is written **inline** as the argument. A handler defined elsewhere gets no context.

**Connects to:** Node + Express in the past. The same rule applied there; I probably needed annotations because my handlers lived in separate controller files.

**Sources:** https://www.typescriptlang.org/docs/handbook/type-inference.html#contextual-typing · local `node_modules/.bun/@types+express-serve-static-core@5.1.3/.../index.d.ts` lines 55 (RequestHandler, `P = ParamsDictionary`) and 103–131 (RouteParameters, IRouterMatcher) · https://dev.to/shiftyp/my-type-of-coding-express-route-param-types-3ll9

### P10: why no outDir, and why `typescript` is a peerDependency
**The problem it solves:** knowing which packages a running server actually needs, and which are only build/check tools.

**How it works:**
- **My Node memory is correct.** `typescript` sat in devDependencies, `tsc` compiled to `outDir` (dist/), and `node dist/index.js` ran plain JS. TS wasn't needed at runtime.
- **Bun removes the compile step.** Bun has its **own built-in transpiler**. It strips types and runs `.ts` directly (`bun index.ts`) and **never uses the `typescript` npm package**. It also **doesn't type-check**. So no outDir is needed for running. (For production bundling there's `bun build --outdir`, which is Bun's bundler, not tsc.)
- So on Bun, `typescript` is needed only by the editor and `tsc --noEmit` / CI type checking. That's the definition of a devDependency, same as in Node.
- Why `bun init` writes `peerDependencies`: it's the template's convention, shared with the Library template, roughly "use whatever TypeScript the surrounding project has". Bun (like npm 7+) **auto-installs peer dependencies**, which is why `apps/api/node_modules/typescript` exists anyway. I found no stated reason in Bun's docs. For an app, moving it to devDependencies, or relying on the root's copy, is the conventional choice.
- Also: root `engines.node >=24`. Modern Node can strip types natively too, so "run .ts directly" is no longer Bun-only.

**Sources:** https://bun.com/docs/runtime/typescript ("Bun does not typecheck the files… use tsc") · https://flaviocopes.com/what-happens-when-bun-runs-typescript/ · https://dev.to/gabrielanhaia/buns-typescript-support-in-2026-what-works-what-still-needs-tsc-9d4

### P11: Bun catalogs
**The problem it solves:** P3, the same dependency version typed by hand in many package.json files and drifting apart.

**How it works:** in the **root** package.json, the `workspaces` field becomes an object with a `packages` list plus `catalog` (the default version map) and optionally `catalogs` (named groups, e.g. `testing`). Each workspace then writes `"catalog:"` (or `"catalog:<name>"`) as the version. It works in dependencies, devDependencies, optionalDependencies, peerDependencies and root `overrides`. `bun install` resolves them, and `bun.lock` records both the catalog and the resolutions. `bun publish` / `bun pm pack` swap `catalog:` for real ranges. `bun add --catalog` adds a dependency through the catalog.

**Gotcha:** a `catalog:` reference to a package not in the catalog is an install error.

**Sources:** https://bun.com/docs/pm/catalogs

### P12: review of my edits
- `apps/api/tsconfig.json`: the overrides are correct (lib, module Preserve, moduleResolution bundler, types, noEmit, plus optional allowImportingTsExtensions / verbatimModuleSyntax).
- The comment saying `noFallthroughCasesInSwitch` and `noImplicitOverride` are "ALREADY IN base.json" is **wrong**. base.json has only strict, skipLibCheck and noUncheckedIndexedAccess from that group. The other two are currently off.
- The `verbatimModuleSyntax` comment "allows use of types in import statements" is imprecise. It **requires** type-only imports to be marked `import type`, and keeps all other imports exactly as written. (index.ts already complies.)
- `@repo/typescript-config` sits in `dependencies`. It's only used at type-check time (web keeps it in `devDependencies`), so it belongs in devDependencies.

### P20: `prisma orm init` and its flags
**The problem it solves:** setting up an ORM means a config file, a schema file, a DB URL in `.env`, a generated client and several packages. `init` scaffolds all of it in one go. The flags answer its setup questions up front, so it can run without prompts (CI, scripts, agents).

**How it works (piece by piece):**
- `bunx`: Bun's `npx`. Downloads and runs a package's CLI without adding it to your project first.
- `prisma@latest`: which version to run. `latest` is an npm **dist-tag**, a movable label (see P21).
- `orm init`: the Prisma 8 subcommand. Prisma ≤7 used `prisma init` with `--datasource-provider postgresql`.
- `--yes` (`-y`, global): "accept prompt defaults without asking". Choices that have **no default** (target, authoring) still have to be passed, or it fails with `CLI.INIT_MISSING_FLAGS`. It doesn't replace `--confirm` for consent prompts.
- `--target postgres`: which database. Prisma 8 accepts only `postgres` or `mongodb`. `mysql` etc. fail with `CLI.INIT_INVALID_FLAG_VALUE`.
- `--authoring psl`: how you **write** the schema. `psl` means Prisma Schema Language (a `.prisma` file with `model User { … }`, the format most tutorials use). `typescript` means defining it in TS code.
- `--write-env`: also creates `.env` by copying `.env.example` (gitignored). Without it you get only `.env.example` and make `.env` yourself.
- **No flags at all:** a guided interactive setup asks you the choices instead. Same result, just prompted.

**Generated (postgres + psl, per the docs):** `prisma.config.ts`, `src/prisma/contract.prisma` (first line `// use prisma-8` must stay, because the emitter only reads files that start with it), the emitted `contract.json`, `src/prisma/db.ts` (runtime client), `.env.example`, `prisma-8.md` (quick reference). It **modifies** `tsconfig.json` and `package.json`. Installs the target package plus `dotenv` (dependencies), and `prisma@latest`, `@types/node`, `@prisma/cli-engine` (devDependencies).

**Other flags worth knowing:** `--skip-install` (scaffold only, no install or emit), `--schema-path`, `--probe-db` (test the `DATABASE_URL` connection once), `--json`.

**Sources:** https://www.prisma.io/docs/cli/orm-init · `bunx prisma@latest orm init --help` and `prisma --help` (8.0.0-rc.33, run in a scratch folder) · v7-style `prisma init`: https://www.prisma.io/docs/orm/reference/prisma-cli-reference

### P21: `@latest` is a Prisma 8 release candidate
**The problem it solves:** knowing which version you actually get when you write `@latest`.

**How it works:** npm dist-tags on 2026-11-08: `latest` = **8.0.0-rc.33**, `prev` = **7.10.1**. So `@latest` gives a pre-release of a major version with a new model: a "contract" (`contract.prisma` → `contract.json`) instead of the classic `schema.prisma` + generated `PrismaClient`.

**Gotchas:** most course material and tutorials show the Prisma 6/7 workflow (`prisma init`, `schema.prisma`, `prisma migrate dev`, `new PrismaClient()`), and that won't line up 1:1 with Prisma 8. `@latest` is also unpinned: rerun it next month and you may get a different version. Pinning (`prisma@7.10.1` or a specific 8.x) makes it reproducible.

**Sources:** https://registry.npmjs.org/-/package/prisma/dist-tags · `bunx prisma@latest --version` → `8.0.0-rc.33`

### P22: `orm init` edits files I already tuned
**How it works:** per the docs it modifies `tsconfig.json` and `package.json`, and may add `"type": "module"` plus tsconfig changes (the docs warn this can break CommonJS apps). It also adds `@types/node`. With my `types: ["bun"]`, that isn't loaded globally unless I list it.

**How to apply:** commit (or copy) apps/api/tsconfig.json and package.json **before** running it, then diff afterwards to see exactly what it changed.

**Sources:** https://www.prisma.io/docs/cli/orm-init (generated files, CommonJS note)

### P23: where Prisma lives in the monorepo
**The problem it solves:** the DB schema and client are needed by every app that touches the database, not only the API.

**How it works:** `orm init` writes into the **current directory**. Run it in apps/api and Prisma belongs to the API. Run it in a new `packages/…` workspace package and other apps import it like `@repo/ui`.

**Status:** decided. A shared package at `betteruptime/packages/db-prisma`, so api and a future worker can both import the same schema and client.

### P24: why Prisma installs `@types/node`
**The problem it solves:** TypeScript only knows about runtime APIs that a type package describes. The runtime having an API isn't enough.

**How it works:**
- Bun *the runtime* implements the APIs, but the *types* come from the `@types/bun` package (which `bun init` installed). Nothing is typed "by default" without a package.
- `@types/bun@1.4.4` → depends on `bun-types@1.4.4` → which **depends on `@types/node: "*"`**. Its `index.d.ts` starts with `/// <reference types="node" />`. Because Bun implements Node's APIs (`process`, `Buffer`, `node:fs`…), its types are built **on top of** Node's.
- So `types: ["bun"]` already brings in Node's types through that reference. A direct `@types/node` is redundant for a Bun project.
- Why Prisma adds it anyway: its docs just list it, with no reason given. Most likely `orm init` doesn't detect Bun and assumes a Node project, where the generated `prisma.config.ts` / `db.ts` (using `process.env` etc.) would need Node types.

**Gotchas:** two copies of `@types/node` at different versions can cause "duplicate declaration" errors in `.d.ts` files. `skipLibCheck: true` (in base.json) hides most of those. This repo already has `@types/node@26.4.1` (used by web and ui).

**Sources:** local `node_modules/.bun/bun-types@1.4.4/node_modules/bun-types/package.json` (dependencies) and `index.d.ts` (line `/// <reference types="node" />`) · `node_modules/.bun/@types+bun@1.4.4/.../package.json` · https://bun.com/docs/runtime/typescript · https://www.prisma.io/docs/cli/orm-init (dependency list)

### P25: Library template for `packages/db-prisma`?
**The problem it solves:** creating an *internal* workspace package that other apps import.

**How it works / what's known:**
- Library's distinguishing trait (from P5) is being set up to **publish to npm**, i.e. not `"private": true`. db-prisma will never be published.
- What makes an internal package importable in this repo is already shown by `packages/ui/package.json`: a scoped `name` (`@repo/ui`), `"private": true`, and an **`exports`** field pointing straight at source files (`"./*": "./src/*.tsx"`). There's no build step, because consumers compile the source themselves.
- Whatever template I pick, `prisma orm init` then edits package.json/tsconfig again (P22).
- Still unverified: exactly what the Library template writes (open question since P5).

**Worked through:** I compared against `packages/ui`. My words: "exports in package.json, but its tsconfig is also different, it contains outDir and include and exclude options. It also contains private:true, so it's not a library, I get it now."
- **Right:** `exports` is what lets consumers import specific paths. `"private": true` means it's never published, so Library's one distinguishing trait isn't needed. **Decided: Blank.**
- **Missed:** the import name `@repo/ui` comes from the package's **`name`** field, and the consumer must **declare** it (`"@repo/ui": "*"` in web's package.json). That's the same lesson as P7.
- **ui's tsconfig:**
  - `include: ["src"]`: tsc checks only files under src/ (the default is everything in the folder).
  - `exclude: ["node_modules", "dist"]`: removes paths from what `include` matched. node_modules is excluded by default anyway.
  - `outDir: "dist"`: where emitted JS would go. ui's `exports` point at `./src/*.tsx` and its script is `tsc --noEmit`, so in practice nothing is emitted and outDir is a leftover.
  - `strictNullChecks: true`: already part of `strict`, so it's redundant if strict is on.
- **Gotcha for db-prisma:** `prisma orm init` puts `prisma.config.ts` at the package **root** and code in `src/prisma/`. Copying ui's `include: ["src"]` would leave `prisma.config.ts` out of type checking.

**Status:** decided. Blank template, plus a scoped `name`, `private: true` and `exports`.

**Sources:** local `betteruptime/packages/ui/package.json` · Turborepo internal packages: local `node_modules/.bun/turbo@2.11.10/node_modules/turbo/docs/` (core-concepts) · https://bun.com/docs/runtime/templating/init · package `exports`: https://nodejs.org/api/packages.html#exports

**Sources:** https://www.prisma.io/docs/cli/orm-init ("adding files to an existing project") · Turborepo internal packages: local `node_modules/.bun/turbo@2.11.10/node_modules/turbo/docs/` (core-concepts/internal-packages)

### P26: `process.env['DATABASE_URL']!` vs `process.env.DATABASE_URL`
**The problem it solves:** the generated config has to compile under *any* user's tsconfig strictness, and it has to read a value that might not exist.

**How it works:**
- **At runtime they're identical.** `obj.key` and `obj['key']` read the same property. Bracket form is only *required* when the key isn't a valid identifier or lives in a variable. My guess ("both are object access") was right.
- **At the type level they can differ.** `process.env` is typed with an **index signature** (`[key: string]: string | undefined`), so both forms give `string | undefined`. But the tsconfig flag **`noPropertyAccessFromIndexSignature`**, when on, makes the *dot* form an **error** for index-signature keys. It forces brackets, as a visual hint that "this key may not exist". Prisma's generator writes brackets so the file compiles even in projects that turn that flag on. It's the same flag that was in bun init's commented-out "stricter flags" list (set to `false`).
- **The `!` (non-null assertion)** tells TS "treat this as `string`, not `string | undefined`". It's **type-only**: it removes the compile error but adds **no runtime check**. If `DATABASE_URL` is missing, `undefined` is passed to Prisma, and the failure appears later at connect time with a less obvious message.
- **`import 'dotenv/config'`** loads `.env` into `process.env` before the config reads it. Bun auto-loads `.env` itself, but the Prisma CLI may run under Node (bunx runs the package's Node shebang unless `--bun`), so dotenv makes it work either way. dotenv looks for `.env` in the **current working directory**, so running the CLI from the repo root vs from packages/db-prisma changes which `.env` it finds.

**Sources:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors · https://www.typescriptlang.org/tsconfig/#noPropertyAccessFromIndexSignature · https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#non-null-assertion-operator-postfix- · https://github.com/motdotla/dotenv#readme · https://bun.com/docs/runtime/env

### P27: `docker run` for a local Postgres
**The problem it solves:** a real Postgres for development without installing it on Windows. The container is disposable, and its config lives in one command.

**My command:** `docker run postgres -e POSTGRES_PASSWORD=password POSTGRES_DB=bstack -p 5432:5432 -n rocky_road`

**Review:**
1. **Order matters.** The shape is `docker run [OPTIONS] IMAGE [COMMAND] [ARGS]`. Everything **after** the image name goes to the *container's* program (postgres), not to Docker. So `-e`, `-p` and `-n` are all handed to postgres, which rejects them. Options go **before** `postgres`.
2. **`-e` sets one variable.** `POSTGRES_DB=bstack` without its own `-e` is just a stray argument.
3. **`-n` isn't Docker's name flag.** The container name flag is `--name`.
4. **No `-d` (detached):** the container runs in the foreground and holds the terminal. Ctrl+C stops it. Fine, if that's intended.

**Gotchas / would have missed:**
- **No volume means no durable data.** Data survives `docker stop`/`start` but is **lost on `docker rm`**. Use a named volume (`-v name:/path`). The **postgres 18+ image moved its data dir**: mount at `/var/lib/postgresql` (not the old `/var/lib/postgresql/data`). Check the image docs for your version.
- **Unpinned image:** `postgres` means `postgres:latest`, which jumps major versions. A new major can't read the old major's data volume. Pin the major (`postgres:<major>`).
- **`-p 5432:5432` publishes on all network interfaces.** With password `password`, prefer binding to localhost only (`127.0.0.1:5432:5432`).
- **Port clash:** if Postgres is also installed natively on Windows, 5432 is already taken. Map a different host port (`5433:5432`) and use that in the URL.
- **The `.env` must match:** `DATABASE_URL` = `postgresql://<user>:<password>@localhost:<host port>/<db>`. The default user is `postgres`. User, password, port and db name all have to match the `-e` / `-p` values.

**My rewrite:** `docker run -e POSTGRES_PASSWORD=password -e POSTGRES_DB=bstack -p 5432:5432 --name rocky_road postgres`. **Correct.** Options come before the image, there's one `-e` per variable, and `--name` is used. Still open, by choice (not errors): no `-d`, no volume, unpinned `postgres`, port published on all network interfaces.
- (Side note: `-ePOSTGRES_PASSWORD=…` with no space also works. Short flags accept an attached value.)
- **Spotted:** an older version of the command is saved as line 7 in `packages/db-prisma/.env`. `.env` is meant for `KEY=VALUE` lines only. dotenv/Bun skip lines they can't parse, but it's confusing, and `.env` is gitignored, so the command never reaches the repo. Better homes: a `#` comment in a README, or a **Docker Compose** file (`compose.yaml`), which is the standard way to keep container config in a repo.

**Sources:** https://docs.docker.com/reference/cli/docker/container/run/ · https://hub.docker.com/_/postgres (env vars, PGDATA/volume notes) · https://docs.docker.com/compose/ · https://github.com/motdotla/dotenv#what-rules-does-the-parsing-engine-follow · https://docs.docker.com/engine/storage/volumes/ · https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING (connection URL format)

### P28: Postgres image versions, data paths, and pinning
**The problem it solves:** a volume only keeps data if it's mounted where the image actually writes, and that location depends on the image's major version.

**My command (with a volume):** `docker run -e POSTGRES_PASSWORD=password -e POSTGRES_DB=bstack -p 5432:5432 -n rocky_road -v b-stack:/var/lib/postgresql postgres`
- **Regression:** `-n` is back. The P27 fix was `--name`. With `-n`, docker errors with "unknown shorthand flag: 'n'".
- `-v b-stack:/var/lib/postgresql`: correct **for 18+**. Wrong for ≤17.

**Why 18 changed the path:**
- ≤17: `PGDATA=/var/lib/postgresql/data`, and the volume *is* the data dir.
- 18+: `PGDATA=/var/lib/postgresql/18/docker` (version-specific), with the declared `VOLUME` at `/var/lib/postgresql`. One volume can now hold `17/docker`, `18/docker`, … side by side.
- Reason: **major upgrades.** A new major version can't read the old one's files directly. You run `pg_upgrade` with the old and new data dirs both present. Its fast `--link` mode uses **hard links**, which only work within one filesystem, i.e. one volume. The old layout (one data dir = the whole volume) made that impossible.

**Wrong path = silent data loss:** if the volume isn't mounted where PGDATA lives, Docker creates an **anonymous volume** at the declared path. Data goes there and disappears when the container is re-created. Mounting ≤17 at `/var/lib/postgresql` hits exactly this. No error, the data just isn't in `b-stack`.

**Which version do I have?** `postgres` with no tag = `postgres:latest`, whatever's newest *when it was pulled*. Ways to check: the image's env vars (`PG_MAJOR`, `PG_VERSION`) via `docker image inspect`, the server binary's `--version` inside the container, or SQL `select version();`.

**Should I write `latest`?** No. `postgres` and `postgres:latest` are the same thing, and both move. When 19 becomes `latest`, a re-pulled image uses `PGDATA=/var/lib/postgresql/19/docker`. That's an empty new dir in the same volume, so the app sees an **empty database** while the 18 data sits untouched in `18/`. **Pin the major** (`postgres:18`) so the image tag and mount path always agree. Upgrade deliberately, with pg_upgrade or dump/restore.

**Prediction (unpinned image, `latest` moves 18 → 19, same volume):** my answer was "the old data is still there but in a different folder than the current version of SQL that accesses it". **Correct.** It's in `b-stack` under `18/docker`, and 19 reads `19/docker`. Missing piece: **what the app sees.** There's **no error.** 19 finds its folder empty, so it initialises a fresh cluster (creating `bstack` again from `POSTGRES_DB`), and the app connects fine to an **empty database with no tables**. The silent "where did my data go?" moment is the reason to pin.

**Sources:** https://raw.githubusercontent.com/docker-library/docs/master/postgres/content.md (PGDATA in 18+, `VOLUME` change, `pg_upgrade --link`, "WILL NOT PERSIST" warning) · https://hub.docker.com/_/postgres (tags) · https://www.postgresql.org/docs/current/pgupgrade.html (`--link` and hard links) · https://docs.docker.com/reference/cli/docker/image/inspect/

### P29: updating a local Docker image
**The problem it solves:** getting security and bug-fix releases without losing data.

**How it works:**
- **`docker pull <image>:<tag>`** downloads whatever that tag points to *now*. Pinned `postgres:18` gets the newest **18.x**.
- **A pull doesn't touch existing containers.** A container is fixed to the image it was **created** from. To use the new image: remove the container (`docker rm`, or `-f` if it's running) and `docker run` again with the same options. The **named volume keeps the data**, since the container is disposable and the volume isn't.
- **Minor vs major:** within a major (18.1 → 18.3) the data format is the same, so updating like this is safe. Across majors (18 → 19) it isn't (P28). With unpinned `postgres`, a pull can silently be a major jump. Check the version first.
- **Cleanup:** the old image stays on disk as a `<none>` (dangling) image. `docker image ls` lists them, and `docker image prune` removes dangling ones.

**Prediction ("after `docker pull`, is the running rocky_road on the new version? how to check?"):** my answer was "no, it isn't on the newest version; to check, exec into the container and read PG_VERSION". **Both right.**
- `docker exec` runs a command *inside* a running container. Reading the `PG_VERSION` env var (or running `postgres --version`) there shows the version the container was created from.
- **Without going inside:** `docker inspect rocky_road` shows the container's **image ID** and its env (including `PG_VERSION`). Compare that ID with the ID `docker image ls` shows for `postgres:18`. If they differ, the container is on the old image. This also works when the container is stopped, whereas exec needs it running.
- A hint in `docker ps`: when the tag has moved to a newer image, the IMAGE column for an old container can show a raw image ID instead of `postgres:18`.

**Sources:** https://docs.docker.com/reference/cli/docker/image/pull/ · https://docs.docker.com/reference/cli/docker/container/exec/ · https://docs.docker.com/reference/cli/docker/inspect/ · https://docs.docker.com/reference/cli/docker/container/rm/ · https://docs.docker.com/reference/cli/docker/image/prune/ · https://www.postgresql.org/support/versioning/ (minor releases never change the storage format)

### P30: DB connection URL vs web URL
**The problem it solves:** a client needs *how* to talk (protocol), *where* (host, port), *as whom* (credentials), *what* (which database) and *with which options*. Packing that into **one string** means one env var (`DATABASE_URL`). Swapping dev ↔ prod is then changing one value (the 12-factor "config in the environment" idea).

**Same grammar, both kinds (RFC 3986):** `scheme://userinfo@host:port/path?query#fragment`

| Part | Web: `https://user@example.com:443/monitors/5?page=2#top` | Postgres: `postgresql://postgres:password@localhost:5432/bstack?sslmode=require` |
|---|---|---|
| **scheme** | protocol to speak: HTTP over TLS | Postgres wire protocol (`postgres://` also accepted). Others: `mysql://`, `mongodb://`, `redis://` |
| **userinfo** | `user:pass@` is allowed but **deprecated**. Browsers strip or warn, because URLs leak (history, logs) | **normal and required**: DB user + password. That's why `.env` is secret |
| **host** | a domain name, which **DNS** resolves to an IP | the same: name or IP (`localhost` = this machine) |
| **port** | implied by the scheme (80/443) if omitted | default **5432** if omitted |
| **path** | a **route** the server's router interprets (`/monitors/5`) | **database name**, one segment: which DB in the server (cluster) |
| **query** | params for the app (`?page=2`) | **connection options**: `sslmode`, `connect_timeout`, `application_name`. Some tools add their own (Prisma has used `schema=`) |
| **fragment** | client-side only (scroll to `#top`), never sent to the server | not used |

**Correction to my framing:** DNS isn't a *part* of the URL. The **host** is a name, and DNS is the lookup that turns it into an IP *before* connecting. That's true for both kinds of URL.

**Gotchas / would have missed:**
- **Special characters in the password must be percent-encoded.** `@ : / # ? %` would otherwise be read as URL delimiters (e.g. `@` → `%40`, `#` → `%23`).
- **`localhost` is relative to where the code runs.** From Windows it's my machine, so the published `-p 5432` port works. From *inside another container* it's that container itself. If api ever runs in Docker, the host must become the DB container/service name (on a shared network) or `host.docker.internal`.
- **Cloud Postgres** (Neon, Supabase, RDS…) usually requires `?sslmode=require`. Local Docker Postgres doesn't use TLS by default.
- **Never log the full URL**, because the password is in it.
- **What actually happens with an unencoded special character in the password** (the prediction I didn't know, answered):
  - **`@` (`p@ss`): parsers disagree.** The WHATWG URL parser (JS `new URL()`, used by many Node/Bun drivers) treats everything before the **last** `@` as credentials, so it *happens* to work (user `postgres`, password `p@ss`, host `localhost`). A parser that splits at the **first** `@` reads password `p` and host `ss@localhost`, so it fails to resolve or log in. The same `.env` can work in one tool and break in another, which is exactly why you encode.
  - **`#` (`p#ss`): breaks everywhere.** `#` starts the fragment, so everything after it (`ss@localhost:5432/bstack`) is cut off. The parser sees authority `postgres:p`, i.e. host `postgres` with port `p`, and that's an invalid port error.
  - **Rule:** percent-encode the password always, or use a password made only of letters and digits.
  - (Tutor note: the original prediction assumed one answer for `@`. In reality it's parser-dependent.)
- Postgres also accepts a non-URL format: `host=… port=… dbname=… user=…` (key=value).

**Sources:** https://www.rfc-editor.org/rfc/rfc3986#section-3 (URL syntax) · https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL · https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING-URIS (Postgres URIs, params, default port) · https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding · https://www.prisma.io/docs/orm/reference/connection-urls · https://12factor.net/config · https://docs.docker.com/desktop/features/networking/ (`host.docker.internal`)

### P31: `prisma db init` (Prisma 8) and agent skills
**The problem it solves:** the database is empty, but the contract (`contract.prisma` → `contract.json`) describes tables. Something has to create them and record *which* contract the DB now matches.

**What the run did, step by step:**
1. **Introspecting:** read what's currently in the `bstack` DB (empty).
2. **Planning migration:** diffed the DB against `contract.json` and listed the operations needed.
3. **Applied 5 operations ("App space"):** created tables `Post` and `User`, a unique constraint on `User.email`, an index on `Post.authorId` (with an auto-generated hashed name), and a **foreign key** `Post.authorId → User`. These are the **starter models** from the template, not betteruptime's. I'll replace them with my own (websites, ticks…).
4. **marker `920a87…`:** the DB is **signed** with the contract's hash, so Prisma can later tell which contract version the DB matches.
5. **Advanced ref "db" → hash:** a **ref** is a named pointer to a contract hash (like a git branch name pointing at a commit).
6. The URL printed as `postgresql://****:****@…`: the CLI masks credentials. Same idea as P30's "never log the URL".
- "Spaces": Prisma 8 groups a contract's DB objects into *contract spaces*. Here there's just one, "App". (Not fully understood. See Open questions.)

**`db init` rules (from `--help`):** **additive only.** It creates what's missing, leaves compatible existing structures alone, and **stops** if reaching the contract would need a destructive change. `--dry-run` previews. So it's for bootstrapping, and later schema changes that drop or alter things need the migration workflow (`prisma migration status` was suggested next).

**The last line, "Prisma agent skills are out of date (installed @prisma/orm-postgres 8.0.0-rc.23, synced none). Run: prisma skills sync":**
- Prisma packages **ship instruction files for AI coding agents** (Claude Code, Cursor…) describing *the exact installed version*. "synced none" means none have been copied into this project yet.
- `prisma skills sync` would copy them into each agent's skill folder (for Claude Code, the project's skills dir). Which agents is controlled by `skills.agents` in `prisma.config.ts` (unset = every known agent). `--disable` silences this warning.
- **It's not needed for the DB.** It's purely for AI assistants.
- **Trade-off for me:** Prisma 8 is a new RC, so version-accurate skills would make Claude's Prisma answers better. But synced skills add to every session's context (token cost, see the plugin discussion). It writes files into my repo, and it could set up Cursor and other agents I don't use unless `skills.agents` limits it.
- **Version note:** the project has `@prisma/orm-postgres` **8.0.0-rc.23**, while `prisma@latest` is already rc.33. RCs change between releases, so pin versions and update deliberately.

**Sources:** `prisma db init --help` and `prisma skills sync --help` (8.0.0-rc.33, run in a scratch folder) · https://www.prisma.io/docs/cli/orm-init · https://www.postgresql.org/docs/current/ddl-constraints.html (unique + foreign keys) · https://www.postgresql.org/docs/current/indexes-intro.html

### P32: getting around in psql
**The problem it solves:** checking what Prisma actually created in the DB, without a GUI.

**How it works:** psql's **backslash meta-commands** are handled by psql itself, not sent to the server as SQL. They need no `;`.
- Getting in: run psql inside the container (`docker exec -it <container> psql -U <user> -d <db>`). `-it` gives an interactive terminal.
- `\l`: **list databases**. (I guessed `\d` for this. Wrong, see below.)
- `\c <db>`: **connect** to another database. (Right.)
- `\dt`: list **tables** in the current DB.
- `\d`: list all **relations** in the current DB (tables, views, sequences, …).
- `\d <table>`: **columns** of a table (name, type, nullable, default), plus indexes, constraints and foreign keys.
- `\d+ <table>`: the same, plus extra detail (storage, description).
- `\dn` lists schemas, `\du` lists roles/users, `\x` toggles expanded (vertical) output for wide rows, `\?` lists all meta-commands, `\q` quits.

**Gotcha / would have missed: case and quotes.** Prisma creates tables with **capitalised, quoted names** (`"User"`, `"Post"`). Postgres **folds unquoted identifiers to lowercase**, so `\d User` looks for `user` and finds nothing. Use `\d "User"`. The same applies in SQL: `SELECT * FROM User` fails, and `user` is also a reserved word (it returns the current role). Write `SELECT * FROM "User"`.

**Seeing a table's columns (asked again):** `\d "Page"` (quotes required for capitalised names). `\d+ "Page"` adds more detail. Pure-SQL alternative: query the standard view **`information_schema.columns`** filtered by `table_name`. There the name is a **string value** (`'Page'`), matched exactly as written: no folding, and no double quotes.

**Seeing a table's rows:** this is plain **SQL**, not a meta-command: `SELECT * FROM "User";`.
- Double quotes for the capitalised name (P32). `user` unquoted is a reserved word.
- It **needs the `;`**. Without it, psql waits with a `bstack-#` continuation prompt.
- Connect to the right DB first (`\c bstack`, or start psql with `-d bstack`).
- `\x` (expanded output) helps when rows are wide. Add `LIMIT 10` on big tables.

**Experiment result:** `\d User` printed `Did not find any relation named "User".`, which confirms the case folding. The quotes in that message are just psql's formatting around the pattern I typed. They don't mean it searched case-sensitively, because it actually looked for lowercase `user`.
- **Spotted in the prompt: `bstack-#` vs `bstack=#`.** `=` means a fresh prompt. **`-` means continuation**: an unfinished SQL statement (no `;` yet) is sitting in psql's query buffer. Meta-commands still run immediately, but the next SQL I type gets **appended** to that leftover text and can fail strangely. `\r` clears the buffer, `\p` prints it, or finish it with `;`. (`#` vs `>` shows superuser vs normal user.)

**Connects to:** the contract I just edited replaced `Post` with `Page` (with `username`, `url`, `temporal.UpdatedAt`). The DB still has the old `Post` table until I apply the change. `\dt` will show me exactly what's really there.

**Sources:** https://www.postgresql.org/docs/current/app-psql.html (meta-commands) · https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS (case folding, quoted identifiers) · https://docs.docker.com/reference/cli/docker/container/exec/

### P33: changing the schema after `db init` (Prisma 8)
**The problem it solves:** editing `contract.prisma` changes only the *description*. Something has to move the live DB to match, and decide what happens to existing data.

**Why `Post` is still there:** `db init` is additive-only (P31). It never removes anything, and nothing has run against the DB since the edit.

**Don't drop it by hand.** A manual `DROP TABLE` leaves Prisma's **marker** (the contract hash stored in the DB) out of sync with reality. `prisma db verify` then reports a mismatch, and `Page` still doesn't exist. Let Prisma make the change so the DB, contract and marker move together.

**The two Prisma 8 paths (from `--help`):**
1. **`prisma db update`** (quick, for dev): compares the DB to the **emitted** contract and applies the difference directly. Before anything that **loses data**, it stops and asks what I mean:
   - `--rename Post:Page` means it's the same thing under a new name, so keep the rows.
   - `--delete Post` means let it go (drop the table and its data).
   - `--dry-run` shows the plan and the questions first.
2. **`prisma migration plan` → `prisma db migrate`** (for history/production): `plan` writes an **on-disk migration package** (committed to git, reviewed, replayable on every environment). `db migrate` applies it. `migration status` / `log` show what has run where.
- Same split as Prisma ≤7: `db push` (sync directly, no history) vs `migrate dev` / `migrate deploy` (migration files).

**Gotcha:** `db update` compares against the **emitted** contract (`contract.json`), not `contract.prisma`. If `contract.json` wasn't regenerated after the edit, Prisma still thinks the schema has `Post`. Emit first (`contract emit`, which `orm init` runs during setup), then update.

**Revisited ("if I remove a table from the schema, how is it removed from the DB? I forgot"):** the same answer, as a 3-step checklist: (1) edit `contract.prisma`; (2) re-emit `contract.json`; (3) let Prisma apply it: `db update --delete <Table>` (preview first with `--dry-run`), or `migration plan` → `db migrate`. Never use `db init` (additive-only) or a manual `DROP TABLE` (marker drift). ~~Note: a `migrations/` folder already exists in db-prisma, so I've used the migration path before.~~ **Corrected in P47:** the folder holds only `app/refs/db.json` + `snapshots/`, which `db init`/`db update` write themselves. There are no migration packages, so I've only ever used the quick path. Whichever path I pick, stay on it. Mixing it with `db update` very likely leaves changes out of the history (that's how Prisma ≤7's `db push` vs migrations behaved; not yet verified on 8).

**Sources:** `prisma db --help`, `prisma db update --help`, `prisma migration --help` (8.0.0-rc.33, run in a scratch folder) · https://www.prisma.io/docs/cli/orm-init (`contract emit` reads files starting with `// use prisma-8`) · https://www.postgresql.org/docs/current/sql-droptable.html

### P34: db-prisma's tsconfig (written by `prisma orm init`)
**Current:** `target ES2022`, `module preserve`, `moduleResolution bundler`, `resolveJsonModule`, `types ["node"]`, `strict`, `skipLibCheck`, `esModuleInterop`, `outDir dist`, `include ["**/*.ts"]`. It doesn't extend anything.

**Remove outDir? Yes, and add `noEmit: true`.** Nothing is ever compiled to dist. `exports` points at source files, and api (on Bun) imports the `.ts` directly. tsc is only a type checker here (same as P8 for api). `outDir` alone doesn't stop emitting. Without `noEmit`, running `tsc` would write a dist/ nobody uses.

**Extend `@repo/typescript-config/base.json`? Recommended, for consistency.** It brings `noUncheckedIndexedAccess`, `isolatedModules` and `moduleDetection force`, the same rules as api. But:
- the package must **declare** `@repo/typescript-config` (devDependency), the P7 lesson;
- base's `NodeNext` + `DOM` lib must be overridden with **exactly the same overrides as apps/api** (P8).
- Two packages needing identical Bun overrides is the cue to create a shared Bun config in packages/typescript-config, like `nextjs.json` (the P8 open question).

**Already good:** `module preserve` + `bundler` fit Bun. `include ["**/*.ts"]` covers the root `prisma.config.ts` (the P25 gotcha is avoided). node_modules is excluded by default.

**My take: "I don't think I need types: ['node'], Bun already covers it."** **Half right.** Bun's types do include Node's, but only if they're **loaded**: `types: ["bun"]` *and* `@types/bun` installed in this package. **Deleting the `types` line entirely** means TS 6+/7's default `types: []` loads no globals at all. Then `process` in `prisma.config.ts` errors ("Cannot find name 'process'"). So **replace** `["node"]` with `["bun"]` (and add `@types/bun`). Don't just remove it. (P8 + P24 combined.)

**`types ["node"]` vs `["bun"]`:** Prisma's choice, P24. `@types/bun` includes Node's types, so `["bun"]` is a superset, consistent with api, and needs `@types/bun` installed. Either works for this package's current code.

**Sources:** https://www.typescriptlang.org/tsconfig/#noEmit · https://www.typescriptlang.org/tsconfig/#outDir · https://www.typescriptlang.org/tsconfig/#extends · https://www.typescriptlang.org/tsconfig/#include · local `packages/typescript-config/nextjs.json` (pattern)

### P35: `exports` points at the wrong extension
`"./*": "./src/prisma/*.tsx"` was copied from @repo/ui (React components = `.tsx`). Prisma's files are **`.ts`** (`db.ts`), so `@repo/db-prisma/db` resolves to `src/prisma/db.tsx`, which doesn't exist, giving "Cannot find module". The wildcard also exposes *every* file in src/prisma (`contract.json` too). Exporting only what consumers need (the db client) is tighter.

**Fixed:** I changed it to `"./*": "./src/prisma/*.ts"`. **Correct.** `@repo/db-prisma/db` → `src/prisma/db.ts`.
- **Tutor correction:** I'd said the wildcard also exposes `contract.json`. **Wrong.** The pattern *appends* `.ts`, so `@repo/db-prisma/contract.json` maps to `contract.json.ts`, which doesn't exist. Only `.ts` files in src/prisma are reachable.
- **Consequence:** with only a `"./*"` entry, the bare `import … from "@repo/db-prisma"` (no subpath) **fails**, because there's no `"."` entry. Consumers must write `@repo/db-prisma/db`, or add a `"."` entry pointing at the client.
- Still to do: `@repo/typescript-config` is in `dependencies`. It's type-check-only, so it belongs in devDependencies (same as P12). And apps/api must declare `"@repo/db-prisma"` to import it (P7).

**Sources:** https://nodejs.org/api/packages.html#subpath-patterns · https://nodejs.org/api/packages.html#exports

### P36: version drift inside db-prisma
- `prisma` `^8.0.0-rc.33` (CLI) vs `@prisma/orm-postgres` `^8.0.0-rc.23` (runtime). Release candidates can change formats between versions, so a mismatched CLI and runtime is asking for trouble (that's what the "skills out of date… rc.23" line was hinting at). Keep them on the **same exact version**. With pre-releases, `^` doesn't mean "stay on this RC".
- `@types/node` `^26.6.6` here vs `26.4.1` in web/ui. That's P3's drift problem again, and a reason to do the catalog to-do (P11).

**Sources:** https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies · https://github.com/npm/node-semver#prerelease-tags · https://bun.com/docs/pm/catalogs

### P37: `.ts` vs `.d.ts` in `exports`
**My reasoning:** "I exported `.ts` because I'd like the `.d.ts` to be exported, which I guess contains the types. Do I have to specifically mention in exports which is a type file and which is code, like in npm?"

**Grade:** the choice (`.ts`) is right, but the reason is wrong.
- **A `.ts` file holds code *and* types together.** A **`.d.ts` (declaration file)** is a *types-only* file, generated by `tsc` with `declaration: true` when a package is **compiled** to `.js`. The `.js` then has no types, and the `.d.ts` sits beside it to describe them.
- **db-prisma emits nothing** (`noEmit`), so **no `.d.ts` exists**. Pointing `exports` at `.ts` source means **one file serves both**: TypeScript in api reads the types from it, and Bun runs its code. No separate types entry is needed.
- Turborepo calls this a **Just-in-Time package** (consumers compile the source). The alternative, a **Compiled package**, builds to `dist/` with `.js` + `.d.ts`.

**How npm/compiled packages do it:** `exports` uses **conditions**, keys inside an entry that pick a file depending on who's asking. **`types`** gives the `.d.ts` for TypeScript, and `import` / `require` / `default` give the `.js` for the runtime. **`types` must come first**, because conditions match in order. Older packages also use a top-level `"types"` field.

**When I'd need that here:** only if db-prisma were compiled. That would be for publishing, or for consumers that can't read TS (e.g. plain Node without type stripping).

**Also (P34 follow-up):** I reported `updatedAt` as "timezone(3)". Postgres prints the type as either **`timestamp(3) without time zone`** or **`timestamp(3) with time zone`** (`timestamptz`). Prisma ≤7 defaulted to *without*. Which one Prisma 8 chose isn't confirmed yet: re-check the exact `\d "Page"` text. **(3) = 3 fractional-second digits (milliseconds)**, which matches JavaScript `Date`'s millisecond precision. *Without* time zone stores the clock reading with no zone info. Fine if everything is written in UTC, but a classic source of off-by-hours bugs.

**Sources:** https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html · https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-exports · https://nodejs.org/api/packages.html#conditional-exports · local `node_modules/.bun/turbo@2.11.10/node_modules/turbo/docs/` (core-concepts/internal-packages: Just-in-Time vs Compiled) · https://www.postgresql.org/docs/current/datatype-datetime.html

**Prediction (exports pointing only at compiled `dist/*.d.ts`):** I said "it depends where I'm pointing in the imports, either way it would, I guess". **Too vague to grade as right.** The answer: the **type check passes**, because TS finds the types in the `.d.ts`. But **runtime fails**, because a `.d.ts` has **no code**, so Bun finds no `db` export to import. That's why compiled packages need *two* conditions (`types` → `.d.ts`, `default` → `.js`).

### P38: TS2742 "inferred type… cannot be named… not portable"
**The error:** `The inferred type of 'db' cannot be named without a reference to 'NoCollectionClasses' from '.bun/@prisma+orm-family-sql@8.0.0-rc.23+…/node_modules/@prisma/orm-family-sql/orm-client'. This is likely not portable. A type annotation is necessary.`

**What's happening:**
1. db-prisma's tsconfig now **extends base.json**, which turns on **`declaration: true`** (+ `declarationMap`). TS therefore checks that it *could* write a `.d.ts` for every exported value.
2. `db` has no annotation, so its type is **inferred** from `postgres({...})`. That inferred type contains `NoCollectionClasses`, which lives in **`@prisma/orm-family-sql`**, a **transitive** dependency (pulled in by `@prisma/orm-postgres`). db-prisma doesn't depend on it directly.
3. To write the `.d.ts`, TS must write an `import(...)` for that type. Under Bun's **isolated install** (P7), the only path it can find is the internal store path `node_modules/.bun/@prisma+orm-family-sql@8.0.0-rc.23+hash/...`. That path is specific to this machine's install layout, so it's **not portable**, and TS refuses rather than emit a broken `.d.ts`.

**Fix options:**
- **Turn off `declaration` / `declarationMap` in db-prisma's tsconfig.** It's a Just-in-Time package (P37): no `.d.ts` is ever produced, so this check has no purpose here.
- **Annotate `db` with an exported Prisma client type**, as the message suggests. Then TS can name it via a public import.
- **Add `@prisma/orm-family-sql` as a direct dependency** so a portable path exists. This adds a dependency just to satisfy the checker, and it must version-match the RC (P36).

**Tutor correction (P8):** I'd said base's `declaration`/`declarationMap` were "moot with `noEmit`". **Wrong.** Even with `noEmit`, `declaration: true` keeps TS running **declaration-emit checks** like this one. Override them to `false` in Bun apps/JIT packages that extend base.

**Worked through (I asked for a plain re-explanation):** my words were "declaration asks for .d.ts, but here we're using Bun instead of npm. I don't think we need .d.ts, as it's a JIT package."
- **Conclusion right:** a JIT package needs no `.d.ts`, so turn `declaration` (and `declarationMap`) **off** in db-prisma. **Fix chosen: option 1.**
- **Reason half wrong:** it's **not Bun vs npm**. Those are package managers/runtimes, and either way the question is the same. It's **JIT vs Compiled**. A JIT package under npm wouldn't need `.d.ts` either, and a *compiled, published* package built with Bun still would.
- **Plain version:**
  - `declaration: true` means "when compiling, also write a `.d.ts` per file". It exists so people who only get your compiled `.js` still get types.
  - `declarationMap: true` means also write `.d.ts.map`, so "Go to definition" jumps to your original `.ts` instead of the `.d.ts`. It only matters if `declaration` is on.
  - base.json has both because the Turborepo starter's base is generic and also serves packages that *might* be compiled.
  - With `declaration` on, TS checks every export: "could I describe this in a `.d.ts`?" For `db`, it couldn't (P38 step 3), so it errored, even though `noEmit` means it would never write the file. Turn it off and the check (and error) goes away.
  - Analogy: a `.d.ts` is the **menu** for a kitchen you can't enter (compiled JS). A JIT consumer walks **into the kitchen** (the `.ts` source) and reads the recipes directly, so no menu is needed.

**Design decision: turn `declaration`/`declarationMap` off globally in base.json, and opt back in per package later?** That was my proposal. **Sound for this repo.** Every package here is Just-in-Time or non-emitting:
- api: Bun, noEmit
- db-prisma: JIT
- ui: exports `./src/*.tsx`, `tsc --noEmit`
- web: Next, noEmit

Nobody needs `.d.ts`, so a default of "off" matches reality and removes the repeated override. It's the same principle as the plugins (off by default, on where needed).
- Trade-off: base.json is shared, so editing it changes every package at once. Fine *because* none of them emits.
- When a compiled package appears later, it sets `declaration: true` in its own tsconfig, plus the rest of a compiled setup (`outDir`, `noEmit: false`, exports with `types` + `default` conditions, P37).

**Side note (connects to P37):** `db.ts` does `import type { Contract } from './contract.d'`. Prisma emits a `contract.d.ts` next to `contract.json`, a **types-only file describing a JSON file's shape**. That's another legit use of `.d.ts`.

**Also from extending base:** `lib` now includes **DOM** (not overridden here), and `types: ["node"]` is still there (P34).

**Sources:** https://www.typescriptlang.org/tsconfig/#declaration · https://github.com/microsoft/TypeScript/issues/42873 (TS2742 with pnpm/isolated `node_modules`) · https://bun.com/docs/pm/isolated-installs · https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html

### P39: base.json's `module` / `moduleResolution` / `target`
**My question:** "base.json has `module: NodeNext`. Shouldn't we use ESNext instead? Same for target and moduleResolution."

**Facts (Mode B):**
- **`module` and `moduleResolution` come in pairs; you can't change one alone.** `module: NodeNext` requires `moduleResolution: NodeNext`. `moduleResolution: bundler` requires `module` `ESNext`/`ES20xx` or `Preserve`. TS errors on mismatches. I listed both, which is correct.
- **`ESNext` vs `Preserve` for module:** with `noEmit` both type-check the same ESM code. `Preserve` (TS 5.4+) means "leave imports exactly as written, a bundler or runtime handles them". It implies bundler resolution, and it's what Bun recommends. `ESNext` is what `nextjs.json` uses for Next.
- **`target`:** with `noEmit` it mostly sets the **default `lib`** and a few semantics (e.g. class-field behaviour). It doesn't down-level anything, because nothing is emitted. `ES2022` is **fixed**. `ESNext` **moves** with every TS release, the same "latest moves" idea as P21/P28. Either is fine for Bun. A fixed target is more predictable in a shared base.
- **Who actually sees base's values:**
  - web: overridden by nextjs.json → ESNext/Bundler
  - api: overridden → Preserve/bundler
  - db-prisma: overridden → preserve/bundler
  - ui: via react-library.json (check it)
  - So `NodeNext` currently reaches **only packages that don't override it**.

**The design question underneath:** which settings are true for **every** package (strictness: `strict`, `noUncheckedIndexedAccess`, `isolatedModules`, `skipLibCheck`…), and which depend on the **runtime** (module/resolution, `lib`, `types`)? This is the third time the same Bun overrides appear (api, db-prisma), the P8 open question again.

**Review of my base.json (asked for "a good enough setting"):**
- **Done:** `declaration` / `declarationMap` are now `false` (P38 decision applied).
- **Universal, keep in base:** `strict`, `noUncheckedIndexedAccess`, `isolatedModules`, `moduleDetection: force`, `skipLibCheck`, `esModuleInterop`, `resolveJsonModule`, `incremental: false` (turbo caches anyway), `target: ES2022` (fixed, fine everywhere).
- **Runtime-specific, the misfits:**
  - `lib` with `DOM`/`DOM.Iterable`: right for web/ui (browser), wrong for api/db-prisma (Bun server).
  - `module`/`moduleResolution: NodeNext`: nothing in this repo runs on plain Node. **ui is the only package that actually inherits it** (react-library.json only adds `jsx`). Everything else overrides it.
- **Option A (minimal):** switch base's pair to `Preserve` + `bundler`, since every consumer is Bun-run or bundled (Next). Bun packages still override `lib` and `types`. That's less repetition, but base keeps a browser `lib`.
- **Option B (cleaner, the P8 answer):** base keeps **only the universal rules**. Runtime settings move into per-runtime configs that extend base:
  - `nextjs.json`: already sets module/resolution, keeps DOM lib.
  - `react-library.json`: add the bundler pair + DOM lib.
  - **new `bun.json`**: `Preserve` + `bundler`, `lib ESNext`, `types ["bun"]`, `noEmit`.
  - Then api and db-prisma extend `bun.json` and drop their copied overrides.
- Optional: `noEmit: true` could live in base, since no package emits (same reasoning as `declaration: false`).

**Decision: Option C (mine).** Make **base.json the Bun default**, and have the browser configs (`react-library.json` for ui, `nextjs.json` for web) override back to browser settings. No separate bun.json.
- **Graded: workable.** Fewer files, and it matches the repo, where most packages are Bun.
- **Trade-off:** base stops being runtime-neutral, so every browser config **must** override `lib` *and* `types`.
- **Footgun:** if a browser config forgets to override `types`, it inherits `["bun"]`. That gives Bun/server globals in browser code, *or* the error "Cannot find type definition file for 'bun'" in packages without `@types/bun` installed.
- The full change list is in **To do → (P39)**.

**Sources:** https://www.typescriptlang.org/tsconfig/#module · https://www.typescriptlang.org/tsconfig/#moduleResolution · https://www.typescriptlang.org/docs/handbook/modules/reference.html#preserve · https://www.typescriptlang.org/tsconfig/#target · https://bun.com/docs/typescript-6 (Bun's recommended options)

### P40: list relation fields (`pages Page[]`) and optionality
**My worry:** "I didn't add `?` to `pages Page[]`, so I don't think a user with an empty page array can exist."

**Answer: nothing is broken. A user with zero pages is fine.**
- **A list can't be optional in PSL:** `Page[]?` is invalid. The "nothing" case for a list is simply the **empty list `[]`**. `?` is for single values (`String?`, `User?`), meaning "may be null".
- **`pages Page[]` is a virtual (relation) field.** It is **not a column** in the `User` table. It tells Prisma "pages point at me", so I can query or include them from the user side.
- **The relation is stored on the other side:** `Page.authorId` (a real column, plus a foreign key → `User.id`). **`author User` (no `?`) means every Page must have a user.** The *required* rule lives there, not on `User.pages`.
- So the rules are: each Page has exactly 1 author, each User has 0 or more pages (one-to-many).
- **How to check it myself:** `\d "User"` in psql shows **no pages column**. `\d "Page"` shows `authorId` + the foreign-key constraint.

**Connects to:** P31 (the foreign key `Post_authorId_fkey` created by `db init`) and P32 (`\d "Table"`).

**Sources:** https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/one-to-many-relations · https://www.prisma.io/docs/orm/prisma-schema/data-model/relations (relation fields are not in the DB) · https://www.prisma.io/docs/orm/reference/prisma-schema-reference#model-field-scalar-types (`[]` lists can't be optional) · https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK (these are Prisma ≤7 PSL docs; Prisma 8 PSL looks the same here, but check the v8 docs)

### P41: `db.close()` and "singleton"
**The problem it solves:** a DB client holds a **pool of open connections**. Too many clients leak connections (Postgres has a `max_connections` limit). Never closing can keep a short script from exiting.

**Where the singleton actually comes from: the module system, not Prisma.** `export const db = postgres({...})` in db.ts runs **once per process**. ES modules are evaluated once and cached, so every `import { db }` gets the **same instance** (and the same pool). Prisma just manages the pool inside that one instance.

**When to call `close()`:**
- **Long-running server (api): not per request.** Closing after a request breaks every later request. Either never call it, or call it **once on shutdown** (SIGINT/SIGTERM → close → exit) for a *graceful shutdown*. That's optional locally, since the OS and Postgres clean up when the process dies.
- **Short scripts (seed, one-off test, migration helper): yes, at the end.** An open pool keeps the event loop alive, so the script can **hang instead of exiting**.

**Gotcha: hot reload breaks the singleton.** `bun --hot` (and Next.js dev HMR) **re-evaluates modules inside the same process**. Every reload creates a *new* client while the old pool stays open, and after enough saves you hit "too many clients". The classic fix is caching the client on `globalThis`, which survives re-evaluation. `bun --watch` **restarts the whole process**, so it doesn't have this problem.

**Review of my api/index.ts (test route):**
- `GET /` *creates* a user with a fixed email. `email` is `@unique`, so **the 2nd request violates the unique constraint**. (Prediction question pending: what does the client see?)
- Fact: **Express 5 forwards rejected promises from async handlers to the error handler** (Express 4 didn't; unhandled rejections hung the request). So there's no crash, just Express's default error response.
- Writes normally belong on POST, not GET (browsers and prefetchers may repeat GETs). Fine for a throwaway test.

**Sources:** https://nodejs.org/api/esm.html (module evaluation and caching) · https://bun.com/docs/runtime/watch-mode (`--hot` vs `--watch`) · https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections (≤7, but the same principles) · https://www.prisma.io/docs/guides/nextjs (globalThis pattern) · https://expressjs.com/en/guide/error-handling.html (Express 5 async errors) · https://www.postgresql.org/docs/current/runtime-config-connection.html#GUC-MAX-CONNECTIONS

### P43: Express Router and backend structure
**The problem it solves:** with every route in one `index.ts`, the file grows with every feature. Paths repeat their prefix (`/api/v1/website/...`), and middleware such as auth can't easily be applied to just one group of routes.

**How it works:** an `express.Router()` is a **mini-app**. You attach routes and middleware to it, then **mount** it on a prefix with `app.use("/prefix", router)`. Inside the router, paths are written *relative* to that prefix.

**A common shape (prose, I'll write it myself):**
- **Entry (`index.ts`):** create the app, add global middleware (JSON body parsing, CORS), mount one router per resource, register the **error handler last**, then listen.
- **Separate `app` from `listen`** (e.g. `app.ts` exports the app, `index.ts` only listens). Tests can then import the app without opening a port.
- **One router per resource:** website, user/auth, later status/ticks.
- **Layers inside a feature:**
  - **routes**: path + method → handler
  - **handlers/controllers**: read the request, call the logic, send the response
  - **services** (optional): business logic + DB calls, no `req`/`res`
  - **middleware**: auth, input validation
- **Two layouts:**
  - **by layer**: `routes/`, `controllers/`, `services/`
  - **by feature**: `website/` holding its routes, handlers and service. Feature-based scales better because related code sits together.
- Request/response **validation schemas** (e.g. zod) can live in a shared package, so web and api agree on the shapes.

**Gotchas / would have missed:**
- **Moving handlers into a separate controllers file loses contextual typing** (P9): `req.params` stops being inferred from the route string. Either keep small handlers inline in the router, or type them explicitly.
- **A nested router doesn't see its parent's params** (`/website/:id` → child router) unless it's created with `mergeParams: true`.
- **Express 5 changed path syntax:** wildcards need a name (`*name`), optional segments use braces (`{...}`). Old Express 4 tutorials' `*` or `?` patterns break.
- The error-handling middleware has **4 parameters** and must be registered **after** the routes.

**My decision:** keep routes in index.ts until they get messy, then move them into routers ("it's copy-paste in the end"). **Agreed**, with one caveat: it's *mostly* copy-paste. The parts that aren't are relative paths after mounting, `mergeParams`, error-handler order, and `req.params` typing if handlers move to their own files. Those are listed in the To do item.

**Now or later? Recommendation:** decide the **resources and endpoints first** (the open design question). Then split into routers as soon as there's a second resource. A folder structure built before knowing the resources is guesswork.

**Sources:** https://expressjs.com/en/guide/routing.html#express-router · https://expressjs.com/en/5x/api.html#router · https://expressjs.com/en/guide/migrating-5.html (path syntax changes) · https://expressjs.com/en/guide/error-handling.html · https://expressjs.com/en/guide/writing-middleware.html

### P13: server never starts
index.ts creates `app` and a route, but `port` is declared and never used. Nothing tells the app to start listening, so the process exits right after running.

### ⭐ P59: declaration merging (adding `userId` to Express's `Request`), marked important
**The problem it solves:** the auth middleware verifies the token and wants to hand `payload.sub` to the route handlers. JavaScript lets you just set `req.userId = …` at runtime. But **TypeScript** errors ("Property 'userId' does not exist on type 'Request'") because Express's `Request` type doesn't know that property. I can't edit Express's `.d.ts` in node_modules, so I need a way to **add** to a type someone else declared.

**How it works:** in TypeScript, **two `interface` declarations with the same name (in the same scope) merge into one**: the members of both are combined. That's **declaration merging**. Interfaces are "open": anyone can add to them later. (`type` aliases are **closed**. Declaring the same `type` twice is an error, which is one real difference between `interface` and `type`.)

**Express is designed for this (installed `@types/express-serve-static-core@5.1.3/index.d.ts`, lines 6–14):** it declares an **empty** `interface Request {}` inside `declare global { namespace Express { … } }`, with the comment *"These open interfaces may be extended in an application-specific manner via declaration merging."* At lines 407–412, the real `Request` type **`extends http.IncomingMessage, Express.Request`**. So whatever I merge into the global `Express.Request` shows up on every `req`.

**The recipe (prose; I'll write it):**
1. A `.d.ts` file in apps/api (e.g. `types/express.d.ts`).
2. Inside: `declare global` → `namespace Express` → `interface Request` with my property, e.g. `userId` as an **optional** string (optional because routes *without* the middleware won't have it).
3. The file must be a **module** for `declare global` to be allowed: give it at least one top-level `import` or `export` (an empty `export {}` is the usual trick).
4. Make sure tsconfig's `include` covers that file. If tsc never sees it, nothing merges.
5. In the middleware: set `req.userId` from `payload.sub`, then call `next()`.

**"Extend the Request *object*, right?"** **Half right.** At runtime `req` is an object and I *do* add a property to it. But declaration merging extends the **type** (an interface), not the object. **The `.d.ts` adds nothing at runtime.** If the middleware forgets to set it, the type still says it might be there. Hence optional + a check in the handler.

**"How does `export {}` make it global for every file?" It doesn't. That's the misunderstanding.** TypeScript has **two kinds of files**:
- **Script:** no top-level `import`/`export`. Everything it declares at top level **is already global**.
- **Module:** has at least one top-level `import`/`export`. Everything it declares is **private to that file** unless exported.
`export {}` exports nothing. Its only job is to turn the file into a **module**. Then **`declare global { … }`** is the escape hatch "from inside this private module, add *these* things to the global scope", and **TS only allows `declare global` inside a module**. So `declare global` makes it global, and `export {}` just makes `declare global` legal. **Equivalent alternative:** a *script* `.d.ts` (no import/export, no `declare global`) with `namespace Express { interface Request … }` at top level merges too, because it's global already. People use the module form because the file often needs an `import` anyway (which makes it a module), and then `declare global` is required.

**My prediction for "forgot to include the `.d.ts` in tsconfig":** "it fails type check." **Right:** `tsc` (and the editor) report "Property 'userId' does not exist on type 'Request'". The nuance is that **Bun still runs it fine**, because Bun strips types without checking them (P10). The error only shows in the editor / `tsc --noEmit`, never at runtime.

**Error hit (2026-11-13):** "Type 'String | undefined' is not assignable to type 'string | undefined'. 'string' is a primitive, but 'String' is a wrapper object." **Cause:** my `express.d.ts` line 4 declared `user_id?: String` with a **capital S**. **`string`** = the primitive type (what `"abc"` is). **`String`** = the type of the *wrapper object* (`new String("abc")`), a different type. A primitive fits into `String`, but `String` doesn't fit where `string` is expected (e.g. the ORM's `user_id` field), hence the error the moment `req.user_id` is passed on. **Fix:** lowercase `string`. The same goes for `number`/`Number` and `boolean`/`Boolean`. Always use lowercase in types; the capitalised ones are the JS constructor functions. Source: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#number-string-boolean-symbol-and-object

**Related term:** **module augmentation** = the same merging, but into a *module's* exports (`declare module "express-serve-static-core" { interface Request { … } }`) instead of a global namespace. Express supports both. The global `Express` namespace route is the one its comment points to.

**Alternative with no merging at all:** **`res.locals`**, Express's built-in per-request bag (for data passed between middleware and handlers). It's typed `Record<string, any>` by default, so it compiles straight away, but as `any` (no type safety), unless I merge into `Express.Locals` the same way.

**Connects to:** P9/P19 (reading Express's `.d.ts`, generics), P37 (`.d.ts` = types only, no code), P26 (types don't guarantee runtime values, like `!`).

**Sources:** installed `node_modules/.bun/@types+express-serve-static-core@5.1.3/node_modules/@types/express-serve-static-core/index.d.ts` (lines 6–14 the open `Express.Request`; 407–412 `extends … Express.Request`) · https://www.typescriptlang.org/docs/handbook/declaration-merging.html (merging interfaces, global augmentation, module augmentation) · https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces · https://expressjs.com/en/5x/api.html#res.locals

### P58: `jose.jwtVerify`: what it checks, what it returns, which options
**The problem it solves:** the auth middleware receives a token string from the client and must answer "is this genuine and still valid, and *who* is it?" before any route trusts it.

**What `jwtVerify(token, secret, options)` does:** it recomputes the signature with the secret and compares it (a tampered token → throws), checks `exp`/`nbf` against the clock (expired → throws `JWTExpired`), and checks every claim the **options** ask for. On **any** failure it **throws**, so the middleware's catch → 401.

**What it returns: `{ payload, protectedHeader }`:**
- **`protectedHeader`** = the token's decoded **header** object. For my tokens that's just `{ alg: "HS256" }` (`typ` only appears if set at signing). It's useful when there are several keys/algorithms (`kid`). I won't need it now.
- **`payload`** = all claims, merged: what I passed to `new SignJWT({...})` + the `set…` claims. For my signin: `{ user_id: "<uuid>", sub: "<uuid>", iat: 1762…, exp: 1762… }` (`user_id` only while I still send it twice, P57). Its TS type is `JWTPayload`: `sub`, `iss`, `aud`, `exp`, `iat`, `nbf`, `jti` are all **optional** (`sub` is `string | undefined`), plus any custom keys.
- ⚠️ **`iat`/`exp` are in *seconds* since 1970** (JWT "NumericDate"), not milliseconds like `Date.now()`. Comparing them directly is off by ×1000.

**"Do I pass `subject` in the options, since I used `setSubject`?" No.** The `subject` option means "**reject unless `sub` equals this exact value**", for when you already *know* which subject to expect. The middleware doesn't know who's calling; finding out is the whole point. So: verify **without** `subject`, then **read `payload.sub`**, check it's present (it's typed optional), and attach it to `req`.

**⚠️ The README's options will break my tokens:** `issuer: 'urn:example:issuer'` and `audience: 'urn:example:audience'` require claims **my signin never sets**, so every one of my tokens would fail verification (a claim-validation error). **The options must mirror what was signed:** none of `iss`/`aud` now (or add both on both sides with *my* values), plus `algorithms: ['HS256']`.

**Where the token comes from (would have missed):** by convention the client sends the header **`Authorization: Bearer <token>`**. The middleware reads `req.headers.authorization`, checks it starts with `Bearer `, takes the rest, and responds 401 if it's missing or malformed. Express lowercases header names in `req.headers`.

**My decisions (2026-11-13):**
- I dropped the custom `user_id` claim, so the id is in `sub` only. The payload is now `{ sub, iat, exp }`. Good: one source of truth.
- **No `Bearer ` prefix for now.** The client sends the raw token as the whole `Authorization` value. That's fine while I write both sides. **Footgun for later:** tools and libraries that "do auth for you" (Postman's *Bearer Token* auth type, fetch wrappers, OpenAPI clients) send `Bearer <token>`. My middleware would then pass the string `"Bearer eyJ…"` to `jwtVerify`, which fails as an invalid token. Parked in To do.

**Test 3, run 010 (2026-11-13), first test of the middleware (`claude_tests/run-010-test-3.md`):**
- **Works:** valid token → route. **Blocked:** no token (`ERR_JWS_INVALID`), garbage, **tampered `sub` → `ERR_JWS_SIGNATURE_VERIFICATION_FAILED`** (this answers my open prediction: changing any claim breaks the signature), `alg: none` → `ERR_JOSE_NOT_SUPPORTED`, and the `Bearer` form (as expected under my raw-token design).
- **Bugs found:**
  1. Every rejection returns **status 200** (the catch has no `res.status`).
  2. **jose errors serialise `code`/`name`/`stack`**, unlike a plain `Error` (P54), so `error` leaks file paths and versions.
  3. Website **owner taken from the body**: B created a website owned by A (an **IDOR**, see Jargon).
  4. **No ownership check** on `GET /user/website/:id`: B reads A's site.
  5. `POST /region/create` hangs.
  6. `GET /user/:id` ignores `:id`.
  7. `app.use(jsonMiddleware)` also guards unknown paths → 200 "Authorization Error!" instead of 404.
- **Run 011 (after my fixes):** rejections now return **400** (was 200; the final code should be 401), and **create now takes the owner from the token** (B's attempt to create for A now creates for B). Still open: read IDOR (step 16), stack-trace leak, `/region/create` hang, `/user/:id` ignoring `:id`.
- **Run 012:**
  - **The read IDOR is fixed:** B now gets `{"website":null}` for A's site. Better as 404, which looks the same as "doesn't exist" and so doesn't reveal that the id is real.
  - `GET /user/:id` is gone (Express's default 404 HTML).
  - **`/region/create` now answers, but with Postgres `23502` (not_null_violation) on `Region.id`.** This is the "no generator on `Region.id Int @id`" warning from P46, now happening for real. The failing row also shows `name` = the **whole body object** `{"name":"…"}`, not the string.
  - The SQL error's `table`/`column`/`detail` are sent to the client (P49 leak).
- **Fixing `Region.id`: the options (Prisma 8, version-matched contract.md):**
  1. **`@default(autoincrement())`** (the **DB** fills it): Int ids 1, 2, 3…, assigned by Postgres even for inserts from psql. It keeps `WebsiteTicks.region_id Int` unchanged. It suits a small, mostly fixed list like regions.
  2. **`@onCreate(uuid(7))`** (**Prisma in the app** fills it; best with the native `Uuid` type): consistent with User/Website. But `WebsiteTicks.region_id` must then become `Uuid` too, and raw psql inserts get no id.
  3. **No generator, supply the id myself** (a fixed seed list, 1 = India, 2 = US…): valid only if *every* insert passes `id`. That's what the current code doesn't do.
  - **Not an option:** `now()`, a `DateTime` generator.
  - **Same gap elsewhere:** `WebsiteTicks.id Int @id` has no generator either (P46), so fix it in the same edit.
  - **What I chose (temporary):** option 3, generating the id in the handler as `Math.random()*100000 + Math.random()*Math.random()`. Plan: later make `name` `@unique` and the id a UUID. **Review:**
    - The problem isn't (only) clashes: that expression is a **fraction** (e.g. `48213.0731…`), and `Region.id` is an **Int** column. (Asked as a prediction: what will Postgres/Prisma do with it?)
    - Even rounded, random ints in 0–100 000 collide surprisingly early (the **birthday problem**: a ~50% chance of some clash after ~370 ids).
    - `@default(autoincrement())` is a one-line contract change with zero clash risk.
  - **Result, run 013:** step 20 → **`22P02` invalid_text_representation** (Postgres: "invalid input syntax for type integer"). The fraction was refused by the Int column. The null-id error (23502) is gone, replaced by a wrong-*kind*-of-number error. **Lesson:** the type of a generated value must match the column type, and JS has only one `number` type (floats), so "a number" isn't automatically "an integer".
  - **Run 014 (`Math.floor` added):** the id is now an integer (`42770`), so the 22P02 is gone. The new failure is **`23502` on `name`**, failing row `(42770, null)`. **Cause:** the handler destructures `regionName` from the body, but the client (test 3) sends `name`, so `regionName` is `undefined` → NULL. **The API's field names are a contract between client and server.** A mismatch fails silently without validation (P54's `undefined` lesson again, and an argument for Zod, P50).
  - **Run 015: fixed.** The handler now reads `name`. `POST /region/create` → 200, and the list shows `{id: 3905, name: "claude-region-15"}`. The path took 4 runs (null id → fractional id → field-name mismatch → OK). Each DB error code pointed at the exact next problem (23502 id → 22P02 → 23502 name). Open: return the created object + 201, and decide who may create regions (probably admin-only, since regions are *my* checker locations, not user data).
  - After editing: re-emit the contract, then `db update` (P47). Adding a default is additive. Changing the type `Int` → `Uuid` is destructive (fine while the table is empty).
- **Run 016, the first fully green test 3 (under temporary conventions):** all 20 steps behave correctly. `GET /user` returns A's id with token_a and B's with token_b, region create → 200. Remaining items are polish only: 401 instead of 400, the stack-trace leak, 404 instead of `null` (step 16), region create returning the created object + 201 and being admin-only, the random region id, and signup returning the password.
- **`GET /user/:id` → `GET /user` (2026-11-13).** I removed the unused `:id`, so the route now just returns the caller (from the token). Test 3 steps 5/11 now hit `GET /user` with token_a / token_b.
  - **"If I wanted to show a user by id, how?"** It's two different routes, answering different questions:
    1. **"Who am I?"** is what I have now. The conventional names are **`/me`** or **`/user/me`**. Identity comes **only from the token**, so no id is in the URL.
    2. **"Show user X":** **`/user/:id`** reads **`req.params.id`**, looks up *that* user, and returns **only safe fields** (never `password`; choose the columns). Then decide the **authorization policy**:
       - *private* profiles: allowed only when `req.params.id === req.user_id`, else **404** (or 403);
       - *public* profiles: any logged-in user sees a limited set of fields.
       - Either way, `.first()` returning null → **404**.
  - **Footgun if both exist:** Express matches routes **in registration order**, so `/user/:id` registered *before* `/user/me` captures `"me"` as an id. Register the fixed path (`/user/me`) first.
  - **Connects to:** P9 (`req.params.id` is typed from the route string), P54 (`.first()` null), test 3 step 16 (the same ownership rule as websites).
- **Lesson (authentication ≠ authorization):** the middleware answers "*who* are you?" (authentication). Nothing yet answers "*may you* touch this website?" (authorization). Both are needed.

**Sources:** https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md · https://github.com/panva/jose/blob/main/docs/jwt/verify/interfaces/JWTVerifyOptions.md · https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/ (IDOR / BOLA, the #1 API risk) (`algorithms`, `issuer`, `audience`, `subject`, `requiredClaims`, `clockTolerance`) · https://github.com/panva/jose/blob/main/docs/types/interfaces/JWTPayload.md · https://www.rfc-editor.org/rfc/rfc7519#section-2 (NumericDate = seconds) · https://www.rfc-editor.org/rfc/rfc6750#section-2.1 (`Authorization: Bearer`) · https://expressjs.com/en/5x/api.html#req.get

### P57: JWTs with `jose` (vs `jsonwebtoken`)
**The problem it solves:** HTTP is stateless. After signin, every later request must prove "I'm user X" without sending the password again. A **JWT** is a signed note ("this is user X, valid until T") that the server hands out and later checks. The **signature** means a client can't edit it (change the user id) without the server noticing.

**Anatomy:** `header.payload.signature`, each part base64url-encoded.
- **Header:** `{ "alg": "HS256", "typ": "JWT" }`, saying how it's signed.
- **Payload (claims):** the data. **Readable by anyone** (base64 is encoding, not encryption), so never put a password or secrets in it.
- **Signature:** computed over header + payload with the secret.

**The jose builder, piece by piece:**
- **`setProtectedHeader({ alg })`:** sets the header. "Protected" is JWS vocabulary: the header that's *covered by the signature*. jose makes you state `alg` explicitly. jsonwebtoken silently defaulted to HS256.
- **`alg: 'HS256'`:** HMAC + SHA-256, **symmetric**: the same secret signs and verifies. Asymmetric alternatives (`RS256`, `ES256`, `EdDSA`) sign with a private key and verify with a public key, which is useful when *other* services must verify tokens but must not be able to mint them. For one API, HS256 is fine.
- **Registered claims** (standard names from RFC 7519). jsonwebtoken had them too, as hidden *options* (`expiresIn`, `issuer`, `audience`, `subject`); jose makes them builder methods:
  - `setIssuedAt()` → **`iat`** (when it was made)
  - `setExpirationTime('2h')` → **`exp`** (when it dies; always set this)
  - `setIssuer(...)` → **`iss`** (who made it, e.g. "betteruptime-api")
  - `setAudience(...)` → **`aud`** (who it's *for*). It stops a token minted for service A being accepted by service B.
  - `setSubject(...)` → **`sub`** (**who it's about = the user id**). *This is the one my auth middleware will need.*
  - `iss`/`aud` are optional for a single API, but **if you set them when signing, you must check them when verifying** (`jwtVerify(token, secret, { issuer, audience, algorithms: ['HS256'] })`), or they protect nothing.
- **`{ 'urn:example:claim': true }`:** the README's placeholder custom claim. Replace it with my own (or nothing).
- **`new TextEncoder().encode(secret)`:** jose is built on the **Web Crypto API** (the same in Bun, browsers and edge runtimes), which takes **raw bytes** (`Uint8Array`), not strings. `TextEncoder` turns the string into UTF-8 bytes. jsonwebtoken uses Node's `crypto`, which accepts a string and converts it internally. So it's the same idea, done explicitly.

**Follow-up Qs (2026-11-13):**
- **"Should `{ 'urn:example:claim': true }` become `{user.id}`, so routes get it later?"** **Right goal, wrong place, and invalid syntax.** An object literal needs a key (`{ id: … }`), and `{user.id}` isn't valid. The user id belongs in the **standard `sub` claim** via `setSubject(user.id)`, which every JWT tool understands. The custom-claims object can then be **empty** (`{}`), or hold *extra* non-secret facts (e.g. a role). Later, the auth middleware runs `jwtVerify`, reads **`payload.sub`**, and attaches it to `req` for the routes.
- **"What is `setSubject` exactly?"** It sets the registered claim **`sub`** = "the principal this token is about" (RFC 7519 §4.1.2), as a **string**. My `user.id` is a UUID string, so that fits. It's the JWT equivalent of the user id in `jsonwebtoken`'s `subject` option.
- **"Where am I passing the secret?"** In the **last call of the chain, `.sign(secret)`**. Everything before it only *builds* the token; `.sign` computes the signature with the secret and returns the finished string. At verify time the same secret goes into `jwtVerify(token, secret, { algorithms: ['HS256'] })`.

**Review of my signin code (index.ts:57–71, 2026-11-13):**
`new jose.SignJWT({ 'user_id': user.id }).setProtectedHeader({ alg }).setIssuedAt().setExpirationTime('2h').setSubject(user.id).sign(secret)`
- **"Do I need `setSubject`?"** jose doesn't *require* it. But now the id is in the token **twice** (`user_id` *and* `sub`): two sources of truth, and the middleware has to pick one. **Keep `sub`** (the standard) and pass `{}` as the custom claims.
- **The chain itself is correct:** `alg` set, `iat`, `exp` 2h, signed last.
- **Still the README's public secret** (line 60). It must be replaced.
- **Line 7 `const JWT_SECRET = "secret_key"`** is unused, too short (10 bytes), and hard-coded. Replace it with a value from `.env` (`process.env['JWT_SECRET']`), and **fail at startup** if it's missing (better than `!`, P26).
- **The secret is built inside the handler on every request.** Build it **once** at module level.
- **My own comment (line 57), "make it a function since I'll need it multiple times": right instinct.** Put a small `auth` module in apps/api with *sign(userId)* and *verify(token)*, sharing one secret + `alg`, so signin and the auth middleware can't drift apart.

**My summary: "jose signs the userId through setUser and whatever I give in SignJWT."** **Right idea, wrong name: the method is `setSubject`** (there's no `setUser`). And it's precise to say: the object passed to `new SignJWT({...})` and every `set…` claim (`sub`, `iat`, `exp`, …) are merged into **one payload**, and `.sign()` signs **header + that whole payload** together. So every claim is covered, not just the user id. Signed ≠ hidden: all of it is still readable.

**"32 bytes or 64 hex: different or the same?"** **The same amount of randomness, written two ways.** 1 byte = 2 hex characters, so 32 random bytes = a 64-character hex string. HS256 wants a key of **≥ 256 bits = 32 bytes** of randomness (RFC 7518 §3.2). If the 64-char hex string goes through `TextEncoder`, the key is 64 ASCII bytes carrying 32 bytes of entropy, which is fine. Generate it with `openssl rand -hex 32` (Git Bash has openssl) or Bun's `crypto.randomBytes(32).toString('hex')`. Generate it myself; don't paste it into chat, a log or git.

**Gotchas / would have missed:**
- **The secret in the paste is jose's public README example.** Anyone can sign tokens with it. Generate my own (≥ 32 random bytes, e.g. 64 hex chars from a random generator), put it in `apps/api/.env` (`JWT_SECRET`), read it from `process.env`, and never commit it.
- **Verify with an `algorithms` allow-list.** The classic JWT attacks are "alg confusion" / `alg: none`. jose is strict, but being explicit costs nothing.
- **A JWT can't be revoked before `exp`** (stateless). Keep `exp` short. Logout = the client throws the token away. Real revocation needs server-side state (a denylist or sessions).
- **Why jose:** zero dependencies, ESM, Web Crypto (works the same on Bun), actively maintained. jsonwebtoken is Node-crypto based and callback/CommonJS era.

**Connects to:** P26 (`.env`, `process.env['X']!`), P56 (the auth middleware will verify the token and put `sub` on `req`), P54 (signin is where the token gets signed).

**Sources:** https://github.com/panva/jose · https://github.com/panva/jose/blob/main/docs/jwt/sign/classes/SignJWT.md · https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md · https://www.rfc-editor.org/rfc/rfc7519#section-4.1 (registered claims) · https://www.rfc-editor.org/rfc/rfc7515 (JWS, protected header) · https://www.rfc-editor.org/rfc/rfc7518#section-3.1 (alg values) · https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder · https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API · https://jwt.io (decode a token to see that the payload is readable) · https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html (JWT pitfalls; the concepts apply beyond Java) · https://www.rfc-editor.org/rfc/rfc7518#section-3.2 (HS256 key ≥ 256 bits) · https://docs.openssl.org/master/man1/openssl-rand/ · https://bun.com/docs/runtime/nodejs-compat (node:crypto `randomBytes` in Bun)

### P56: where Express middleware lives
**The rule of thumb:** code lives with the thing that uses it.
- **Express middleware → `apps/api`.** It works on `req`/`res`/`next`, so it's part of the API app. It doesn't go in `packages/`: that's for code **more than one app** shares (the db client, configs, later the Zod schemas).
- **Prisma middleware → `packages/db-prisma`.** My `queryLogger` hooks the DB client, not HTTP, so it's correct where it is (db.ts). There are two kinds of "middleware" with the same name: Express's runs per **request**, Prisma's per **query**.

**Inside `apps/api` (the P43 shapes):**
- **Now (one or two middlewares):** a single `middleware.ts` next to `index.ts` is fine.
- **When there are several:** a `middleware/` folder, one file per middleware (auth, error handler, request logger).
- **Feature layout:** cross-cutting middleware (auth, error handler, logging) stays in the shared `middleware/` folder at the api level. Middleware that only one feature uses (e.g. "does this website belong to the logged-in user?") can sit inside that feature's folder (`website/`).
- **Optional `src/`:** many apps put code under `apps/api/src/`, like db-prisma's `src/prisma/`. It's a convention, not required. If adopted, check that tsconfig's `include` still covers it.

**Sources:** P43 entry · https://expressjs.com/en/guide/using-middleware.html · https://expressjs.com/en/guide/writing-middleware.html · https://turborepo.com/docs/crafting-your-repository/structuring-a-repository (apps vs packages) · installed `skills/prisma-8/references/runtime.md` (Prisma middleware)

### P55: seeing the SQL: `runtime.md`, `db.query(plan)`, and my logger middleware
**"What is runtime.md?"** It's one of the reference docs Prisma 8 ships **inside the installed package** (the "agent skills" from P31), matched to the exact version. Path: `packages/db-prisma/node_modules/@prisma/orm-postgres/skills/prisma-8/references/runtime.md`. Its siblings are `contract.md`, `queries.md`, `migrations.md` and `debug.md`.

**"Can't I build the plan, log it, then run it with `db.query(plan)`?"** Yes, but only for queries written with the **SQL builder** (`db.sql…`): build the plan → `db.toSql(plan)` (log it, no DB needed) → `db.query(plan)` (run it). **ORM calls** (`db.orm.public.User.first(...)`) build *and* run their plan internally, so there's no plan object to hold. Rewriting the signin in the SQL builder just to log it means debugging a *different* query from the buggy one. For ORM calls, **middleware** (or the Postgres-side log) is the way to see the SQL.
**Where my idea came from (checked 2026-11-12):** the Prisma docs page "SQL query builder" describes exactly this flow: a `db.sql.<table>…` chain → **`.build()`** → a `plan` ("nothing touches the database until you pass that object to `db.query(...)` or `db.execute(...)`") → **`db.toSql(plan)`** returns `{ sql, params }` and "runs nothing and needs no database". `db.query(plan)` = rows (SELECT, or writes with `returning()`); `db.execute(plan)` = `{ affectedRows }`. A built plan can be run more than once. **My reading of the page was right**, but the page is about the SQL builder (`db.sql`, keyed by **table** name). It never says `db.orm` calls (keyed by **model** name) hand you a plan, and my signin uses `db.orm`. So: right tool, wrong API surface for this bug. If signin were rewritten in the SQL builder, `toSql` would show its SQL. That's a legitimate choice, but then it's a different query from the one that has the bug.

**`db.orm` vs `db.sql`: the two "query lanes" on the same `db` (version-matched `queries.md` / `queries-postgres.md`):**
| | `db.orm.public.User` (ORM) | `db.sql.public.<table>` (SQL builder) |
|---|---|---|
| Addressed by | **model** name (PascalCase, from the contract) | **table** (storage) name |
| Verbs | model verbs: `create`, `first`, `all`, `update`, `delete`, `aggregate`, `.include(...)` for relations | SQL verbs: `select`, **`insert`** (takes an **array** of rows), `update`, `delete`, plus `.returning(...)` |
| Runs | the terminal verb runs immediately; no plan object handed to you | `.build()` → **plan** → `db.query(plan)` (rows) / `db.execute(plan)` (`{ affectedRows }`); `db.toSql(plan)` to see the SQL |
| Filters | object shorthand like `{ username, password }` (that's where `undefined` silently vanished, P54) | explicit predicates: `.where((f, fns) => fns.eq(f.id, id))` |
| Use for | default lane: CRUD + relations | what the ORM can't express: JOINs, computed columns, window functions, set operations |
The docs' rule: **"Reach for the ORM first; drop to `db.sql` when the ORM can't express the shape."** The lane choice is per query, not per app. **Unverified, so check before switching a create to `insert`:** whether the SQL builder fills `@onCreate` generators (`uuid(7)`, `now()`) the way the ORM does. If it doesn't, an `insert` without an id fails NOT NULL.
**My prediction for the logger:** "hopefully the queries of SQL will appear on my terminal." **Observed (run 004): nothing appeared → wrong.** Then I asked: "why isn't my logger working?" (By then `familyId: "sql"` had been added; the hook body was unchanged.) **Hint 1 given (a pointer):** read the hook line by line. Which line sends anything to the terminal? (`ctx.state(...)` is per-statement *storage*, a scratchpad that other hooks of the same statement can read later. It isn't output.)
**Resolved:** I added `console.log(plan.sql)` in `beforeEncode`. **Right fix.** My reading of the docs' example: "`activityEnded` is another event, after the statement ended. It logs `ctx.state(...)` because it doesn't have access to the plan object, which has probably been deallocated, so in `beforeEncode` we put the SQL on the ctx state." Graded:
- **Right:** `activityEnded(activity, result, ctx)` isn't *given* the plan, so the SQL is stashed in `ctx.state` in `beforeEncode` and read back later. Both hooks get the **same `ctx`** for one statement. That's the whole point of `ctx.state`.
- **Wrong reason:** it isn't "deallocated". JS frees nothing that's still referenced. It's the **hook signature**: the runtime just doesn't pass the plan to that hook.
- **The part I hadn't said: why have `activityEnded` at all?** It knows what's only known *after* running: `result.latencyMs`, `result.outcome` (succeeded/failed), row count. `beforeEncode` can't know how long a query took. A slow-query warning needs both: the SQL from *before*, the time from *after*.
- **"Can I comment out the ctx line?"** Yes, if all I want is to print SQL; nothing reads it now. Keep it (plus an `activityEnded`) when I want SQL + latency on one line (the P55 to-do).
**Gotchas:** `plan.sql` shows placeholders (`$1`, `$2`), not the values. The values are `beforeEncode`'s 3rd argument, `params`. Logging those = logging passwords, so dev only. And `console.log` in a hook runs for **every** statement, in prod too. Gate it later (env var).

**Jargon clash:** a Prisma 8 **plan** = the compiled query (SQL text + params) that's about to be sent. A Postgres **query plan** = `EXPLAIN` output: *how* Postgres will execute it (index scan vs sequential scan). Different things with the same word.

**Review of my `queryLogger` in db.ts (2026-11-12):**
- The shape is right (`name`, `beforeEncode(plan, ctx)`, `ctx.state(symbol)`, registered in `middleware: [...]`), copied from the slow-query example.
- **It never prints anything:** it saves `plan.sql` into `ctx.state` and stops. In the docs' example, the saving is half of it; the *printing* happens in `activityEnded` (only when slow). (Asked as a prediction: what does it print during test 2?)
- **Unused auto-imports to remove:** `warn` (node:console), `createSqlTextSources` + `SqlMigrationRunnerFailure` (`family/control`, the **control plane** = migration code, not runtime code), and `before` from **`node:test`** (the test runner, in production code). Editor auto-import accidents.

**Sources:** https://www.prisma.io/docs/orm/reference/sql-query-builder (`build()`, `db.query`, `db.execute`, `db.toSql`) · installed `skills/prisma-8/references/queries.md` (`db.toSql`, `db.query(plan)`), `references/runtime.md` (middleware, `beforeEncode`, `activityEnded`, `orm-call`) · https://www.postgresql.org/docs/current/sql-explain.html (the *other* kind of query plan)

### P54: signin without a password succeeds (auth bypass found by test 2)
**What happened (run 003):** `POST /signin` with body `{"username":"claude_test_3"}` (no `password` key) → **200 with the full user object, password included.** Wrong password / unknown user → 200 `{"user_id":null,…}`.

**The problem:** the handler looks the user up with `first({ username, password })`. With no `password` in the body, `password` is `undefined`. **Why that matched:** the question asked was why a filter with `password: undefined` found the user. **My answer:** "the user field was enough for the ORM to match something with the database." **Right.** A key whose value is `undefined` is treated as "not specified" and left out of the `WHERE`, so the query was effectively `WHERE username = $1 LIMIT 1`. Prisma ≤7 documents this rule (`undefined` = "do nothing", `null` = `IS NULL`). For Prisma 8 it's **inferred from the behaviour**, to be confirmed by reading the actual SQL (below).
**Confirmed (run 005, my logger's output):** step 2 → `WHERE ("User"."username" = $1 AND "User"."password" = $2) LIMIT 1`; step 4 → `WHERE "User"."username" = $1 LIMIT 1`. The password condition simply disappears when the value is `undefined`. **Bonus evidence from the same log:** the signup `INSERT` lists `"createdAt", "id"` as `$3, $4`, so the app generates them (`@onCreate` = client-side, P45). And `RETURNING … "User"."password"` explains why the password ends up in the response. **My fix (run 006, all 3 bad-credential steps → 409):** `if (!password) throw`, then `first({ username })` (**username only**), then `if (!user || user.password !== password) throw`, and the response returns only `user.id`. **This is the right design** (look up by username, compare in code), the same shape the hashed version will have (`Bun.password.verify` replacing `!==`). Review:
- **`"error":{}` in the response:** `JSON.stringify(new Error("…"))` is `{}`, because an Error's `message`/`stack` are **non-enumerable** properties. So my messages never reach the client. That's harmless here, but `error: e` would leak a *DB* error's enumerable fields. Send `e.message` deliberately, or a fixed message.
- **Same bug class, other field (not yet tested):** with **no `username`** in the body, `first({ username: undefined })` → `SELECT … LIMIT 1` with **no WHERE** → the *first user in the table*. Then, if the sent password matches that user's, I'm signed in as them. Guard every required field, not just the password (Zod, P50, does this for all fields at once).
- Plaintext `!==` comparison and plaintext storage remain until hashing.
**My prediction for "only a password sent":** "it's rejected, I guess." Pending: added to test 2 as **step 5** (`{"password":"pass123"}`).

**"How do I declare the error so my message reaches the client?"** (Mode B)
- **Why it's `{}` now:** `res.json` uses `JSON.stringify`, which copies only an object's **own *enumerable*** properties. `message` and `stack` on an Error are non-enumerable, so they're skipped.
- **Minimal way:** send the message *explicitly*. In the `catch`, `e` is typed **`unknown`** (strict mode's `useUnknownInCatchVariables`), so narrow it first with **`e instanceof Error`**, then send `e.message` as a field. Anything that isn't an Error gets a fixed fallback message.
- **The way that also solves status codes later (the P48/P49 to-do):** a **custom error class** that `extends Error`, whose constructor takes a status *and* a message and calls `super(message)`. Throw it with the code you mean (401, 400…). The catch / central handler checks `instanceof` that class and uses its status + message. Everything else → 500. Bonus fact: Express's *default* error handler already reads `err.status` / `err.statusCode` for the response code.
- **Caution:** only send messages *I wrote*. A DB error's `message` can contain table/column/SQL detail, so fixed messages for unknown errors.
- **What I did: `(error as Error).message`** (as a `meme` field). Run 008: messages now reach the client (`"Invalid Creds! …"`, `"enter password pls"`). **It works, but `as Error` is a *type assertion*:** a compile-time "trust me" with **no runtime check**, the same family as `!` on `DATABASE_URL` (P26). If something that isn't an Error is thrown (a string, or a library's plain object), `.message` is `undefined` (the template literal prints "undefined"). If `null`/`undefined` is thrown, reading `.message` **throws inside the catch** → 500. `instanceof` is the runtime check that makes the assertion true.
- **"Do I have to check in every endpoint?" No:** the other way is **one central error handler**. Endpoints don't catch (or just throw a custom error). Express 5 forwards thrown/rejected errors to the 4-param handler registered last, and **that one place** does the `instanceof` checks and picks status + message. The per-endpoint `try/catch` disappears. Added to To do.
- **Run 007 lesson:** the first rerun still showed `"error":{}` because the server hadn't been restarted. Bun doesn't reload on save. **`bun --watch`** restarts the process on file change, and `--hot` reloads in place (and is why the `globalThis` db singleton matters, P42).
- **My step 5 prediction ("only a password → rejected"):** **right outcome, reason unconfirmed.** It got "Invalid Creds!", not "enter password pls", so the lookup ran with `username: undefined`. If the SQL had no `WHERE`, it was rejected only because the first row's password isn't `pass123`: **rejected by luck, not by design**. Check the step 5 SQL in the server terminal.
- **Puzzle (run 008):** "5 requests but only 4 query logs. If step 5 failed before querying, it wouldn't have said Invalid Creds." **That reasoning is right:** step 5 *did* query. So the missing log belongs to a different step. **Hint given:** which request's response message comes from a check that runs *before* `db.orm…first()`? **Resolved by the logs:** the 4 statements = step 1 (INSERT), step 2 and step 3 (`WHERE username = $1`), and **step 5: `SELECT … FROM "public"."User" LIMIT 1`, with no WHERE at all**. Step 4 never queries (`if (!password) throw` runs first). **My step 5 prediction graded: right outcome, wrong reason. It was rejected by luck.** Postgres returned an arbitrary first row (no `WHERE`, no `ORDER BY` = no guaranteed order) whose password isn't `pass123`. The same bug class as P54, on the other field, and it's still open.
**Challenge:** "every password is pass123 anyway, so I think you are wrong." **The logic is right, the premise probably isn't.** *If* every row had `pass123`, step 5 (`SELECT … LIMIT 1`, then compare with `pass123`) would have **signed in (200)**. It got 409 "Invalid Creds!" after a query that ran, so the row returned **must** have a different password (an empty table is ruled out: users exist). So not every row is `pass123`. **Likely culprit:** the old, now-commented-out `/weee` route created `username: "test1@test.com", password: "test1"`. If it was hit after the schema change, that row exists and was probably inserted first. **To confirm:** psql → `SELECT username, password FROM "User";`. **Confirmed by me in psql:** the first row is the old `test1` user with **no password set**, so `LIMIT 1` returned it and the comparison failed. Rejected by luck, as suspected.
**Fixed (run 009):** the guard now checks **both** fields ("enter username/password pls"). Step 5 is now rejected **before any query**, by design. Expected log: 3 statements for 5 requests (steps 4 and 5 never query). **Confirmed by me: 3 SQL lines.** P54's auth bypass is closed for both missing-field cases. Hashing is deferred (in To do).
**Look back (transferable):** counting log lines against requests is a cheap way to see which code path each request took. "Which request didn't reach the DB?" answered a question the HTTP responses couldn't.
- **2nd ask ("didn't get your solution"):** re-explained step by step in prose (envelope analogy: `res.json(e)` photocopies the envelope, not the letter inside). Still no syntax. The 3rd ask gets the exact syntax.
Sources: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify (only enumerable own properties) · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types · https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables · https://expressjs.com/en/guide/error-handling.html (`err.status` / `err.statusCode`)
**Look back (transferable):** when an ORM "does something weird", read the SQL it sent before theorising. One log line settled what three guesses couldn't.

**How to see the SQL Prisma 8 sends (version-matched docs):**
1. **Database side, no code (quickest):** set Postgres's **`log_statement`** to `'all'` (`ALTER SYSTEM SET …` + `SELECT pg_reload_conf();` in psql), then watch **`docker logs -f rocky_road`**. Every statement from *any* client appears, with its bind parameters. ⚠️ **The log then contains the data, passwords included.** Dev only, and set it back to `'none'` afterwards.
2. **App side, permanent dev tool:** a **middleware** passed to `postgres({ …, middleware: [...] })` in db.ts. The `beforeEncode(plan, ctx, params)` hook sees `plan.sql` for every statement, ORM calls included (an ORM call = an `orm-call` activity with its statements beneath it). The canonical example is the "slow-query warning" in `references/runtime.md` § *Workflow: Custom middleware (query log, slow-query warning)*. The type is `SqlMiddleware` from `@prisma/orm-postgres/family-runtime`.
3. **`db.toSql(plan)`** → `{ sql, params }` without running anything. But it only works on **SQL-builder plans** (`db.sql…`), **not** on `db.orm…first()` calls, so it can't show this bug.
- No `.explain()` in Prisma 8. Use a raw `EXPLAIN ANALYZE` (`db.raw.sql`) for query plans.
**Prediction asked:** before turning the log on, write down the exact `WHERE` clause expected for step 4.

**Two bugs, separate:**
1. **"No match" isn't an error.** `.first()` returns `null` and doesn't throw, so the code must check for `null` itself and reject (401; 409 under the current temporary convention). A `catch` can't catch something that never throws.
2. **The missing field silently widens the query** (step 4). Rejecting missing/invalid input *before* the query (Zod, P50) closes it.

**Gotchas / would have missed:** this is how real auth bypasses happen: "optional" filter values, not broken crypto. And the proper design (hash with bcrypt/argon2, look up **by username only**, then compare the hash in code) also removes this bug class, because the password is never part of the query.

**Sources:** run file `claude_tests/run-003-test-2.md` · https://bun.com/docs/api/hashing (`Bun.password.hash` / `verify`, argon2/bcrypt built in) · https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html · https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html · installed `@prisma/orm-postgres` → `skills/prisma-8/references/runtime.md` (Custom middleware, `beforeEncode`, `orm-call` activities), `references/queries.md` (`db.toSql`), `references/debug.md` (no `.explain()`) · https://www.postgresql.org/docs/current/runtime-config-logging.html#GUC-LOG-STATEMENT · https://www.postgresql.org/docs/current/sql-altersystem.html · https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/null-and-undefined (Prisma ≤7 `undefined` vs `null` rule)

### P53: body-parsing middleware (`express.json()`, `express.urlencoded()`)
**The problem it solves:** a request body arrives as a **stream of raw bytes**. Express doesn't read or parse it unless told to, so in Express 5 `req.body` stays **`undefined`** (Express 4 defaulted it to `{}`, so old tutorials hide the problem). That's exactly P52's `Cannot destructure property 'username' from null or undefined value`.

**What I added (index.ts, lines 9–10, before the routes):**
- **`app.use(express.json())`** reads the body **only when `Content-Type` is `application/json`**, runs `JSON.parse` on it, and puts the result on `req.body`. This is what my API needs: frontends and curl send JSON.
- **`app.use(express.urlencoded({ extended: true }))`** parses **`application/x-www-form-urlencoded`**, the format a plain HTML `<form method="post">` sends (`username=rocky&password=x`). `extended: true` uses the `qs` library, which allows nested objects (`user[name]=rocky` → `{ user: { name: "rocky" } }`). `false` gives flat key/value pairs only (the Express 5 default is `false`). **Do I need it?** Only if HTML forms post straight to the API. A JSON-only API can drop it. It's harmless to keep, but it's one more input format to think about.
- **`app.use(...)` order matters:** middleware runs in the order it's registered. A route registered *above* these lines never sees a parsed body.

**Gotchas / would have missed:**
- **Wrong or missing `Content-Type` → the parser skips the body silently → `req.body` is `undefined` again** → the same TypeError. That's why validation (Zod, P50) still matters: never trust that the body exists.
- **Malformed JSON** (e.g. a trailing comma) → `express.json()` passes a **400** error to the error handler. Without my own handler, the default one again sends an HTML stack trace (P49).
- **Size limit:** the default is **100kb**. A bigger body → **413 Payload Too Large**. It's adjustable with the `limit` option.
- History: these used to be the separate `body-parser` package. Since Express 4.16 they're built in as `express.json` / `express.urlencoded` (still powered by body-parser).

**Confirmed (run 002 of test 1, 2026-11-12):** after adding the parsers and restarting, all 4 steps went from 500 to 200, and a user + website were created. New observations: the signup and signin responses include the **plaintext password**; the response key `user_id` holds the whole user object, not the id; signup returns 200, not 201. Still untested: signin with a wrong password (`.first()` → null → probably 200 with `user_id: null`).
**My prediction (before test 2):** "it would not return the correct thing because the password is not defined; it would throw an error." **Graded after run 003: wrong.** Nothing threw. Wrong password and unknown user both → **200** `{"user_id":null,…}`: `.first()` returns `null` for "no match"; it doesn't throw. "Not found" is a normal result, not an error. So the 409 catch never runs. **And no password field → 200 with the full user** (P54).

**Connects to:** P43 (middleware/`app.use`), P49 (400 vs 500, error handler), P50 (Zod validates *after* parsing: parse = bytes → object, validate = is the object the right shape?), P52 (the failure it fixes).

**Sources:** https://expressjs.com/en/5x/api.html#express.json · https://expressjs.com/en/5x/api.html#express.urlencoded · https://expressjs.com/en/5x/api.html#req.body · https://expressjs.com/en/guide/migrating-5.html (req.body no longer defaults to `{}`; urlencoded `extended` defaults to false) · https://expressjs.com/en/guide/using-middleware.html · https://github.com/expressjs/body-parser (limit, type, errors) · https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/POST (form encodings)

### P52: first manual run of the endpoints (2026-11-12)
**Decision:** tests come after streams/workers. Basic CRUD is tested by hand for now: Claude calls the endpoints with `curl` and reports exactly what was sent, and I check the DB. Formalised as the `claude-manual-tester` skill: I say "test N", definitions are in `d:\cohort\betteruptime\claude_tests\tests.md`, and each run is saved as `claude_tests/run-NNN-test-N.md` (this run = run-001-test-1).

**What was called → what came back:**
| # | Request | Result |
|---|---|---|
| 0 | `GET /region/list` (to see if the server was up) | **no response, timed out**: the handler is empty and never calls `res.*`, so the request hangs forever |
| 1 | `POST /signup` `{"username":"claude_test_1","password":"pass123"}` | **500**, HTML page with a stack trace: `TypeError: Cannot destructure property 'username' from null or undefined value` at index.ts:13 |
| 2 | `POST /signin` (same body) | **500** (same cause) |
| 3 | `POST /user/website/create` `{"url":"https://example.com","user_id":"none-yet"}` | **500**: `Cannot destructure property 'url'…` |
| 4 | `GET /user/website/does-not-exist` | **200** `{"website":null}` |

**Observations to work through:**
- 1–3: `req.body` is undefined, and the destructuring sits **outside** the `try`, so the 409/400 catch never runs. Express 5's default handler answers with a 500 **and the full stack trace (file paths) in the response**, which is the P49 leak, seen live. (Cause: Mode A, in progress.)
- 4: "not found" comes back as **200 with null**. It should be **404**. `.first()` doesn't throw when nothing matches; it returns null.
- Line 105 (not triggered yet): `res.json(400).json(...)` sends `400` *as the body* with status 200, then tries to respond again ("headers already sent"). It should be `res.status(400).json(...)`.
- An empty handler (`/region/list`, `/region/create`, `/user/:id`) hangs the client until it times out. Every path must end in a response (or `next(err)`).

### P51: getting out of manual Postman testing
**The problem it solves:** clicking through Postman after every change is slow and boring, and it **doesn't stick**. Next week, after a refactor, you have to click everything again, and you'll forget the edge cases (duplicate username, missing field, DB down).

**Options, from least to most automated:**
1. **Requests as text files in the repo:** `.http` files. Write `POST http://localhost:3000/signup` + headers + a JSON body in a file, and click "Send Request" above it. Tools: the **REST Client** VS Code extension, **httpyac** (also runs them from the CLI), and JetBrains' HTTP Client uses the same format. **Bruno** = a Postman-like app whose collections are plain files in git. Win: no retyping, and they're versioned next to the code. Still checked by eye.
2. **Automated tests from the start (skip the manual step):** **`bun test`** is built into Bun (Jest-style `describe`/`test`/`expect`, no install). Send real HTTP requests to the app and **assert** the status + body (`expect(res.status).toBe(409)`). Two ways to reach the app:
   - **supertest:** pass it the Express `app` directly, with no port needed;
   - or start the app on port `0` (the OS picks a free port) in `beforeAll` and use `fetch`.
   Either way, **index.ts must export `app` separately from `app.listen`** (the P43 "separate app from listen" point). Otherwise importing it in a test starts the real server on port 3000.
3. **Later:** generate an OpenAPI spec from the Zod schemas (P50) to get clickable docs (Scalar / Swagger UI) for free.

**Gotchas / would have missed:**
- **Tests that hit the real DB pollute it** (the second run fails with 409, because `test1` already exists). Use a **separate test database** (a second DB in the same Postgres container + its own `DATABASE_URL`), clean tables between tests, or generate unique usernames per run.
- A test is only as good as its assertions. Test the **unhappy paths** (409, 400, 500) as well as the happy one, since those are what manual testing skips.

**Connects to:** P43 (app vs listen), P48/P49 (each status code becomes one test case), P26 (`.env` per environment, here for the test DB).

**Sources:** https://bun.com/docs/test/writing (bun test) · https://bun.com/docs/test/lifecycle (`beforeAll`/`afterAll`) · https://github.com/ladjs/supertest · https://marketplace.visualstudio.com/items?itemName=humao.rest-client · https://httpyac.github.io · https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html · https://www.usebruno.com · https://scalar.com

### P49: handling errors other than the one you expect
**The problem it solves:** a `catch` that answers "409 username taken" for *every* error lies to the user. When the DB is down, a bug throws, or a *different* unique field clashes (email), the user is told to pick another username. You need to tell **expected** errors from **unexpected** ones.

**How it works: two buckets:**
1. **Expected (you can name them, and the client can do something about them) → 4xx with a specific message:** 400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict.
2. **Unexpected (DB down, a bug, a timeout) → 500 with a generic message** ("Something went wrong"). Log the real error on the server. The client can't fix it, and the details are for *you*, not them.

**The rule in the handler:** catch → check whether it's **exactly** the error you know (a unique violation *on username*) → if yes, answer 409. **If not, don't swallow it**: rethrow / pass it on. Express 5 forwards an error thrown in an async handler to the error-handling middleware. One **central error handler** (4 params, registered last, P43) turns everything unknown into a 500 and logs it.

**How to recognise "unique violation on username" in Prisma 8 (version-matched docs):** driver errors surface as `SqlQueryError` with `sqlState` (Postgres SQLSTATE: **`23505` = unique violation**, `23503` = foreign-key violation) plus `constraint`, `table`, `column`. Route on `sqlState` and on the column/constraint, so you can tell a username clash from an email clash. The docs say these are "typically wrapped by middleware before reaching the user", so **check what the ORM's `create` actually throws by logging it once** before relying on the field names.

**Gotchas / would have missed:**
- **A catch-all 409** (`catch → 409`) is the classic bug: the DB is down, and the user reads "username taken".
- **Don't send `err.message` / the stack to the client.** It can leak table names, SQL and file paths. Express's *default* error handler includes the stack trace in the response unless `NODE_ENV=production`. Write your own handler.
- **Two unique fields (username, email) = two different 409 messages.** That's why you check *which* constraint failed, not just "some unique error".

**Prediction (catch-all 409 + `docker stop rocky_road`):** my answer: "if the DB is not up, it would also return a 409". **Right** about what the user sees: "username taken" for a username that may be free. **Skipped:** what *I* learn as the developer. **Nothing.** The real error (a connection failure) is swallowed and never logged, so from the outside "DB down" and "name taken" look identical. Likely extra symptom: the request may **hang for a while** first (waiting for the connection to time out), then return 409. Not yet observed; to confirm, run it.
**Next question asked:** in my own words, which conditions must *all* be true before the catch returns 409?
**My answer:** "the database connection should be up, but how do I check whether it is?" **Half right, wrong direction.** You don't check the connection *before* deciding. You check the **error's identity**. A unique violation (`23505`) is an answer *from Postgres*, so if you got one, the DB was up by definition. Checking "is the DB up?" first would add a query to every request, and it's still a race (the DB can go down between the check and the insert). **Unlocking idea:** an error is evidence. Ask "what is this error?", not "what was the world like?".
**My second answer:** "user creation conflict only". **Right idea, too vague to code.** "Conflict" covers *any* unique clash on User, including email, which needs a different message. The precise conditions (all must hold):
1. it's a **unique violation**: `sqlState === '23505'` (or whatever the wrapped ORM error exposes; log it once to see);
2. the clash is on **username**: the error's `column`/`constraint` points at username, not email.
→ 409 "username taken". Email clash → its own 409 message. **Anything else → re-throw → central handler → 500 + log.**
**Where checking the connection *does* belong:** a **health-check endpoint** (e.g. `GET /health` runs a trivial query like `SELECT 1` and returns 200, or 503 if it fails), used by monitors, load balancers and Docker/Kubernetes. It's exactly the kind of URL betteruptime itself will poll. By hand: `docker ps` (is the container running?), psql in, or `prisma db verify`.

**Connects to:** P41 (Express 5 forwards async errors), P43 (error handler last, 4 params), P48 (409 vs 500).

**Sources:** installed `@prisma/orm-postgres@8.0.0-rc.23` → `skills/prisma-8/references/debug.md` (SQL driver errors, `SqlQueryError`, `sqlState`) · https://www.postgresql.org/docs/current/errcodes-appendix.html · https://expressjs.com/en/guide/error-handling.html (async errors in Express 5, default handler and NODE_ENV) · https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html

### P48: status code for a duplicate username at signup
**The problem it solves:** the client (the frontend) needs to tell "you sent garbage" from "this name is taken, pick another" from "server broke", so it can show the right message. The status code is that signal. The body carries the human-readable detail.

**Answer: `409 Conflict`.** "The request conflicts with the current state of the resource": valid input, but it collides with existing data.
- `400 Bad Request` = the request itself is malformed or invalid (missing field, password too short). It's valid no matter what's in the DB.
- `422 Unprocessable Content` = well-formed but semantically invalid. Some APIs use it for validation errors. Teams differ; 409 is the common choice for "already exists".
- **Not** `500`: an uncaught unique-constraint error from the DB will turn into a 500 by default (Express's default error handler). That's the usual first-time bug.
- Success = `201 Created` (a new user resource exists), not 200.

**Gotchas / would have missed:**
- **Race condition (check-then-insert):** "find user by username → if none, create" has a gap. Two signups at the same moment both see "none", and both try to insert. The real guard is the DB's **unique constraint** (`username String @unique`). Catch its error on create and map it to 409. A pre-check is only a nicer message, not the guarantee.
- **Account enumeration:** a 409 tells anyone "this account exists". Fine for usernames (they're public anyway). For *emails* it leaks who is signed up, so some apps answer the same way either way ("check your inbox").
- My current contract has `User` commented out. The constraint only exists once the model is back with `@unique` on `username`.

**Connects to:** P33/P47 (constraints live in the DB, not in my code), Express 5 async errors (P41: a thrown error goes to the error handler, which defaults to 500).

**Sources:** https://www.rfc-editor.org/rfc/rfc9110#name-409-conflict · https://www.rfc-editor.org/rfc/rfc9110#name-400-bad-request · https://www.rfc-editor.org/rfc/rfc9110#name-422-unprocessable-content · https://www.rfc-editor.org/rfc/rfc9110#name-201-created · https://www.postgresql.org/docs/current/errcodes-appendix.html (23505 unique_violation) · https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (account enumeration)

### P47: applying an emitted contract to the DB
**The problem it solves:** emitting only updates `contract.json`/`contract.d.ts` (the description). The live Postgres still has the old tables (`User`, `Page`) and none of the new ones.

**What my `migrations/` folder actually shows:** `app/refs/db.json` + `snapshots/<hash>/`, and **no** `migrations/app/<timestamp>_<name>/` packages. So every change so far went through `db init` / `db update`, which record the DB's current contract in the `db` ref and snapshots. I've never written a migration package.

**The two paths (version-matched docs):**
1. **`db update`:** diffs the emitted contract against the live DB and applies it. It writes no migration package. `--dry-run` previews. The docs say: use it on any DB whose history needn't be kept (local/dev/staging), never on production.
2. **`migration plan` → `db migrate`:** `plan` writes a package to `migrations/app/<YYYYMMDDTHHMM>_<slug>/` (`migration.ts`, `ops.json`, `migration.json`), diffing from `--from`, else the **`db` ref**, else an empty DB. `db migrate` applies all pending packages in **one transaction** on Postgres (any failure rolls back everything, and the marker stays put).

**For this change:** it's a local dev DB with no deploy yet, so `db update` is the simple choice. Because `plan` chains from the `db` ref, switching to migrations later (before deploying) should start cleanly from wherever `db update` left off.

**Data-loss questions:** I commented out `User` and `Page`, so the plan **drops two tables**. The planner can't tell "deleted" from "renamed", so it asks once per subject. In a terminal you type `delete` or `rename <subject>:<new name>`, or pass `--delete User --delete Page` up front. `--yes` does **not** answer these questions (it fails with `CLI.CONSENT_REQUIRED`). Don't reach for `--delete` by reflex: a rename keeps the rows.

**Gotchas:**
- Run it from `packages/db-prisma`, where `prisma.config.ts` and `.env` are (P26).
- Fix the schema *before* applying (`WebsiteTicks.id` has no generator, ticks have no timestamp, P46). Otherwise you'll pay for a second round of changes.
- Check afterwards: `\dt` in psql and `prisma db verify` (exit 4 = marker mismatch).

**Sources:** installed `@prisma/orm-postgres@8.0.0-rc.23` → `skills/prisma-8/references/migrations.md` (Key Concepts; "Answer the data-loss questions") and `references/debug.md` (error codes) · my `packages/db-prisma/migrations/` listing

### P46: Region and WebsiteTicks (the uptime schema)
**Schema (from the video):** `Website` (id uuid, url, timeAdded, `ticks WebsiteTicks[]`), `Region` (id Int, name, `ticks WebsiteTicks[]`), `WebsiteTicks` (id Int, response_time_in_ms, status enum up/down/unknown, `region_id` → Region, `website_id` → Website).

**How it connects:** a re-run of P40, twice. A **tick** = one check result ("checked website W from region R: up, 120 ms"). Each tick belongs to exactly one website **and** one region, so `WebsiteTicks` is the "many" side of **two** one-to-many relations and holds **both** foreign keys (`website_id`, `region_id`). `Region.ticks` and `Website.ticks` are virtual list fields (not columns). Indirectly, Website ↔ Region is many-to-many *through* the ticks table.

**Why Region exists:** the question asked was: if every check runs from one server in one country and the site is down only for visitors elsewhere, what does the monitor report? **My answer:** "you ask different servers around the world of your own to hit the site and check if it's up or not." **Right** on the mechanism. Each region is a checker (worker) I run in that location, and every tick records which one made it. The part I skipped is the *why*. With a single checker, the monitor is wrong in two directions:
- **False all-clear:** the site is down only in the US (a CDN edge, DNS or routing issue there), but the India checker reports "up".
- **False alarm:** the India checker's *own* network has a problem, so *every* site looks down, though none are.

Several regions let you tell "the site is down" (most regions agree) from "one path to it is broken" (one region disagrees). That's probably also why `status` has `unknown` (my guess, not from the video): a checker that couldn't decide, for example because it timed out on its own side, shouldn't count as a vote for "down".
**Next question asked:** given per-region ticks, when should betteruptime alert the user that a site is down?

**Gotchas / would have missed (review of my schema):**
- `WebsiteTicks.id Int @id` has **no generator**, so every insert must invent an id itself. Give it `@onCreate(uuid(7))` (with a `Uuid` or String type) or `@default(autoincrement())`.
- **Ticks have no timestamp.** Without one, you can't answer "was it up at 3 pm?" or draw an uptime graph.
- `Region.id Int @id @unique`: `@id` already implies unique, so `@unique` is redundant. A hand-chosen Int id with no generator is fine *if* regions are seeded by hand (a fixed list like 1 = India, 2 = US).

**Sources:** my `packages/db-prisma/src/prisma/contract.prisma` · P40 entry (FK on the many side) · installed `@prisma/orm-postgres` → `skills/prisma-8/references/contract.md` (`@onCreate`, `@default`)

### P45: UUID ids in a Prisma 8 contract
**The problem it solves:** autoincrement ids (`1, 2, 3…`) are guessable (`/website/2` → try `/website/3`) and are handed out by one database. A UUID is a 128-bit random id anyone can generate without asking the DB, and you can't guess the next one.

**How it works in Prisma 8 (a change from ≤7):**
- **`@onCreate(fn())`** = the *client* (Prisma runtime in my app) generates the value when creating the row. **`@default(...)`** = a *database* default only (`now()`, `autoincrement()`, a literal, or a `` sql`...` `` expression). `@default(uuid())` (the Prisma ≤7 spelling) is refused with `PSL_GENERATOR_IN_DEFAULT`.
- What I wrote, `id String @id @onCreate(uuid())`, is **valid**. But the column is `text`, so the UUID is stored as a 36-character string.
- **Better on Postgres:** the native type **`Uuid`** (stored as 16 bytes, validated by Postgres): `id Uuid @id @onCreate(uuid(7))`. The old `String @db.Uuid` spelling is **removed** in 8.
- **`uuid(7)`** = UUIDv7: starts with a timestamp, so new ids sort by creation time. That keeps the primary-key index compact (new rows go at the "end" instead of random positions). Plain random UUIDs (v4) scatter inserts across the index.

**Gotchas / would have missed:**
- **Foreign keys must match the id type.** If `User.id` becomes `Uuid`, then `Page.authorId` must be `Uuid` too (it's `Int` in the commented-out model).
- **Client-generated means only Prisma fills it.** A manual `INSERT` in psql without an id fails (the NOT NULL id gets nothing). If raw inserts should work too, use a DB default: `` @default(sql`gen_random_uuid()`) ``.
- **Changing an existing id from Int to Uuid is destructive** (existing rows can't convert). In dev with test rows, `db update` will ask; dropping and recreating is simplest.

**Where the version-matched docs are:** `node_modules/@prisma/orm-postgres/skills/prisma-8/references/contract.md` (in db-prisma), around the paragraphs on aliases and on `@onCreate` / `@default`. These are the "agent skills" from P31: docs shipped *inside* the installed version, so they match rc.23 exactly.

**Connects to:** P31 (agent skills), P33 (destructive changes), P40 (FK lives on the "many" side, so it's the one whose type must follow).

**Sources:** installed `@prisma/orm-postgres@8.0.0-rc.23` → `skills/prisma-8/references/contract.md` (`@onCreate` vs `@default`, `Uuid`, `uuid(7)`, `PSL_GENERATOR_IN_DEFAULT`), `references/supabase.md` (`@db.Uuid` removed) · https://www.rfc-editor.org/rfc/rfc9562 (UUID versions, v7 time-ordered) · https://www.postgresql.org/docs/current/datatype-uuid.html

### P44: MCP (Model Context Protocol) servers
**The problem it solves:** an AI assistant only knows its training data and whatever is pasted in. Without a standard, every AI app would need a custom integration for every service (docs, databases, GitHub…). MCP is one plug shape: any client (Claude Code) can talk to any server.

**How it works:** a server offers **tools**: named functions with an input schema. The AI can choose to call them, and the results come back into the conversation. *What* the tools do is entirely up to the server. Transport is either `http` (a remote URL) or `stdio` (a local process the client starts).

**Three kinds met so far:**
1. **Docs servers:** read-only search over public docs. No login, because there's nothing private. Examples: `bun.com/docs/mcp` (Bun's own docs) and Context7 (`mcp.context7.com/mcp`, one server indexing many libraries, including Prisma and Express).
2. **Service-control servers:** act on *my account* (Prisma's `mcp.prisma.io`: create databases, deploy, manage storage). They need a login (OAuth) because they touch my resources. Prisma's docs search is just *one tool inside* this server, so it needs the login too.
3. **"Build your own" libraries:** the "Express MCP" search results (`expressjs-mcp` etc.) are libraries that turn *my own* Express app's endpoints into MCP tools. They're not Express docs. Express has no official docs MCP, so use Context7 for it.

**Worked through:** I said "I think MCP also gives access to documentation search". **Right, but partial.** Docs search is one thing an MCP server *can* offer; MCP itself is the protocol for offering any tool. That's why "Express MCP" searches return servers that have nothing to do with docs.

**Gotchas / would have missed:**
- Claude Code reads project servers only from a file named exactly **`.mcp.json`** at the project root. `docs.mcp.json` is silently ignored.
- A project `.mcp.json` asks for approval the first time a session opens. Check with `/mcp` (shows connected/failed and the tool list).
- Third-party indexes (Context7) can lag behind releases, so Prisma 8 RC coverage may be thin. `--help` remains ground truth for RC behaviour.

**Checking a server manually (without Claude):**
- *Coverage:* in the browser, context7.com → search the library. The library page shows the indexed version and the last-update time.
- *Does the server actually work:* the **MCP Inspector** (`@modelcontextprotocol/inspector`, run with bunx/npx) opens a web UI acting as an MCP *client*. Set transport to Streamable HTTP, paste the URL, Connect, then Tools → List Tools, then run a tool by hand. This is exactly what Claude Code does, but by hand.
- Open prediction: how many tools does Context7 list? Is there one per library or not?

**Connects to:** an API. An MCP server is like a REST API, but with a self-describing list of operations an AI can read and call. The Inspector plays the role Postman plays for a REST API. Like npm packages: anyone can publish one, so the name "Express MCP" doesn't mean it's official.

**Sources:** https://modelcontextprotocol.io/introduction · https://docs.claude.com/en/docs/claude-code/mcp · https://www.prisma.io/docs/ai/tools/mcp-server · https://www.prisma.io/blog/search-prisma-docs-from-your-coding-agent · https://github.com/upstash/context7 · https://npmjs.com/package/expressjs-mcp

### P101: arrow function with braces returns nothing (ORM include callback)
**The problem it solves:** a callback that's meant to hand back a value silently hands back `undefined`, so the caller ignores your work without any error.
**How it works:** an arrow function has two body forms. **Expression body** `(x) => x.where(...)`: the expression's value is returned automatically. **Block body** `(x) => { x.where(...) }`: the braces make it a list of statements, and nothing is returned unless you write `return`. The ORM's `.include("ticks", (tick) => …)` uses the callback's *return value* as the refined collection, and every ORM call returns a new collection without changing the old one. So `{ tick.where(...) }` built a filtered collection and then threw it away.
**Worked through (2026-11-24, `GET /user/website/:id`):** I wrote `.include("ticks", (tick: any) => { tick.where((t: any) => t.createdAt.gt(Date.now())) })`. Review pointed out the braces with no `return`. Fixed by dropping the braces so it's an expression body.
**Gotchas / would have missed:**
- The `: any` annotations hid it: with inferred types, TypeScript would have complained that the callback returns `void` where a collection is expected. Don't annotate callbacks `any`, let them be inferred.
- Returning an object literal from an expression body needs parentheses: `() => ({ a: 1 })`. Without them `{ a: 1 }` is read as a block containing a label `a`, and it returns `undefined`.
- Same trap in `.map(x => { x * 2 })` (array of `undefined`) and in React `.map(item => { <Row /> })` (renders nothing).
**Connects to:** P54/P52's "the ORM doesn't throw, it just gives you less than you wanted": a silent no-op, not an error. Immutable chaining (each call returns a new collection) is why the result *must* be returned.

## 3. Jargon

**Project scaffolding**
- **Scaffold / template:** generated starter files so you don't hand-write boilerplate. Met in `bun init`.
- **`@types/bun`:** type definitions that tell TypeScript and the editor what `Bun.*` APIs exist. Without it, `Bun.serve` shows up as an error in the editor even though it runs fine. Met in `bun init`.
- **`"private": true` (package.json):** makes npm refuse to publish the package. It protects apps from being published by accident. Libraries leave it off. Met in Blank vs Library.

**Git**
- **Nested `.gitignore`:** a `.gitignore` inside a subfolder. Its rules apply only to that folder and below, and they add to the parent's rules. Met in apps/api after bun init.
- **Anchored pattern (`/build`):** a leading slash pins the pattern to the `.gitignore`'s own folder instead of any depth. Met comparing root vs apps/web ignore files.
- **Negation (`!pattern`):** un-ignores something a parent rule ignored. Met in nested gitignore rules.

**TypeScript**
- **Contextual typing:** TS infers a value's type from *where it is used*, such as the expected parameter type of a callback. Met in P9 (Express handlers).
- **DefinitelyTyped / `@types/*`:** community type definitions for JS libraries that ship no types. Met in P9 (`@types/express`).
- **Type stripping / transpiling:** removing TS syntax to get runnable JS, *without* checking types. Bun does this at run time. Met in P10.
- **Generic type / type parameter default (`Request<P = ParamsDictionary>`):** a type with a "slot" (`P`) you can fill in. Leave it empty and you get the default. Met in P9.
- **Non-null assertion (`x!`):** a type-only "trust me, this isn't null/undefined". It has no runtime check. Met in P26.
- **`noPropertyAccessFromIndexSignature`:** a tsconfig flag that forces `obj['key']` instead of `obj.key` for index-signature keys. Met in P26.
- **Index signature (`[key: string]: T`):** "any key of this kind maps to T". TS can't know a specific key exists, so with `noUncheckedIndexedAccess` reads become `T | undefined`. Met in P9.
- **Declaration merging:** TypeScript combines two declarations with the same name (e.g. two `interface Request`) into one. That's how you add fields to a library's types without editing them. Met in P59.
- **Open vs closed types:** `interface`s are open (they can be re-declared and merged). `type` aliases are closed (re-declaring one is an error). Met in P59.
- **Global augmentation (`declare global`):** adding to types in the global scope from inside a module file. Express's `namespace Express { interface Request {} }` is built for it. Met in P59.
- **Script vs module (TS file kinds):** no top-level import/export = a *script*, whose declarations are global. Any import/export = a *module*, whose declarations are file-private. `export {}` is the trick that turns a file into a module. Met in P59.
- **Module augmentation (`declare module "x"`):** merging into a module's exported types. Met in P59.
- **`res.locals`:** Express's built-in per-request object for passing data from middleware to handlers. Met in P59.
- **`ParamsDictionary` vs `RouteParameters<Path>`:** Express's "any string keys" params type vs params parsed from the route string. Met in P9.

**Package tooling**
- **`bunx`:** runs a package's CLI without installing it into the project (Bun's `npx`). Met in P20.
- **dist-tag (`@latest`, `@next`, `@prev`):** a movable label on npm pointing at some version. `latest` isn't necessarily stable. Met in P21.
- **Release candidate (`-rc.N`):** a pre-release that's "probably final" but not yet the stable release. Met in P21 (Prisma 8.0.0-rc.33).

**Database / Prisma**
- **ORM:** a library that maps DB tables to typed objects in code, so you query with functions instead of raw SQL. Met in P20.
- **PSL (Prisma Schema Language):** Prisma's `.prisma` file format for describing models. Met in P20 (`--authoring psl`).
- **Contract (Prisma 8):** the schema as source (`contract.prisma`), compiled ("emitted") to `contract.json`, which the runtime client loads. Met in P20.
- **Connection URL / connection string:** one string with protocol, credentials, host, port, DB name and options. Met in P30.
- **Percent-encoding (`%40` for `@`):** writing reserved characters inside a URL part so they aren't read as delimiters. Met in P30.
- **`sslmode`:** a Postgres URL option controlling whether the connection uses TLS (`disable`, `require`, `verify-full`, …). Met in P30.
- **Cluster (Postgres):** one running Postgres server, which can hold many databases. The URL path picks one. Met in P30.
- **Triple-slash reference (`/// <reference types="node" />`):** a line in a `.d.ts` that says "also load these type definitions". It's how `bun-types` pulls in Node's types. Met in P24.
- **psql meta-command (`\l`, `\c`, `\d`):** a backslash command handled by the psql client itself, not SQL. Met in P32.
- **Quoted identifier (`"User"`):** a table or column name in double quotes keeps its exact case. Unquoted names are lowercased. Met in P32.
- **Relation field (virtual field):** a model field like `pages Page[]` or `author User` that Prisma uses for queries but that isn't a DB column. The real link is the foreign-key column (`authorId`). Met in P40.
- **One-to-many:** one row on one side (a User) relates to many rows on the other (Pages). The foreign key sits on the "many" side. Met in P40.
- **Middleware (Express):** a function that runs on every matching request, *in registration order*, before the route handler. It can change `req`/`res`, end the request, or pass it on with `next()`. Met in P43/P53.
- **Body parser:** middleware that reads the raw request body and turns it into `req.body` (`express.json()`, `express.urlencoded()`). Met in P53.
- **`Content-Type` header:** tells the server what format the body is in (`application/json`, `application/x-www-form-urlencoded`). Parsers only act when it matches. Met in P53.
- **URL-encoded form body:** `key=value&key2=value2`, what an HTML `<form method="post">` sends. Met in P53.
- **Plan (Prisma 8) vs query plan (Postgres):** a Prisma plan is the compiled query (SQL + params) about to be sent. A Postgres query plan is `EXPLAIN` output: how the DB will execute it. Met in P55.
- **Control plane vs runtime plane (Prisma 8):** control = CLI, migrations, schema verification (`family/control` imports). Runtime = the `db` client your app queries with. Don't import control code into the app. Met in P55.
- **Router (Express):** a mini-app with its own routes and middleware, mounted on a path prefix with `app.use(prefix, router)`. Met in P43.
- **Mounting:** attaching a router or middleware under a prefix. Paths inside the router are relative to it. Met in P43.
- **Controller / service layers:** the controller handles HTTP (req/res), and the service holds business logic + DB calls with no HTTP. Met in P43.
- **Connection pool:** a set of open DB connections a client reuses across queries, instead of connecting each time. Met in P41.
- **Graceful shutdown:** on SIGINT/SIGTERM, finish or stop work, close pools and connections, then exit. Met in P41.
- **Module singleton:** a module's top-level code runs once per process, so an exported instance is shared by every importer. Met in P41.
- **Introspection:** reading the DB's current structure (tables, columns, constraints). Met in P31.
- **Migration:** a planned set of DB changes that moves the schema from one version to the next. Met in P31.
- **Foreign key:** a column that must point at an existing row in another table (`Post.authorId → User.id`). Met in P31.
- **Unique constraint / index:** a unique constraint means no two rows share the value (`email`). An index is a lookup structure that makes queries on a column fast. Met in P31.
- **Marker / ref (Prisma 8):** the marker is the contract hash stored in the DB ("this DB matches contract X"). A ref is a named pointer to a hash (`db`), like a git branch. Met in P31.
- **Schema sync vs migrations:** sync (`db update`, formerly `db push`) makes the DB match the schema right now, with no history. Migrations (`migration plan` + `db migrate`) are versioned change files applied in order on every environment. Met in P33.
- **Destructive change:** a schema change that loses data (dropping a table or column, changing a type). Prisma makes you say whether it's a rename or a delete. Met in P33.
- **Agent skills (Prisma):** version-matched instruction files for AI coding agents, shipped inside Prisma packages and copied in by `prisma skills sync`. Met in P31.
- **UUID (v4 / v7):** a 128-bit id generated without asking the DB. v4 is fully random. v7 starts with a timestamp, so ids sort by creation time and keep indexes compact. Met in P45.
- **`@onCreate(fn())` vs `@default(...)` (Prisma 8):** the client generates the value vs the database fills it in. Met in P45.
- **Native `Uuid` column:** Postgres's own `uuid` type (16 bytes, validated) instead of storing the id as text. Met in P45.
- **`DATABASE_URL`:** the connection string (user, password, host, db name) Prisma reads from `.env`. Met in P20 (`--write-env`).

**Docker**
- **Image vs container:** the image is the template (`postgres`). A container is a running instance of it, with its own name and state. Met in P27.
- **Port mapping (`-p host:container`):** connects a port on my machine to a port inside the container. Met in P27.
- **Named volume (`-v name:/path`):** Docker-managed storage that outlives the container, so data survives `docker rm`. Met in P27.
- **Anonymous volume:** an unnamed volume Docker creates automatically for an image's declared `VOLUME` path when you don't mount one there. It's easy to lose when the container is re-created. Met in P28.
- **Image tag (`postgres:18`, `:latest`):** the version label after the colon. `latest` is the default and moves over time. Met in P28.
- **`PGDATA`:** the env var telling Postgres where its data directory is. It's version-specific in image 18+. Met in P28.
- **`pg_upgrade --link`:** upgrades a Postgres data dir to a new major version using hard links instead of copying, so it's fast. Old and new dirs must be on the same filesystem. Met in P28.
- **Dangling image (`<none>`):** an old image whose tag moved to a newer pull. It still uses disk space until pruned. Met in P29.
- **Detached (`-d`):** runs the container in the background and gives the terminal back. Met in P27.

**Auth / JWT**
- **JWT (JSON Web Token):** a signed `header.payload.signature` string that proves "this is user X until time T" without a server-side session. Met in P57.
- **Claim:** one field in the JWT payload. *Registered* claims have standard names: `sub` (user id), `exp` (expiry), `iat` (issued at), `iss` (issuer), `aud` (audience). Met in P57.
- **JWS / protected header:** JWS is the "signed" format a JWT uses. The protected header is the part of the header covered by the signature (holds `alg`). Met in P57.
- **HS256 vs RS256/ES256:** symmetric (one shared secret signs and verifies) vs asymmetric (a private key signs, a public key verifies). Met in P57.
- **Base64url:** URL-safe encoding. Anyone can decode it, so it's not encryption. Met in P57.
- **Authentication vs authorization:** authentication = proving *who you are* (the JWT middleware). Authorization = deciding *what you may do* (may this user read this website?). Met in test 3 / P58.
- **IDOR / BOLA (Insecure Direct Object Reference / Broken Object Level Authorization):** a logged-in user reaches *another user's* object just by sending its id, because the server never checks ownership. OWASP's #1 API risk. Met in test 3, steps 14/16.
- **Hex encoding:** writing bytes as base-16 text, 2 characters per byte (`0x2f` → `"2f"`). So 32 random bytes = 64 hex chars: the same randomness, written two ways. Met in P57.
- **Entropy (of a secret):** how much real randomness it holds, in bits. HS256 needs ≥ 256 bits (32 random bytes). A long but guessable string (`"secret_key"`) has very little. Met in P57.
- **Web Crypto API:** the standard crypto API in browsers, Bun and edge runtimes. Works on bytes (`Uint8Array`), which is why jose wants `TextEncoder().encode(secret)`. Met in P57.

**AI tooling**
- **MCP (Model Context Protocol):** a standard way to give an AI client extra tools from a "server". Met in P44.
- **MCP tool:** one named function a server offers (e.g. "search docs", "create database") that the AI can call. Met in P44.
- **Transport (`http` vs `stdio`):** how the client reaches the server: a remote URL, or a local process it starts. Met in P44.
- **OAuth:** "log in with your account and approve access" instead of pasting a password. Prisma's MCP uses it. Met in P44.
- **`.mcp.json`:** the project-level file listing MCP servers for Claude Code. The name must be exact. Met in P44.
- **Context7:** a third-party MCP server indexing docs for many libraries. Met in P44.

**Monorepo**
- **Module vs package:** a module is one file with its own scope (imports/exports). A package is a folder with `package.json` (name, deps, `exports`) containing many modules. `node_modules/` holds packages, despite its name. Met in P59.
- **Internal package:** a workspace package used only inside the repo (`@repo/ui`, soon `@repo/db-…`). It's `"private": true` and never published. Met in P25.
- **`include` / `exclude` (tsconfig):** which files tsc type-checks. `exclude` only filters what `include` matched. Met in P25 (packages/ui).
- **Declaration file (`.d.ts`):** types only, no code. It's generated alongside compiled `.js` so TypeScript users get types. Met in P37.
- **Transitive dependency:** a package my dependency depends on, which I didn't list myself (`@prisma/orm-family-sql` via `@prisma/orm-postgres`). Met in P38.
- **Isolated install (Bun):** each package's `node_modules` contains only its declared deps, symlinked from a central `node_modules/.bun/` store. Met in P7/P38.
- **Export conditions (`types`, `import`, `require`, `default`):** keys inside an `exports` entry that choose a file depending on who's importing. `types` goes first. Met in P37.
- **Just-in-Time vs Compiled package (Turborepo):** JIT exports `.ts` source and consumers compile it. Compiled builds to `dist/` (`.js` + `.d.ts`). Met in P37.
- **`timestamp(3)` with / without time zone:** a date-time with 3 fractional-second digits (ms). *With* time zone (`timestamptz`) stores an absolute instant. *Without* stores a clock reading with no zone. Met in P37.
- **`exports` (package.json):** declares which files other packages can import, and under what path. `@repo/ui` maps `"./*"` → `"./src/*.tsx"`. Met in P25.
- **Catalog (`"catalog:"`):** one version table in the root package.json that workspace packages point to instead of writing versions. Met in P11.
- **Workspaces (`"workspaces": ["apps/*", "packages/*"]`):** tells the package manager these folders are packages in one repo. They share one lockfile and one install at the root. Met in the root package.json. (It's why `bun init` in apps/api did **not** create its own `bun.lock`.)
- **Peer dependency:** "I need the *host* project to provide this package, in this version range", instead of installing my own copy. Met in apps/api's `typescript ^5`.

## 4. Misconceptions

- **(P7) "The shared config is in the same repo, so `extends` will find it."** Wrong under Bun's isolated installs. Internal packages are only visible to packages that declare them as dependencies.
- **(P40) "Without `?`, `pages Page[]` forbids a user with no pages."** No. Lists can't be optional (`[]?` is invalid), and the empty list is the "none" case. `pages` isn't even a DB column. The required rule is on `Page.author` (each page needs a user).
- **(P38) "We don't need `.d.ts` because we use Bun, not npm."** Right conclusion, wrong reason. It depends on **JIT vs Compiled package**, not on the package manager or runtime.
- **(P8 → P38, my error as tutor) "`declaration` is moot with `noEmit`."** Wrong. `declaration: true` still runs declaration-emit checks (TS2742) even when nothing is written.
- **(P37) "Exporting `.ts` exports the `.d.ts`, which has the types."** No. `.ts` source has code *and* types in one file. `.d.ts` only exists when a package is compiled (`declaration: true`). An internal Just-in-Time package needs no separate types entry.
- **(P34) "Bun covers Node types, so `types` can go."** Only if Bun's types are loaded (`types: ["bun"]` + `@types/bun`). Removing `types` means *no* globals on TS 6+/7.
- **(P32) "`\d` lists databases."** No. `\l` lists databases. `\d` lists the tables/relations *inside* the current DB, and `\d <table>` shows a table's columns.
- **(P28) "Writing `latest` specifies a version."** No. `latest` is the default tag and moves with every new release. Pin the major (`postgres:18`) so the data path stays stable.
- **(P24) "Bun provides the types by default."** Half right. The *runtime* provides the APIs, but the *types* come from the `@types/bun` package, and that package already pulls in `@types/node`. So Prisma's extra `@types/node` is redundant for Bun, not missing.
- **(P9, my own error as tutor) "Annotated `req.params.id` is `string | undefined`."** Wrong in detail. Express 5's `ParamsDictionary` values are `string | string[]`, so it's `string | string[] | undefined`. Lesson: check the real `.d.ts` before stating a type.
- **(P9) "Express assigns a default req/res type."** No default. The type flows in from `app.get`'s declared handler type (contextual typing). Annotating can even *lose* precision (`ParamsDictionary`).
- **(P10) "In Node, TS was a devDependency and only the compiled outDir ran."** Correct. On Bun the same classification holds; there's just no compile step, because Bun transpiles in memory without the `typescript` package.
- **(P12) "noFallthroughCasesInSwitch / noImplicitOverride are already in base.json."** Wrong. Always check the file you extend (`packages/typescript-config/base.json`).
- **(P12) "verbatimModuleSyntax allows types in imports."** Imprecise. It *requires* `import type` for type-only imports.
- **(P33 → P47, my error as tutor) "A `migrations/` folder exists, so you've used the migration path."** Wrong. `db init`/`db update` create `migrations/app/refs/db.json` + `snapshots/` themselves. Only `migrations/app/<timestamp>_<name>/` folders mean migration packages exist. Lesson: list the folder before inferring from its name.
- **(P48) "So I should return 201 instead of 409?"** No. They answer different outcomes of the same endpoint: **201** = the user was created, **409** = the username is taken, nothing created. (My reply put both in one list, which made it read like a replacement.) The separate case where you *hide* the clash (the same reply whether or not the account exists) is for emails, to avoid revealing who has an account. That reply is usually 200/202 "check your inbox", never 201, because nothing was necessarily created.
- **(P46 → run 012) "I thought the ORM or the DB would add the id to Region by itself."** No. **`@id` only means "this is the primary key"** (unique + not null). It says nothing about *who fills it*. A value appears only if I ask for one: `@default(autoincrement())` (the DB fills it) or `@onCreate(uuid(7))` (Prisma in my app fills it). Otherwise the insert must supply it, or it fails with 23502 not_null_violation. And **`now()` is a timestamp generator, not an id option**. It's for `DateTime` fields like `createdAt`.
- **(P59) "Module and package are the same thing, right?"** No. A **module** is **one file** with its own scope that imports/exports (`db.ts`, `index.ts`, `middleware.ts`). A **package** is **a folder with a `package.json`**: a named, installable unit (`express`, `jose`, `@repo/db-prisma`) made of *many* modules, whose `exports` field chooses which modules outsiders may import (P25/P35). Relation: package ⊃ modules. **The confusion is understandable, because the word "module" is overloaded:** `node_modules/` actually holds *packages*; `import … from "express"` loads "the express module", meaning the package's entry module; `declare module "express"` names an import path; and tsconfig's `module` option means the *module system/format* (ESNext, Preserve, NodeNext, P39).
- **(P59) "`export {}` makes the declaration global for every file."** Backwards. `export {}` makes the file a **module** (file-private scope). **`declare global`** is what adds to the global scope, and TS only permits it inside a module. A file with no import/export is a *script* whose top-level declarations are global already.
- **(P57) "1 byte is 16 bits, and hex is 0–9 a–f, so 16 bits = 2 characters?"** Half right. **1 byte = 8 bits**, not 16. The hex part is right: one hex character has 16 possible values (0–9, a–f) = **4 bits**. So **2 hex characters = 4 + 4 = 8 bits = 1 byte**. (16 bits = 2 bytes = 4 hex chars.)
- **(P44) "MCP gives access to documentation search."** Right but partial. MCP is the protocol for giving an AI *any* tool. Docs search is just one kind of tool a server may offer. Others act on your account (Prisma: create DBs), and "Express MCP" libraries expose *your own* API as tools.
- **(P3) "`^7` covers all of version 7."** Right: `>=7.0.0 <8.0.0`. The catch is elsewhere: each package's range is hand-written, and the edit only takes effect after `bun install`.

- **(P101) "`(x) => { x.where(...) }` returns the filtered collection."** No. Braces make a block body, which returns `undefined` unless you write `return`. Only the brace-less expression body returns automatically.

## 5. Failure signatures

- **`TypeError: Cannot destructure property 'x' from null or undefined value` on a POST, 500 + HTML stack trace** → `req.body` is undefined → no body-parsing middleware (`express.json()`) registered before the routes. Confirmed with curl in P52.
- **`Type 'String' is not assignable to type 'string'`** → a type was written with a capital letter (`String`, `Number`, `Boolean`), which is the wrapper-object type → use lowercase `string`/`number`/`boolean`. Seen in `express.d.ts` (P59).
- **`SqlQueryError` `sqlState: "23502"` "Failing row contains (null, …)"** → **not_null_violation**: a required column got no value, usually an `@id` with no `@onCreate`/`@default` generator → add a generator (or always supply the value). Seen on `Region.id` in run 012 (P46/P58).
- **`SqlQueryError` `sqlState: "22P02"`** → **invalid_text_representation**: the value can't be read as the column's type (e.g. a fraction `48213.07` into an `int` column, or `"abc"` into a uuid) → generate or convert to the right type (integers via `Math.floor`, or let the DB generate it). Seen on `Region.id` in run 013.
- **A DB column contains `{"field":"value"}` instead of `"value"`** → the whole `req.body` object (or a wrapper object) was passed where one field was meant → pass `req.body.field`. (Run 012, Region.name)
- **A rejected request comes back 200 with an error message** → the middleware's catch calls `res.json` without `res.status(...)` → set 401 explicitly. (Test 3, run 010)
- **Error responses contain absolute file paths / library versions** → the whole error object was sent (`error: e`), and some libraries' errors (jose) serialise `stack` → send a fixed message, and log the error server-side. (Run 010)
- **User B can create or read user A's records** → the owner comes from the request body / there's no ownership check (IDOR) → take the owner from the token, and filter by owner on read. (Run 010, steps 14/16)
- **A query log shows `SELECT … LIMIT 1` with no `WHERE` for a lookup** → every filter value was `undefined` (e.g. no `username` in the body) → it returns an arbitrary first row. Guard required fields before querying. Seen in run 008, step 5 (P54).
- **Fewer query-log lines than requests** → some requests exited before the DB call (an early `throw`/`return`). Match the lines to the requests to see which path each one took. (Run 008)
- **Signin with a field missing returns the user (200)** → `undefined` in the filter object → the ORM doesn't filter on that field → validate that the input is present before querying, and never put the password in the query. Found by test 2, step 4 (P54).
- **Bad login returns 200 `{user: null}` instead of an error** → `.first()` returns null on no match and doesn't throw → check for null and reject. (P54)
- **A request hangs until the client times out (curl exit 28)** → the handler never sends a response (empty handler, or a branch with no `res.*`) → seen on `/region/list` in P52.
- **"Not found" returns 200 `{x: null}`** → `.first()` returns null instead of throwing → check for null and send 404. (P52)
- **`PSL_GENERATOR_IN_DEFAULT` on emit** → a client-side generator (`uuid()`, `cuid()`…) is inside `@default(...)`, which is the Prisma ≤7 spelling → in Prisma 8, move it to `@onCreate(...)`. (P45)
- **MCP server never shows up in `/mcp`** → the config file isn't named exactly `.mcp.json` at the project root (e.g. `docs.mcp.json`) → rename it, then start a new session. (P44)

- **(P38) Symptom:** `TS2742: The inferred type of 'X' cannot be named without a reference to '…/.bun/<pkg>@…/node_modules/…'. This is likely not portable.` **Cause:** `declaration: true` (often inherited via `extends`) + an exported value whose inferred type comes from a **transitive** dependency, under isolated installs. **Confirm:** check whether `declaration` is on in the effective config (`tsc --showConfig`). **Fix:** turn `declaration` off (JIT package), annotate the export, or add the dependency directly.
- **(P41) Symptom:** in dev, after many saves, `sorry, too many clients already` / connection errors. **Cause:** hot reload (`bun --hot`, Next HMR) re-runs db.ts and creates a new client each time without closing the old pool. **Confirm:** `select count(*) from pg_stat_activity;` keeps climbing with each save. **Fix:** cache the client on `globalThis`, or use `--watch` (full restart).
- **(P41) Symptom:** a seed or test script prints everything but **never exits**. **Cause:** the DB pool is still open. **Fix:** `await db.close()` at the end.
- **(P32) Symptom:** a valid SQL query errors with "syntax error at or near …" pointing at text I didn't just type. The psql prompt shows `db-#` instead of `db=#`. **Cause:** a previous unfinished statement is still in the query buffer, and the new line got appended to it. **Confirm:** `\p` prints the buffer. **Fix:** `\r` to reset, then retype.
- **(P30) Symptom:** "invalid URL" / "invalid port" / can't resolve a weird host like `ss@localhost` / auth fails, but only after changing the DB password. **Likely cause:** a special character (`@ # / ? : %`) in the password, not percent-encoded. **Confirm:** parse the URL with `new URL()` and inspect `.password` / `.hostname`. **Fix:** percent-encode the password in `DATABASE_URL`.
- **(P26) Symptom (expected later):** a Prisma command says `DATABASE_URL` is missing/undefined, or can't connect, even though `.env` has it. **Likely cause:** `import 'dotenv/config'` reads `.env` from the **current working directory**, not from the folder `prisma.config.ts` lives in. Running from the repo root (e.g. via a turbo/root script) looks for `betteruptime/.env`, not `packages/db-prisma/.env`. **Confirm:** print `process.cwd()` and check whether `.env` exists there. Run the same command from inside `packages/db-prisma` and see if it works. **Fix options:** run from the package folder (turbo runs package scripts in their own folder), point dotenv at an explicit path (its `path` option), or keep one `.env` where the command actually runs.
  Sources: https://github.com/motdotla/dotenv#readme (`path` option, default `path.resolve(process.cwd(), '.env')`) · https://bun.com/docs/runtime/env (Bun's own auto-loading, also from cwd) · https://www.prisma.io/docs/cli/orm-init
- **(P7) Symptom (expected):** `tsc` / `bun check` in apps/api says it can't find `@repo/typescript-config/base.json`. **Cause:** api doesn't declare the package. **Confirm:** `apps/api/node_modules/@repo` doesn't exist, while `apps/web/node_modules/@repo/typescript-config` does.
- **(P8) Symptom (expected):** `Cannot find name 'Bun'`. **Cause:** TS 6+/7 defaults `types` to `[]`. **Confirm:** goes away after adding `types: ["bun"]`.
- **(P8) Symptom (expected):** "Relative import paths need explicit file extensions…" on `./routes`. **Cause:** `NodeNext` resolution inherited from base.json.
- **(P1) Symptom (potential):** `.log` files show up in `git status` even though apps/api/.gitignore has a "logs" section. **Likely cause:** Bun's template writes `_.log` instead of `*.log`. **Confirm:** `git check-ignore -v apps/api/some.log` prints nothing, which means the file isn't ignored.

- **(P101) An ORM `include`/`where` refinement is ignored (all related rows come back, or the filter has no effect), with no error** → the callback has a block body `{ … }` without `return`, so it returns `undefined` → drop the braces or add `return`. `any` on the callback parameter hides the type error that would have caught it.

## 6. Open questions

### To do
- [ ] (P105, added 2026-11-24) **To learn: SSH and public/private key pairs.** Came up setting up the Vultr server: I ran `ssh-keygen -t ed25519`, added the `.pub` line to Vultr, and Claude will log in with the other file.
  - **The problem it solves:** logging into a remote server with a password means the secret travels to the server every time, can be guessed (bots try millions of passwords against every public IP), and the server has to store something password-like. With a key pair, **the secret never leaves my machine** and the server only stores something that's useless to an attacker.
  - **How a key pair works:**
    - `ssh-keygen` makes two files that are mathematically linked: the **private key** (`claude-ssh`) and the **public key** (`claude-ssh.pub`).
    - The **public key can only check**, the **private key can sign**. Knowing the public key doesn't let anyone work out the private one (that's the hard math problem the security rests on: elliptic curves for ed25519, factoring large numbers for RSA).
    - So the public key is safe to hand out (paste into Vultr, GitHub, a server). The private key never leaves my machine and is never pasted anywhere.
  - **What happens when I run `ssh root@<ip>`:**
    1. The server proves *it* is the right server (host key; see below), and both sides agree on an encryption key for the session.
    2. The server says "prove you own one of the public keys in `~/.ssh/authorized_keys`" and sends a challenge tied to this session.
    3. My SSH client **signs** the challenge with the private key and sends back only the signature.
    4. The server **checks** the signature with the stored public key. Valid → logged in. The private key itself was never sent.
  - **Where the pieces live:**
    - My machine: `~/.ssh/claude-ssh` (private), `~/.ssh/claude-ssh.pub` (public), `~/.ssh/known_hosts` (servers I've connected to before), optionally `~/.ssh/config` (shortcuts: `Host bstack`, `HostName <ip>`, `User root`, `IdentityFile ~/.ssh/claude-ssh`, then just `ssh bstack`).
    - The server: `~/.ssh/authorized_keys` (one public key per line; Vultr puts my key there when the server is created).
  - **The other direction: host keys and `known_hosts`.** The *server* also has a key pair. On the first connection SSH shows its fingerprint and asks "are you sure?". Saying yes saves it in `known_hosts`. If it ever changes, SSH refuses with "REMOTE HOST IDENTIFICATION HAS CHANGED": either the server was rebuilt (expected, e.g. a reinstalled Vultr instance on the same IP) or someone is in the middle. Don't blindly delete the line; know which it is.
  - **The passphrase:** encrypts the private key file on disk. If the file is stolen, it's useless without the passphrase. Cost: you type it on use, unless `ssh-agent` holds the unlocked key for the session. Without a passphrase, the file alone is enough to log in.
  - **Gotchas I hit or would have missed:**
    - `ssh-keygen` asked "Enter file in which to save the key" and I typed `claude-ssh`: a bare name is saved in the **current folder**, which was the repo root. One `git add .` would have published the private key. Give a full path (`~/.ssh/claude-ssh`) or press Enter for the default.
    - A private key that ever reached GitHub (even in a commit that was later deleted) is compromised. Delete it from every server's `authorized_keys` and make a new pair.
    - Permissions: on Linux/macOS SSH refuses a private key readable by others ("UNPROTECTED PRIVATE KEY FILE"); `chmod 600` the private key, `700` the `~/.ssh` folder.
    - The comment at the end of the `.pub` line (`your_email@example.com`) is just a label; it plays no part in the security.
    - ed25519 is the modern default: short keys, fast, safe. RSA still works but needs 3072+ bits; DSA is deprecated and disabled in current OpenSSH.
  - **Connects to:** P57/P58 (JWTs). Same family of ideas: HS256 (what the API uses) is one shared secret that both signs and checks, like a password. RS256/EdDSA JWTs use a key pair exactly like SSH: the auth server signs with the private key, anyone can verify with the public key. Also HTTPS: the certificate Caddy will get holds the site's public key, and the browser checks signatures made with the private key that stays on the server.
  - **Read:** `man ssh-keygen`, `man ssh_config`; GitHub docs "Generating a new SSH key and adding it to the ssh-agent"; Cloudflare Learning "What is public key cryptography?".
- [ ] (P104, added 2026-11-24) **To learn: one central Redis (and Postgres) with workers in many regions.** Came up while choosing hosting: the plan is one main server with Redis + Postgres, plus a small VM per region running only the worker.
  - **The problem it solves:** an uptime monitor should check each site *from several places*, so "down from India, up from Germany" can be told apart from "down everywhere". Every region needs the same list of websites at the same moment, and within one region several workers should share the work without checking a site twice. The pusher shouldn't have to know which regions or workers exist.
  - **How streams + consumer groups do it (the core idea):**
    - The pusher `XADD`s each website **once** to `bstack:website`.
    - **Across groups, every group gets every message (fan-out).** One consumer group per region (`1` = india, `2` = …) means every region checks every website.
    - **Inside a group, messages are split between consumers (load balancing).** Two workers in region 1 with different `WORKER_ID`s each get a different part of the batch.
    - Each group has its own position in the stream ("last delivered id") and its own **pending list** (delivered but not yet acked). That's why group name = region id, and why each worker needs a unique consumer name.
    - Seen live on 2026-11-24: `XINFO GROUPS bstack:website` showed group `1` with lag 0 and group `2` (no worker running) with **lag 1172**: messages piling up for a region nobody is serving.
  - **What changes when Redis is far away:**
    - *Latency:* a worker in Mumbai talking to Redis in Frankfurt pays ~100–200 ms per command. Fine here, because a worker sends few commands (one blocking read per batch of `COUNT` messages, then acks). It does **not** distort the measurement: `response_time_ms` is timed from the worker to the website, not to Redis.
    - *Security:* Redis has **no password by default** (my local one: `requirepass` is empty) and speaks plain text. Exposed to the internet, anyone can read or wipe it. Options: password/ACL users + TLS, or a private network between the VMs (WireGuard, Tailscale, a cloud VPC) so Redis is never public.
    - *Who writes ticks:* today each worker writes straight to Postgres, so every regional VM needs DB credentials and a DB connection over the internet. Alternative: workers `XADD` results to a second stream, and one writer next to the DB inserts them (the plan in the pusher's commit message). The DB stays private, and inserts can be batched.
  - **Failure modes to know:**
    - *Single point of failure:* if the central Redis is down, every region stops checking. That's acceptable at this size; the fixes later are replicas + Sentinel, or a managed Redis.
    - *Persistence:* streams and consumer groups live in memory. My local Redis only snapshots (`save 3600 1 300 100 60 10000`) with `appendonly no`, so a crash loses up to a few minutes, and a container recreated without a volume loses the stream **and the consumer groups** (workers then fail until `XGROUP CREATE` runs again). Learn RDB vs AOF.
    - *Unbounded growth:* `XADD` without a limit keeps every entry forever, and acking doesn't delete anything. Local stream: **1,274 entries** after one day of testing; in production that's 15 sites × 480 pushes/day and climbing. Learn `MAXLEN ~` / `MINID` on `XADD`, and `XTRIM`.
    - *Stuck messages:* a worker that dies after reading but before acking leaves messages in its pending list forever. Learn `XPENDING` and `XAUTOCLAIM` (another consumer takes over messages idle longer than N ms).
  - **Alternatives to read about (not to switch to now):** Kafka (partitions + consumer groups, same idea at a much larger scale), RabbitMQ (fanout exchange + one queue per region), NATS JetStream, AWS SQS + SNS fan-out. Comparing them with Redis streams is a good way to see which parts are the concept and which are just Redis.
  - **Connects to:** P102 (the blocking read needs its own connection, and a remote one makes the reconnect/error handling matter more); P103 (graceful shutdown: ack before exiting, or messages sit in the pending list).
  - **Read:** Redis docs "Redis Streams" (consumer groups section, `https://redis.io/docs/latest/develop/data-types/streams/`); Redis docs on persistence (`https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/`); Redis security (`https://redis.io/docs/latest/operate/oss_and_stack/management/security/`).
- [ ] (P103, added 2026-11-24) **To learn: signals (`SIGINT`, `SIGTERM`, `SIGKILL`) and graceful shutdown.** Came up deciding when to close the worker's Redis connections (P102).
  - **The problem:** a long-running process (API, worker, pusher) gets stopped from outside: Ctrl+C, a deploy, `docker stop`, a crash of the machine. If it just dies, in-flight work is lost: a batch of websites read but not acked, a tick half-written, connections dropped without a goodbye. Signals are how the OS tells a process "stop now, please", so it gets a chance to finish cleanly first.
  - **What a signal is:** a small numbered message the OS delivers to a process. The process either handles it (runs your code) or gets the default action (usually: exit at once).
  - **The three to know:**
    - `SIGINT` ("interrupt", 2): sent when you press **Ctrl+C** in the terminal. Default: exit.
    - `SIGTERM` ("terminate", 15): the polite "please shut down" that tools send: `kill <pid>`, `docker stop`, Kubernetes, systemd, most hosting platforms on deploy. Default: exit.
    - `SIGKILL` (9): "die now". **Cannot be caught or handled**; the process gets no chance to clean up. `docker stop` sends `SIGTERM`, waits 10 seconds, then sends `SIGKILL`. So shutdown code has a time limit.
  - **How you handle one in Node/Bun:** `process.on('SIGINT', handler)` / `process.on('SIGTERM', handler)`. Once you add a handler, the default "exit" no longer happens, so the handler must end with `process.exit(...)` itself, or the process keeps running.
  - **Graceful shutdown for the worker:** stop taking new work (break out of the read loop), let the current batch finish and be acked, `destroy()` the blocking Redis client, `close()` the main Redis client and the DB, then exit. For the API: stop accepting new requests (`server.close()`), let in-flight ones finish, close the DB.
  - **Windows caveat (I'm on Windows):** Windows has no real signals. Node/Bun emulate `SIGINT` for Ctrl+C, and `SIGBREAK` for Ctrl+Break. A `SIGTERM` handler does not fire when a process is killed from Task Manager or `taskkill`, so test `SIGTERM` handling on Linux or in Docker, which is where it matters in production anyway.
  - **Read:** Node docs, "Signal events" (`https://nodejs.org/api/process.html#signal-events`); `man 7 signal` for the full list.
- [ ] (P102, added 2026-11-24) **To learn: one connection, blocking commands, and `duplicate()`.** Came up while making the worker's `xReadGroup` use `BLOCK: 0`. Cover:
  - **The problem:** a Redis connection answers commands strictly in the order they were sent. A blocking command (`XREADGROUP … BLOCK 0`, `BLPOP`, `BRPOP`) holds back every command queued behind it on that connection until it returns. `packages/redis` shares one client (one connection) across `xAdd`, `xReadGroup` and `xAck`.
  - **What I asked: "what if the pusher calls `xAdd` while the worker is blocked?"** Nothing bad. The pusher is a separate process with its own client and connection. Its `xAdd` reaches Redis right away, Redis appends to the stream and wakes the blocked reader. Blocking only affects commands on the *same* connection.
  - **What I asked: "isn't it a paradox that the worker's writes wait for the next website, which only the pusher sends?"** Only when the same connection has to deliver the message the read is waiting for. Pusher and worker in separate processes: no paradox, the worker's other commands just wait until the pusher's next run (up to 3 minutes), or forever if the pusher stops. Pusher and worker sharing one connection (same process, same client): the `xAdd` queues behind the read that waits for it. That's a real deadlock.
  - **`client.duplicate()`:** in node-redis it returns a *new client* built with the same options as the original (URL, socket settings, command options; `@redis/client/dist/lib/client/index.js`, `duplicate(overrides)`). It is a new, separate connection, same as calling `createClient(sameOptions)`. It isn't a cheap view onto the old connection. Differences from writing `createClient()` again: you don't repeat the config, and `overrides` can change one setting. Not copied: the connection state (you must `connect()` it) and the event listeners (you must add `.on('error', …)` again).
  - **Why Postgres didn't have this problem.** My guess was "the Postgres request waits in the background while the worker actively waits". Not quite: both are `await`s, neither one busy-waits, and the event loop is free in both cases. The real differences:
    1. *A pool, not one connection.* The Prisma ORM's Postgres driver keeps a pool of connections and hands each query a free one, so a slow query doesn't hold up the others. `packages/redis` uses exactly one connection.
    2. *Queries end on their own.* A normal SQL query finishes as soon as the work is done. `BLOCK 0` is designed to never finish until new data arrives.
    3. *Postgres can block too, in the same way.* A query waiting on a row lock, or a connection used for `LISTEN`, holds its connection just like a blocking Redis read. A pool that's too small then stalls everything (pool exhaustion). Learn: pool size, what happens when the pool is empty, and why `LISTEN` gets its own dedicated connection, the same pattern as `duplicate()`.
  - **⭐ The rule to remember (added after wiring it in):** in Redis, **blocking commands and pub/sub each need their own connection**. Make it with `client.duplicate()`, `connect()` it once, give it its own `.on('error', …)`, and keep normal commands on the main client.
    - *Blocking* (`XREADGROUP … BLOCK`, `BLPOP`, `BRPOP`, `BLMOVE`, `BZPOPMIN`): the connection answers nothing else until the command returns.
    - *Pub/sub* (`SUBSCRIBE`, `PSUBSCRIBE`): the connection switches into subscriber mode, where Redis only accepts (un)subscribe/ping commands on it. A `GET` or `XADD` on it is refused, not just delayed.
    - *Lifetime:* a connection is expensive to open (TCP handshake, maybe TLS and AUTH). Open the duplicate once at startup, reuse it for every read, close it on shutdown. My first version opened one per loop and closed it after the first ack in a batch, which broke the second ack with `ClientClosedError`.
    - *Same idea elsewhere:* Postgres `LISTEN` gets a dedicated connection for the same reason.
    - **My thumb rule (my words, confirmed):** "whatever is blocking, use a duplicate client for it, don't restart it every loop though; whatever is non-blocking can be used with a single client." Two additions: **pub/sub counts as blocking** for this rule (a subscribed connection can't run anything else), and it's **one duplicate per blocking reader running at the same time**. Two concurrent blocking reads in one process would block each other on a shared duplicate.
    - **Open once, keep it forever, close on shutdown.** The reading connection lives as long as the worker. `while(1)` never ends, so "after the loop" means "when the process is told to stop": handle `SIGINT`/`SIGTERM` and close it there.
    - **Gotcha: `close()` vs `destroy()` with a pending `BLOCK 0`.** In node-redis v6, `close()` "waits for pending commands" and `destroy()` "rejects all commands immediately" (`@redis/client/dist/lib/client/index.d.ts`). A `BLOCK 0` read is a pending command that may never finish, so `close()` on the reading client can hang shutdown. Use `destroy()` for the blocking client, and `close()` for the normal client so in-flight `xAck`s finish. (`QUIT()` and `disconnect()` are deprecated in favour of these two.)
  - **Related:** worker threads (Bun `Worker`) each load modules separately, so each gets its own connections; they're like separate processes in that respect. Redis pub/sub has the same rule: a client in subscribe mode can't run normal commands, so node-redis docs say to `duplicate()` for subscribers.
- [ ] (P100, added 2026-11-24) **To learn: IPv4 vs IPv6, and why google.com showed Down.** On `feature/ai-changed`, `www.google.com` and `google.com` were Down on every check (`timed out after 10000 ms`) while `example.com` was Up. The cause: Google has IPv6 (AAAA) addresses, my network can't route IPv6, and Bun connected to the IPv6 address without falling back to IPv4. The fix is in `apps/worker/check.ts` on that branch, and the full debugging story is in P100 of the current log (`d:\cohort\betteruptime\learning\bun-init-log.md`). Cover:
  - **The problem IPv6 solves:** IPv4 has about 4.3 billion addresses (32 bits), and they ran out. IPv6 has 128 bits. Why NAT kept IPv4 alive, and what it costs.
  - **Address formats:** `142.251.156.119` vs `2001:4860:482d:7700::`. What `::` means. Loopback `127.0.0.1` vs `::1`. Private ranges (`10.x`, `192.168.x`) vs IPv6 link-local (`fe80::`).
  - **DNS records:** `A` = IPv4, `AAAA` = IPv6. One hostname can have both. Experiment: `Resolve-DnsName www.google.com`.
  - **Dual stack:** when a host has both, which one does a client try first? **Happy Eyeballs** (RFC 8305): try both almost at once, use whichever connects first. Browsers and curl do it, Node 20+ does it (`autoSelectFamily`), and Bun 1.3 didn't in my test.
  - **Why it hung instead of failing fast:** with no route, the connection attempt gets no answer at all, so it waits for the timeout. Compare with "connection refused" (the host answered "no") and "DNS lookup failed" (no address at all).
  - **Experiment:** predict, then run `curl.exe -4 -s -o NUL -w "%{http_code} %{time_total}" https://www.google.com` and the same with `-6`. Then check whether my network has IPv6 at all (`ipconfig`, look for a global IPv6 address, not just `fe80::`).
  - **Why it matters for an uptime monitor:** a false Down is worse than no monitor. Real monitors record which IP they connected to and sometimes check both families separately.
  - Sources: RFC 8305 (Happy Eyeballs v2), https://www.rfc-editor.org/rfc/rfc8305 · Cloudflare Learning "What is IPv6?", https://www.cloudflare.com/learning/network-layer/what-is-ipv6/ · Node `net.setDefaultAutoSelectFamily`, https://nodejs.org/api/net.html#netsetdefaultautoselectfamilyvalue
- [ ] (P11) Use **Bun catalogs** to manage shared package versions in the monorepo (typescript first, then others shared by api/web/packages). Docs: https://bun.com/docs/pm/catalogs
- [ ] (P10) Decide: move `typescript` in apps/api from peerDependencies to devDependencies (or rely on the root/catalog).
- [ ] (P12) Move `@repo/typescript-config` in apps/api to devDependencies, and fix the two tsconfig comments.
- (P13) Server start: I'm handling it myself later. Not tracked here.
- [ ] (P26) **Prediction to try:** delete `DATABASE_URL` from `.env` and run a Prisma command from `packages/db-prisma`. Does it fail when TypeScript checks the file, or when the command runs? Why? (Write the prediction and reason down *before* running it. Then also try: remove the `!` and see what changes.)
  Sources: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#non-null-assertion-operator-postfix- · https://github.com/motdotla/dotenv#readme · https://www.prisma.io/docs/cli/orm-init
- [ ] (P39) **Restructure tsconfigs: base.json = Bun default, browser configs override.** Do the steps in order, then run every package's type check.
  1. **base.json** (becomes the Bun default):
     - `lib`: `["es2022","DOM","DOM.Iterable"]` → `["ESNext"]`
     - `module`: `NodeNext` → `Preserve`
     - `moduleResolution`: `NodeNext` → `bundler`
     - **add** `types: ["bun"]`
     - **add** `noEmit: true`
     - keep everything else (strict, noUncheckedIndexedAccess, isolatedModules, moduleDetection, skipLibCheck, esModuleInterop, resolveJsonModule, incremental false, declaration/declarationMap false, target ES2022)
  2. **react-library.json** (ui, browser):
     - keep `jsx: react-jsx`
     - **add** `lib` back with the browser libs (`ES2022`, `DOM`, `DOM.Iterable`)
     - **add** a `types` override: `[]`, or `["node"]` if ui code uses `process` etc. React's types still arrive through imports either way.
     - module/resolution: inheriting `Preserve`/`bundler` is fine, since ui is JIT source bundled by Next.
  3. **nextjs.json** (web, browser):
     - already sets module `ESNext`, moduleResolution `Bundler`, `allowJs`, `jsx preserve`, `noEmit` and the next plugin
     - **add** `lib` with the DOM libs (base no longer has them)
     - **add** a `types` override (`["node"]`, since web has `@types/node` and Next code uses `process.env`)
  4. **apps/api/tsconfig.json:** delete the overrides that now duplicate base (`lib`, `module`, `moduleResolution`, `types`, `noEmit`). Keep `allowImportingTsExtensions` and `verbatimModuleSyntax` (api-specific choices).
  5. **packages/db-prisma/tsconfig.json:** delete the duplicates (`target`, `module`, `moduleResolution`, `strict`, `skipLibCheck`, `esModuleInterop`, `resolveJsonModule`, `noEmit`). Drop `types: ["node"]` to inherit `["bun"]`, and **add `@types/bun`** to db-prisma's devDependencies. Keep `include: ["**/*.ts"]`. Move `@repo/typescript-config` to devDependencies.
  6. **Verify:** run each package's type check (`check-types` via turbo from the root, or `tsc --noEmit` per package). `tsc --showConfig` in a package prints the final merged config, to confirm what it actually inherited.
  - **Watch for:** "Cannot find type definition file for 'bun'" means a package inherits `types: ["bun"]` without `@types/bun` installed. That's either a browser config missing its `types` override, or a Bun package missing the devDependency.
  Sources: https://www.typescriptlang.org/tsconfig/#extends · https://www.typescriptlang.org/tsconfig/#lib · https://www.typescriptlang.org/tsconfig/#types · https://www.typescriptlang.org/tsconfig/#module · https://www.typescriptlang.org/tsconfig/#moduleResolution · https://www.typescriptlang.org/tsconfig/#noEmit · https://bun.com/docs/typescript-6 · https://nextjs.org/docs/app/api-reference/config/typescript · local Turborepo TS guide: `node_modules/.bun/turbo@2.11.10/node_modules/turbo/docs/guides/tools/typescript.mdx`
- [ ] (P43) **Split the api into Express Routers once the endpoints are designed.** Steps: list the resources and endpoints first. Pick feature-based folders. Separate `app` from `listen`. Make one router per resource, mounted on a versioned prefix. Register the error handler last. Watch for `mergeParams` on nested routers, and lost `req.params` inference in separate handler files (P9).
  Sources: https://expressjs.com/en/guide/routing.html#express-router · https://expressjs.com/en/5x/api.html#router · https://expressjs.com/en/guide/migrating-5.html · https://expressjs.com/en/guide/error-handling.html
- [ ] (P42, from P41) **Make the db client a hot-reload-safe singleton with `globalThis`, and learn where else singletons matter.**
  - **db first:** in `packages/db-prisma/src/prisma/db.ts`, reuse a client stored on `globalThis` if one exists, otherwise create it and store it (typically only outside production). Then test it: save a file ~10 times under `bun --hot` and watch `select count(*) from pg_stat_activity;`. It should stay flat (before/after comparison = prediction exercise).
  - **Understand why it works:** module top-level code re-runs on hot reload, but `globalThis` is the same object for the whole process, so it survives. A plain module-level `const` does not.
  - **TypeScript side:** `globalThis` doesn't know my property, so I'll need to declare its type (e.g. a typed cast, or `declare global`).
  - **Other things that usually need one shared instance** (to research as betteruptime grows):
    - other connection pools and clients: Redis, a message-queue/worker connection, any HTTP client with keep-alive agents;
    - **schedulers / cron / `setInterval` jobs**, which hot reload can run *twice* (duplicate uptime checks!);
    - event listeners registered at module load (duplicate handlers fire twice);
    - in-memory caches and rate limiters (state lost or split);
    - WebSocket servers or anything bound to a port ("address already in use");
    - loggers/telemetry exporters.
  - **Also learn the downside:** singletons are global state. They make tests harder (shared state between tests) and hide dependencies, which is why some code passes the instance in instead (*dependency injection*).
  Sources: https://www.prisma.io/docs/guides/nextjs (the `globalThis` Prisma pattern) · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis · https://bun.com/docs/runtime/watch-mode (`--hot` keeps `globalThis` across reloads; `--watch` restarts) · https://nodejs.org/api/esm.html (module evaluation/caching) · https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-modifying-module-d-ts.html (`declare global`) · https://refactoring.guru/design-patterns/singleton (pattern + drawbacks) · https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW
- [ ] (P41) **Prediction still open:** hit `GET /` twice with the fixed-email create. What does the 2nd response look like, does the server crash, and how many rows does `SELECT * FROM "User";` show?
  Sources: https://expressjs.com/en/guide/error-handling.html · https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
- [ ] (P30) **Experiment to try (2 min):** in a Bun REPL (`bun repl`), parse `postgresql://postgres:p@ss@localhost:5432/bstack` and then `postgresql://postgres:p#ss@localhost:5432/bstack` with `new URL(...)`. Before each, predict `.username`, `.password`, `.hostname`, `.port`. Then encode the password (`encodeURIComponent`) and compare.
  Sources: https://url.spec.whatwg.org/#authority-state (last-`@` rule) · https://developer.mozilla.org/en-US/docs/Web/API/URL · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent · https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING-URIS
- [ ] (P26) **Watch out:** `.env` is found relative to *where the command runs*, not where the config file is. When I first run Prisma (and later api) from the repo root or via turbo, check which `.env` gets loaded. See Failure signatures → P26.
  Sources: https://github.com/motdotla/dotenv#readme · https://bun.com/docs/runtime/env

**Node vs Bun, parked for later (P10 follow-ups; not needed right now):**
- [ ] (P14) Bun's built-in transpiler: what it actually does to a `.ts` file before running it.
  Sources: https://bun.com/docs/runtime/typescript · https://flaviocopes.com/what-happens-when-bun-runs-typescript/
- [ ] (P15) Why Bun (and esbuild, swc, Node type stripping) **don't type-check**: speed, plus per-file transpiling can't see types across files. What that means for CI (`tsc --noEmit` / `bun check`).
  Sources: https://esbuild.github.io/content-types/#typescript-caveats · https://www.typescriptlang.org/tsconfig/#isolatedModules · https://dev.to/gabrielanhaia/buns-typescript-support-in-2026-what-works-what-still-needs-tsc-9d4
- [ ] (P16) How this differs from Node: the classic `tsc → outDir → node dist/` flow vs Node's own type stripping (Node 22.18+/23.6+) vs Bun.
  Sources: https://nodejs.org/api/typescript.html · https://www.typescriptlang.org/docs/handbook/compiler-options.html (outDir) · https://bun.com/docs/runtime/typescript
- [ ] (P17) No outDir needed to *run* on Bun, vs `bun build --outdir` for *bundling* (when and why you'd still bundle for production).
  Sources: https://bun.com/docs/bundler · https://bun.com/docs/runtime/typescript ("you may not need to transpile your TypeScript to run in production")

**tsconfig, to learn properly later:**
- [ ] (P18) Setting up tsconfig from first principles: what each group (environment / module resolution / emit / strictness) controls, how `extends` layering works, and how a turborepo shares configs across apps.
  Sources: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html · https://www.typescriptlang.org/tsconfig/ (every option) · https://www.totaltypescript.com/tsconfig-cheat-sheet · https://bun.com/docs/typescript-6 · Turborepo TypeScript guide: local `node_modules/.bun/turbo@2.11.10/node_modules/turbo/docs/guides/tools/typescript.mdx` (matches the installed version) or https://turborepo.com/docs/guides/tools/typescript

**Error handling in the API (P48/P49):**
- [ ] (P49) **Check the DB connection and return the right error.** Add a health-check endpoint (e.g. `GET /health`) that runs a trivial query (`SELECT 1`) and returns 200, or 503 if the DB can't be reached. Also make a request that hits a *down* DB return 500/503 with a generic message (+ server log), never a misleading 4xx. Observe first: `docker stop rocky_road`, call signup, and note what the error looks like and how long the request hangs (the open P49 prediction).
  Sources: https://www.rfc-editor.org/rfc/rfc9110#name-503-service-unavailable · https://www.rfc-editor.org/rfc/rfc9110#name-500-internal-server-error · installed `@prisma/orm-postgres` → `skills/prisma-8/references/debug.md` (`SqlConnectionError` vs `SqlQueryError`) · https://docs.docker.com/reference/dockerfile/#healthcheck (how health checks are used) · https://microservices.io/patterns/observability/health-check-api.html
- [ ] (P48/P49) **Replace the temporary error codes.** Current convention (deliberate, 2026-11-12): **every `/signin` error → 409**, other endpoints' errors → **400** in general. Change each endpoint to the right code: signin failures → **401** (the same message for wrong password and unknown user), missing/invalid input → **400**, username/email taken → **409**, not found → **404**, unknown/DB-down → **500**. `claude_tests/tests.md` notes this convention, so manual test runs don't flag the generic codes. Update that note when this is done.
  Sources: https://www.rfc-editor.org/rfc/rfc9110#name-401-unauthorized · https://www.rfc-editor.org/rfc/rfc9110#name-409-conflict · https://www.rfc-editor.org/rfc/rfc9110#name-400-bad-request · https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401 · https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-and-error-messages
- [ ] (P54) **Password hashing + stop returning passwords** (deferred by me, 2026-11-12).
  - Hash at signup (`Bun.password.hash`, argon2id by default; built into Bun, no package).
  - At signin keep the current shape (look up by username only), but replace `user.password !== password` with `Bun.password.verify`.
  - Never send `password` (hashed or not) in any response: choose the returned fields, since `RETURNING` currently includes every column.
  - Existing plaintext rows (`claude_test_N`, `test1`) won't verify after the switch. In dev, delete them or re-create them.
  Sources: https://bun.com/docs/api/hashing · https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html · installed `@prisma/orm-postgres` → `skills/prisma-8/references/queries-postgres.md` (choosing returned columns / `select`)
- [ ] (P54) **Centralise error handling instead of a `try/catch` + `(error as Error).message` in every endpoint.**
  - A custom error class (`extends Error`, carries `status` + `message`).
  - Endpoints just *throw* it.
  - **One** 4-param error handler registered last does the `instanceof` checks once for the whole app: custom error → its status + message; anything else → 500 + fixed message + server log.
  - Replace the `as Error` assertions (no runtime check) with `instanceof`.
  - Also guard **every** required field (`username` too, not just `password`); Zod (P50) covers this.
  Sources: https://expressjs.com/en/guide/error-handling.html (Express 5 forwards rejected promises; writing error handlers) · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof · https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions · https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables
- [ ] (P48/P49) **Divide errors into expected (4xx) vs unexpected (5xx), with a status code for each.** List every error each endpoint can produce and give it a code: 400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict (username vs email, separate messages), 500 everything else. Identify DB errors by identity (`sqlState` `23505` unique / `23503` foreign key + `column`/`constraint`; log one real error first to see the wrapped shape). Re-throw unknown errors to one central 4-param error handler, registered last, which logs the real error and sends a generic 500. Never send `err.message` or stack traces to the client.
  Sources: https://www.rfc-editor.org/rfc/rfc9110#name-client-error-4xx · https://www.rfc-editor.org/rfc/rfc9110#name-server-error-5xx · https://expressjs.com/en/guide/error-handling.html · https://www.postgresql.org/docs/current/errcodes-appendix.html · installed `@prisma/orm-postgres` → `skills/prisma-8/references/debug.md` · https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html · https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status

- [ ] (P50) **Zod schema validation for request bodies.** *Problem it solves:* `req.body` is just whatever the client sent; TypeScript types vanish at runtime, so a missing `username` or a number where a string belongs reaches the DB (or crashes). Zod checks the shape **at runtime** at the API boundary, and turns the schema into a TS type (`z.infer`), so the check and the type can't drift apart.
  - Use `safeParse` (returns success/error) rather than `parse` (throws) in handlers, so invalid input becomes a clean **400** with the field errors (ties into the P48/P49 error buckets).
  - Don't forget `express.json()` middleware: without it `req.body` is `undefined` and every validation fails.
  - Monorepo idea: put shared schemas in a package (e.g. `packages/common`) so `apps/web` and `apps/api` validate with the same rules. Remember P7: each consumer must *declare* it, and P11: put `zod` in the catalog.
  - Version check: Zod 4 is the current major (different error-formatting APIs from Zod 3 tutorials). Check the docs, not old videos. Alternatives to know exist: Valibot, ArkType (all implement "Standard Schema").
  Sources: https://zod.dev · https://zod.dev/basics (`parse` vs `safeParse`, `z.infer`) · https://zod.dev/error-formatting · https://zod.dev/v4/changelog (Zod 3 → 4 changes) · https://expressjs.com/en/api.html#express.json · https://standardschema.dev · https://turborepo.com/docs/crafting-your-repository/creating-an-internal-package

**Prisma 8 (P54/P55):**
- [ ] (P55) **Learn the Prisma 8 ORM architecture** from its own docs. The pieces met so far, still to connect into one picture:
  - **contract** (`contract.prisma` → emit → `contract.json` + `contract.d.ts`)
  - **control plane vs runtime plane** (CLI/migrations vs the `db` client in the app)
  - **family / target** (`sql` family, `postgres` target)
  - **plans** (a compiled query = SQL + params) and how `db.orm` / `db.sql` / `db.raw` build them
  - **activities** (`orm-call` → statements → transaction)
  - **middleware hooks**
  - **marker / refs / migration graph**
  Sources: installed `packages/db-prisma/node_modules/@prisma/orm-postgres/skills/prisma-8/` (start with its `SKILL.md`, then `references/contract.md`, `queries.md`, `runtime.md`, `migrations.md`, `migration-model.md`) · https://www.prisma.io/docs (Prisma 8 section; check that it matches the RC version) · `prisma <command> --help` for CLI truth
- [ ] (P55) **DB middlewares to observe and track queries.** My first query logger is in `packages/db-prisma/src/prisma/db.ts`. Build it out: a query log (SQL + latency + row count via `activityEnded`), a slow-query warning (threshold), failed-statement logging, per-request query counts (to spot N+1: one request firing many queries), and `orm-call`-level timing. Decide what is **dev-only**. **Never log bind params in prod**: they contain passwords and personal data. Find out what else is worth tracking (pool usage, transaction rollbacks).
  Sources: installed `skills/prisma-8/references/runtime.md` § "Workflow: Custom middleware (query log, slow-query warning)" + § middleware order · `examples/prisma-8-demo/src/prisma/slow-query-warning.ts` (referenced there) · `references/debug.md` · https://www.postgresql.org/docs/current/runtime-config-logging.html (DB-side alternative: `log_statement`, `log_min_duration_statement`) · https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (what never to log)

- [ ] (P59) **Declaration merging in depth.**
  - Build the `Express.Request` augmentation for `userId` (the recipe in P59) and check it under `tsc`.
  - Then learn the rest of the feature: interface merging rules (member order, overload merging), namespace + function/class/enum merging, global vs module augmentation (when each works and the "file must be a module" rule), why `type` can't merge (interface vs type), and how libraries use it (Express, `@types/*` plugins like method-override, `Window` augmentation in browsers).
  - Compare with `res.locals`.
  Sources: https://www.typescriptlang.org/docs/handbook/declaration-merging.html · https://www.typescriptlang.org/docs/handbook/modules/reference.html#ambient-modules · https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces · installed `@types/express-serve-static-core/index.d.ts` lines 6–14 · https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/method-override/index.d.ts (a real augmentation, linked from Express's own comment) · https://www.totaltypescript.com/type-vs-interface-which-should-you-use
- [ ] (P58) **Switch the auth header to the standard `Authorization: Bearer <token>`.** Right now the raw token is the whole header value. Strip and check the `Bearer ` prefix in the middleware (401 if missing/wrong), so standard clients (Postman's Bearer auth, fetch wrappers, OpenAPI tools) work. Also learn the other auth **schemes** (`Basic`, `Bearer`, …) and `WWW-Authenticate` on a 401.
  Sources: https://www.rfc-editor.org/rfc/rfc6750#section-2.1 · https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization · https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/WWW-Authenticate · https://learning.postman.com/docs/sending-requests/authorization/authorization-types/#bearer-token

**Fundamentals to learn later (P57):**
- [ ] **Bits, bytes, hex and text encodings.** Why 1 byte = 2 hex characters (*1 byte = 8 bits; 1 hex char = 4 bits = 16 values (0–9, a–f), so 2 hex chars = 8 bits*). Then binary ↔ hex ↔ base64 ↔ base64url (why JWTs use base64url). What **`TextEncoder`** does: string → **UTF-8 bytes** in a `Uint8Array` (ASCII chars = 1 byte each, `é` = 2 bytes, emoji = 4), and `TextDecoder` for the reverse. Why "a string" and "its bytes" are different things (characters vs code points vs bytes).
  Sources: https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array · https://developer.mozilla.org/en-US/docs/Glossary/Base64 · https://www.rfc-editor.org/rfc/rfc4648 (base16/hex, base64, base64url) · https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/ · https://en.wikipedia.org/wiki/Hexadecimal
- [ ] **Detailed JWT security review: what's wrong with a hard-coded, short secret like `"secret_key"`.**
  - *Hard-coded:* it sits in git history forever (deleting it later doesn't remove it), it's the same in dev and prod, anyone with repo access can mint tokens for any user, and rotating it needs a code change + deploy.
  - *Short/guessable:* an HS256 token **can be brute-forced offline**. Anyone holding one valid token can try millions of secrets per second (hashcat/john) until the signature matches, with no rate limit, because it never touches your server. Once found, they can sign `sub` = any user.
  - Also: rotating secrets (old + new key during the switch, `kid`), where secrets live (env vars, secret managers), and the attacks to know (`alg: none`, alg confusion, missing `exp`, tokens in localStorage vs httpOnly cookies).
  Sources: https://www.rfc-editor.org/rfc/rfc8725 (JWT Best Current Practices) · https://www.rfc-editor.org/rfc/rfc7518#section-3.2 · https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html · https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html · https://portswigger.net/web-security/jwt (hands-on labs, incl. brute-forcing weak secrets) · https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning

**Future project (my idea, 2026-11-13):**
- [ ] (P57) **Build something that uses *asymmetric* JWTs** (RS256 / ES256 / EdDSA) instead of HS256. Symmetric and asymmetric solve different needs. Asymmetric = a private key **signs** (only the auth service has it), and a public key **verifies** (any service can have it, but can't mint tokens). Learn: generating a key pair (`jose.generateKeyPair`), exporting/importing keys (PEM/JWK), publishing public keys as a **JWKS** endpoint (`/.well-known/jwks.json`), verifying with `createRemoteJWKSet`, `kid` (key id) and **key rotation**. A good fit: a separate auth service + 2 APIs that only verify, or "sign in with X" (OIDC) where Google/GitHub sign and you verify.
  Sources: https://github.com/panva/jose (generateKeyPair, importPKCS8/importSPKI, exportJWK, createRemoteJWKSet) · https://www.rfc-editor.org/rfc/rfc7517 (JWK / JWKS) · https://www.rfc-editor.org/rfc/rfc7518#section-3.1 (RS256/ES256 vs HS256) · https://www.rfc-editor.org/rfc/rfc8037 (EdDSA in JOSE) · https://auth0.com/blog/rs256-vs-hs256-whats-the-difference/ · https://openid.net/specs/openid-connect-core-1_0.html (where asymmetric tokens show up in practice)

**Deep dive, AFTER finishing the project:**
- [ ] (P19) How Express's types work internally (the P9 "why does `req: Request` change the type" walkthrough), properly:
  - generic types and type-parameter defaults (`Request<P = ParamsDictionary>`)
  - generic functions inferring from arguments (`app.get` capturing the literal `"/monitors/:id"`)
  - template literal types + conditional types + `infer` (how `RouteParameters` parses `:id` / `*path` out of a string)
  - contextual typing vs explicit annotations (why the annotation wins and throws away the route info)
  - index signatures + `noUncheckedIndexedAccess` (where the `| undefined` comes from)
  - reading a real `.d.ts` file end to end (`ParamsDictionary`, `RequestHandler`, `IRouterMatcher`)
  Sources: installed `node_modules/.bun/@types+express-serve-static-core@5.1.3/node_modules/@types/express-serve-static-core/index.d.ts` (lines 44–47, 55–68, 103–122, 125–141) · https://www.typescriptlang.org/docs/handbook/2/generics.html · https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html · https://www.typescriptlang.org/docs/handbook/2/conditional-types.html (`infer`) · https://www.typescriptlang.org/docs/handbook/type-inference.html#contextual-typing · https://www.typescriptlang.org/docs/handbook/2/objects.html#index-signatures · https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess · https://dev.to/shiftyp/my-type-of-coding-express-route-param-types-3ll9 · https://github.com/type-challenges/type-challenges (practice for template literal / infer types)

### Questions
- (P31) Run `prisma skills sync`? If yes, limit `skills.agents` to Claude Code only. Or `--disable` the warning.
- (P31) What exactly are Prisma 8 "contract spaces", and what's the migration workflow for destructive changes (dropping or renaming columns)?
- (P23, resolved) Shared package `packages/db-prisma`.
- (P25, resolved) Blank. Importable via `name` + `exports` + the consumer declaring the dependency.
- (P21) Use Prisma 8 RC (`@latest`) or pin 7.10.1, to match tutorial/course material?

- Verify exactly what the Library template writes differently from Blank. Either run it in a scratch folder and diff the two `package.json` files, or read `init_command.zig` in the oven-sh/bun repo.
- Does betteruptime need one package or several (API, worker, dashboard)? That decides whether `bun init` runs once or once per app. (Partly answered: it's a turborepo with apps/api (Express) and apps/web (Next).)
- Keep, trim, or delete apps/api/.gitignore? My decision, pending.
- (P3) TypeScript version: the root has 7.0.2, web pins 7.0.2, and api says peer `^7`. Pick one strategy: root-only, catalog, or matching devDependencies. Should api's entry be peer or dev?
- (P8) Put the Bun overrides directly in apps/api/tsconfig.json, or create a shared `bun.json` in packages/typescript-config (like nextjs.json)? A future worker app would also be Bun.
- The repo lives at `d:\cohort\betteruptime\betteruptime\` (a nested folder with the same name). `.git` is in the inner one. Intended?

## 7. Staying current

(fill at end of topic)

## 8. Reading list

- **How I learn best: Predict → Observe → Explain.** Commit to a prediction about real behaviour, run a tiny experiment, explain the gap. Turned into a reusable skill: `C:\Users\swaro\.claude\skills\predict-observe-explain\SKILL.md`. Background: White & Gunstone, *Probing Understanding* (1992), the original POE technique · "generation effect" (Slamecka & Graf, 1978) · "hypercorrection effect" (Butterfield & Metcalfe, 2001).

- Bun docs, `bun init`: https://bun.com/docs/runtime/templating/init
- Bun docs, `bun create` (templates from GitHub/npm): https://bun.com/docs/runtime/templating/create
- Bun docs, TypeScript 6/7 changes and recommended tsconfig: https://bun.com/docs/typescript-6
- TypeScript 6.0 changes overview: https://blog.openreplay.com/whats-new-typescript-6-0/
- TSConfig reference (each option explained): https://www.typescriptlang.org/tsconfig/
- Bun catalogs (one version across workspaces): search "bun workspaces catalog" on bun.com/docs
