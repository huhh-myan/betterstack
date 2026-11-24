# 07: JavaScript, TypeScript, Node and Bun

Interviewers love these because they're quick to ask and reveal real understanding.

## 1. The event loop

**Problem it solves:** JavaScript runs your code on **one thread**, yet a server handles thousands of requests that each wait on the network. The event loop is how one thread juggles them.

```
call stack runs your code
   │ when it's empty:
   ▼
microtask queue  (promise callbacks, await continuations, queueMicrotask)  ← drained COMPLETELY first
   ▼
macrotask queue  (setTimeout, setInterval, I/O callbacks, setImmediate)    ← one task, then microtasks again
```

- I/O (network, files) happens **outside** your thread (OS / libuv / Bun's runtime); when it finishes, a callback is queued.
- **Blocking the loop** (a `while` loop crunching numbers, `JSON.parse` of a huge string, sync file reads) blocks *every* request. CPU-heavy work → worker threads or another process.

<details><summary>Predict the output: `console.log(1); setTimeout(()=>console.log(2)); Promise.resolve().then(()=>console.log(3)); console.log(4)`</summary>

`1 4 3 2`: synchronous first (1, 4), then microtasks (3), then the timer macrotask (2).
</details>

## 2. Promises and async/await (your ⭐ P86)

- A **promise** is a placeholder for a future value: pending → fulfilled or rejected.
- `await p` **pauses only the async function it's in** and returns control to the event loop. It never blocks the thread.
- **Serial:** `for (const x of xs) await work(x)`: each waits for the previous.
- **Concurrent:** `await Promise.all(xs.map(work))`: all start, then wait together.

| Combinator | Resolves when | Rejects when | Use |
|---|---|---|---|
| `Promise.all` | all fulfil | **first** rejection | all needed; fail fast |
| `Promise.allSettled` | all settle | never | independent jobs (your worker) |
| `Promise.race` | first settles | first settles with rejection | timeouts |
| `Promise.any` | first fulfils | all reject | fastest mirror |

- **Floating promise** (P68): calling an async function without `await`/`return`, so errors escape your `try/catch` and the work may not be done yet.
- **Limiting concurrency:** `Promise.all` over 10,000 URLs opens 10,000 sockets. Batch (your worker reads `BATCH_SIZE` jobs) or use a pool (`p-limit`).

<details><summary>Why does `xs.forEach(async x => await save(x))` followed by "done" print "done" before saving finishes?</summary>

`forEach` ignores the promises its callback returns; it doesn't await them. Use `for…of` with `await` (serial) or `await Promise.all(xs.map(save))` (concurrent).
</details>

## 3. Core JS concepts asked at entry level

| Concept | One-line explanation | Classic question |
|---|---|---|
| **Closures** | a function remembers variables from where it was created | counter factory; `var` in a loop with `setTimeout` prints the same number |
| **`var` / `let` / `const`** | function scope + hoisting vs block scope; `const` = no reassignment (objects still mutable) | TDZ (temporal dead zone) errors |
| **`this`** | depends on how a function is **called**; arrow functions take `this` from where they're defined | `obj.method` passed as a callback loses `this` |
| **`==` vs `===`** | loose (coerces types) vs strict | `0 == ''` is true |
| **Reference vs value** | objects/arrays are passed by reference (a copy of the reference) | mutating an argument changes the caller's object |
| **Shallow vs deep copy** | `{...obj}` copies one level; `structuredClone` copies deep | nested objects are still shared |
| **Prototypes** | objects inherit via a prototype chain; `class` is syntax on top | how does `method` lookup work |
| **Debounce / throttle** | run once after quiet / at most every N ms | implement debounce |
| **Array methods** | `map`, `filter`, `reduce`, `find`, `some`, `every`, `flatMap` | implement `map` with `reduce` |

## 4. TypeScript you should be fluent in

- **Types vs runtime:** types are erased. `!` and `as` don't check anything at runtime (P26). Validation (Zod) is how you get runtime guarantees.
- **`string` vs `String`** (P67): lowercase primitives; capital letters are wrapper objects. Always lowercase.
- **Unions + narrowing:** `string | null`, narrowed by `if (x !== null)`, `typeof`, `in`, discriminated unions (`{ status: "Up" } | { status: "Down"; error: string }`).
- **Generics:** `function first<T>(xs: T[]): T | undefined`, which keeps the type flowing.
- **Utility types:** `Partial`, `Required`, `Pick`, `Omit`, `Record`, `ReturnType`, `Awaited`, `NonNullable`.
- **`interface` vs `type`:** mostly interchangeable; interfaces can merge (P59), types can express unions and mapped types.
- **Declaration merging** (P59, ⭐): same-named interfaces merge; `declare global` inside a module adds to the global scope. The worker's fix moved `Request.user_id` into `src/auth.ts`.
- **`unknown` vs `any`:** `unknown` forces a check before use; `any` turns checking off.
- **`satisfies`:** check a value against a type without widening it.
- **Typing promises** (your P88): `async function f(): Promise<User>`; `Promise.allSettled` returns `PromiseSettledResult<T>[]`.

<details><summary>Why does `const id = process.env.DATABASE_URL!` not protect you?</summary>

`!` only tells the compiler "trust me"; at runtime the value can still be `undefined`, and the failure appears later and further from the cause. Check it and throw a clear error (what `db.ts` now does).
</details>

## 5. Modules and packages

- **Module** = a file with its own scope; **package** = a folder with `package.json` made of modules (P59).
- **ESM** (`import`/`export`, static, async loading) vs **CommonJS** (`require`/`module.exports`, sync). Node supports both; mixing them causes the classic "require of ES module" errors.
- **`exports` field** in `package.json` controls which files outsiders can import (P35).
- **Side effects at import time** run on every import (P70): keep modules declarative and put startup in `main()`.

## 6. Node vs Bun (you'll be asked "why Bun?")

| | Node | Bun |
|---|---|---|
| TypeScript | needs a build step or `tsx` (newer Node versions can strip types) | runs `.ts` directly (transpiles, **doesn't type-check**) |
| Package manager | npm/pnpm/yarn | built in, fast |
| Test runner | `node:test` or Jest/Vitest | `bun test` |
| Maturity | very mature, huge ecosystem | newer; occasional compatibility gaps (your P63 runtime/types mismatch) |

Good answer: "Bun for speed and fewer tools; I still type-check with `tsc --noEmit` because Bun doesn't."

## Recall questions

<details><summary>Your API handler does `for (let i = 0; i < 1e9; i++) {}`. What happens to other users' requests?</summary>

They all wait: the loop blocks the single JS thread, so the event loop can't run any other callbacks until it finishes.
</details>

<details><summary>`Promise.all` vs `allSettled` for checking 10 websites, which and why?</summary>

`allSettled`: the checks are independent, and one failure shouldn't hide the other nine results. `all` rejects on the first failure.
</details>

<details><summary>What's printed? `for (var i=0;i<3;i++) setTimeout(()=>console.log(i))` and with `let`?</summary>

`var`: 3 3 3 (one shared function-scoped `i`, already 3 when the timers run). `let`: 0 1 2 (a new binding per iteration).
</details>

<details><summary>What's the difference between `unknown` and `any`?</summary>

Both accept any value, but `unknown` requires narrowing before you use it, while `any` disables type checking entirely.
</details>

## Likely interview questions

1. Explain the event loop. What are microtasks?
2. What's a closure? Give a real use.
3. How does `async/await` relate to promises?
4. Implement `debounce` / `Promise.all` / `Array.prototype.map`.
5. `interface` vs `type`? What are generics for?
6. How does Node handle concurrency with one thread?

## Resources

- javascript.info (the best free JS reference; event loop and promises chapters): https://javascript.info/
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- Node.js "Event loop, timers and process.nextTick": https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
- Jake Archibald, "In The Loop" (JSConf talk on the event loop)
