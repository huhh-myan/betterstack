# 11: DSA and CS fundamentals

**Why this matters even for web roles:** most entry-level hiring starts with an online assessment or a coding round. A great project gets you past resume screening; DSA gets you past round one. Your logs show strong debugging and systems thinking but no DSA practice yet, so this is the biggest gap for a 1-month push.

## 1. DSA: a 4-week plan (about 2–3 hours a day)

Do **patterns, not random problems.** For each pattern: learn the idea, solve 3–5 problems, then redo the ones you failed two days later.

| Week | Patterns | Example problems (LeetCode numbers) |
|---|---|---|
| 1 | Big-O, arrays and hashing, two pointers, sliding window, prefix sums | Two Sum (1), Contains Duplicate (217), Valid Anagram (242), Group Anagrams (49), Valid Palindrome (125), 3Sum (15), Best Time to Buy and Sell Stock (121), Longest Substring Without Repeating Characters (3), Product of Array Except Self (238) |
| 2 | Stack, binary search, linked lists, recursion | Valid Parentheses (20), Min Stack (155), Daily Temperatures (739), Binary Search (704), Search in Rotated Sorted Array (33), Reverse Linked List (206), Merge Two Sorted Lists (21), Linked List Cycle (141) |
| 3 | Trees (DFS/BFS), graphs, heaps, intervals | Max Depth of Binary Tree (104), Invert Tree (226), Level Order Traversal (102), Validate BST (98), Number of Islands (200), Course Schedule (207), Kth Largest Element (215), Merge Intervals (56) |
| 4 | Basic DP, mixed timed practice | Climbing Stairs (70), House Robber (198), Coin Change (322), Longest Increasing Subsequence (300); then 2 random mediums/day under a 40-min timer |

**How to practise:**
1. Try for 20–25 min.
2. If stuck, read the *approach only*, then code it yourself.
3. Write the time and space complexity.
4. Explain your solution out loud, as in an interview.

**Use JavaScript/TypeScript** (you know it best). Know `Map`, `Set`, arrays as stacks/queues, and sorting with a comparator: `arr.sort((a,b)=>a-b)`, because the default sort is lexicographic.

### Big-O cheat sheet

| Operation | Complexity |
|---|---|
| Array index / push / pop | O(1) |
| Array `shift` / `unshift` / `includes` | O(n) |
| `Map` / `Set` get, set, has | O(1) average |
| Sort | O(n log n) |
| Binary search | O(log n) |
| BFS/DFS on a graph | O(V + E) |
| Heap push/pop | O(log n) |
| B-tree index lookup (05) | O(log n) |

## 2. Operating systems (connect each to your project)

| Topic | Know | Your project hook |
|---|---|---|
| **Process vs thread** | process = own memory; threads share memory inside a process | each `bun index.ts` is a process; JS runs your code on one thread |
| **Concurrency vs parallelism** | interleaving tasks vs literally simultaneous | your worker is *concurrent* (many checks waiting at once) on one thread, not parallel |
| **Context switching** | the OS swapping threads/processes on a CPU | your P86 question: `await` isn't a context switch, it's the event loop |
| **Race conditions, locks, deadlock** | shared state + bad timing; mutexes; the four deadlock conditions | two admins approving at once (05); Postgres row locks |
| **Memory: stack vs heap** | call frames vs dynamic allocation; garbage collection | the connection pool leaking on hot reload (P41) |
| **Environment variables, PATH** | per-process key/values inherited from the parent | your P26, P70, P99 (`.env`, PATH) |
| **Signals** | SIGINT (Ctrl+C), SIGTERM (stop), SIGKILL (can't be caught) | the worker finishes its batch on SIGINT |

## 3. Networking

| Topic | Know |
|---|---|
| **"What happens when you type a URL?"** | DNS lookup → TCP handshake (SYN, SYN-ACK, ACK) → TLS handshake (HTTPS) → HTTP request → server processes → response → browser parses and renders. (Asked *very* often.) |
| **TCP vs UDP** | reliable, ordered, connection-based vs fast, connectionless (DNS, video, games) |
| **DNS** | name → IP; records A, AAAA, CNAME, MX; caching with TTL; your worker's "DNS lookup failed" |
| **HTTP/1.1 vs 2 vs 3** | one request per connection at a time → multiplexed streams → over QUIC/UDP |
| **HTTPS/TLS** | encryption + server identity via certificates |
| **Ports, localhost, NAT** | your P30: `localhost` inside a container is the container |
| **Load balancers, proxies** | reverse proxy (Nginx, your Next.js rewrite) vs forward proxy |
| **WebSockets / SSE** | server push for live dashboards (a next step for bstack) |

## 4. DBMS (overlaps with 05)

Normalisation (1NF–3NF in one sentence each), keys (primary, foreign, candidate), indexes, ACID, isolation levels, joins, SQL queries (top-N per group, second-highest salary), transactions and locks.

## 5. OOP and design basics

- The four pillars: encapsulation, abstraction, inheritance, polymorphism, each with a short TS example.
- **SOLID**, at least S (single responsibility: your API's split into `routes/`, `auth.ts`, `errors.ts`) and D (depend on abstractions: injecting a DB client makes code testable).
- Common patterns you've used: middleware chain (chain of responsibility), singleton (`db` client), producer–consumer (pusher/worker), repository/data layer (`lib/data.ts`).

## Recall questions

<details><summary>Your worker checks 10 sites "at the same time" on one thread. Concurrency or parallelism?</summary>

Concurrency: the checks overlap in time because each is mostly waiting on the network, and the single thread switches between them via the event loop. Parallelism would mean simultaneous execution on multiple cores.
</details>

<details><summary>What are the four conditions for deadlock?</summary>

Mutual exclusion, hold and wait, no preemption, circular wait. Break any one to prevent deadlock (e.g. always lock rows in the same order).
</details>

<details><summary>Why does `[10, 9, 1].sort()` give `[1, 10, 9]` in JavaScript?</summary>

The default sort converts elements to strings and compares lexicographically. Use `sort((a, b) => a - b)` for numbers.
</details>

## Resources

- NeetCode roadmap + the NeetCode 150 list (pattern-ordered): https://neetcode.io/roadmap
- LeetCode (practice), plus your target companies' tagged questions if you have Premium
- *Grokking Algorithms* (gentle visual intro)
- Computer Networking basics: "How DNS works" (https://howdns.works/), Cloudflare Learning Center (https://www.cloudflare.com/learning/)
- OS: Neso Academy / Gate Smashers (YouTube) for quick revision of process/thread/deadlock
