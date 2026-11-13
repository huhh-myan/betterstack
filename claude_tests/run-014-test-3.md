# Run 014: Test 3 (only the steps that failed in run 013)

- **Test:** 3, **partial run**: setup (steps 1–3, needed for a token and ids) + the steps that failed in run 013 (**5, 11, 20**) + 18b (list regions after the create)
- **Time:** 2026-11-13 18:30:04 IST (2026-11-13 13:00:04 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (after the user's `Math.floor(id)` change)
- **Captured values:**
  - `a_id` = `38455b96-1c9f-48e1-a410-4c9430526d31`
  - `b_id` = `032c872c-4617-4642-9bc3-0a880bcb966e`
- **Result:**
  - Step 20 fails again, now on **`name`** (null) instead of `id`. The id is now a whole number (`42770`).
  - Steps 5/11 still 404 (the route was removed).
- **Written to the DB:** users `claude_test_14_a`, `claude_test_14_b`. No region.

## Summary

| Step | Request | Auth | Status | Outcome | vs run 013 |
|---|---|---|---|---|---|
| 1 | `POST /signup` (A) | none | 200 | A created | same |
| 2 | `POST /signin` (A) | none | 200 | token_a issued | same |
| 3 | `POST /signup` (B) | none | 200 | B created (for b_id in step 11) | same |
| 5 | `GET /user/{a_id}` | token_a | 404 | HTML "Cannot GET /user/…" | same |
| 11 | `GET /user/{b_id}` | token_a | 404 | HTML "Cannot GET /user/…" | same |
| 20 | `POST /region/create` `{"name":"claude-region-14"}` | token_a | **400** ❌ | `23502` on **`Region.name`**; failing row `(42770, null)` | 22P02 (id) → 23502 (name) |
| 18b | `GET /region/list` | token_a | 200 | `[]`: nothing created | same |

## Details
```
POST /signup {"username":"claude_test_14_a","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T13:00:04.196Z","id":"38455b96-1c9f-48e1-a410-4c9430526d31","password":"pass123","username":"claude_test_14_a"}}
POST /signin {"username":"claude_test_14_a","password":"pass123"}
→ 200 {"user_id":"38455b96-1c9f-48e1-a410-4c9430526d31","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzQ4MDQsImV4cCI6MTc5NDU4MjAwNCwic3ViIjoiMzg0NTViOTYtMWM5Zi00OGUxLWE0MTAtNGM5NDMwNTI2ZDMxIn0.e9b1w49LA2cmuPCPHYavI1xJy59qEng0cAJV1n-oLf4"}
POST /signup {"username":"claude_test_14_b","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T13:00:04.441Z","id":"032c872c-4617-4642-9bc3-0a880bcb966e","password":"pass123","username":"claude_test_14_b"}}

GET /user/38455b96-…  Authorization: <token_a>
→ 404 <pre>Cannot GET /user/38455b96-1c9f-48e1-a410-4c9430526d31</pre>
GET /user/032c872c-…  Authorization: <token_a>
→ 404 <pre>Cannot GET /user/032c872c-4617-4642-9bc3-0a880bcb966e</pre>

POST /region/create  Authorization: <token_a>  {"name":"claude-region-14"}
→ 400 {"message":"error creating region","error":{"kind":"sql_query","sqlState":"23502","table":"Region","column":"name","detail":"Failing row contains (42770, null).","name":"SqlQueryError"}}

GET /region/list  Authorization: <token_a>
→ 200 []
```

## Notes
- **Step 20, progress:** `Math.floor` fixed the 22P02. The id is now the integer `42770`.
- **Step 20, new cause: a field-name mismatch between the test and the handler.** The handler reads `const { regionName } = req.body` (index.ts:167), but test 3 sends **`name`**. So `regionName` is `undefined` → `name: undefined` → the column gets NULL → `23502` on `name`. That's the same "`undefined` silently passes through" lesson as P54. Validation (Zod, P50) would turn it into a clear 400 "regionName is required".
- **Not changed by Claude:** per the test rules, the request was run as written. **The user decides the API's field name:** either the handler reads `name` (matches the model field), or test 3's step 20 body becomes `{"regionName": …}`.
- Steps 5/11: `GET /user/:id` no longer exists. They need a new target, or should be removed from test 3.
