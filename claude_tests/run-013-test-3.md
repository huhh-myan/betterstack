# Run 013: Test 3

- **Test:** 3 (JWT auth middleware + every protected endpoint)
- **Time:** 2026-11-13 18:25:25 IST (2026-11-13 12:55:25 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (after the user's `Region.id = Math.random()*100000 + Math.random()*Math.random()` change)
- **Captured values:**
  - `a_id` = `c48dfa43-f3ff-4ba5-b3a2-51e44e2ba295`
  - `b_id` = `5a049da2-d24d-4fee-9497-87cd8a03be18`
  - `site_a` = `c980d686-c376-49c0-9b18-7fd7d05fda9b`
- **Result:**
  - Steps 1–19 are identical to run 012.
  - **Step 20 fails with a different DB error:** `22P02` (invalid input for the integer column) instead of `23502` (null id).
  - Still no region.
- **Written to the DB:**
  - users `claude_test_13_a`, `claude_test_13_b`
  - website `https://example.com/a13` (owner A)
  - website `https://example.com/b-as-a13` (owner B)
  - no region

## Summary

| Step | Request | Auth | Status | Outcome | vs run 012 |
|---|---|---|---|---|---|
| 1–4 | sign up / sign in A, B | none | 200 | both tokens issued | same |
| 5 | `GET /user/{a_id}` | token_a | 404 | HTML "Cannot GET /user/…" (route removed) | same |
| 6–10 | bad tokens | various | 400 ✅ | blocked (+ jose stack) | same |
| 11 | `GET /user/{b_id}` | token_a | 404 | route removed | same |
| 12 | create website | token_a | 200 ✅ | owner A | same |
| 13 | create website | absent | 400 ✅ | blocked | same |
| 14 | create, body `user_id` = A | token_b | 200 ✅ | owner B | same |
| 15 | `GET` site_a | token_a | 200 ✅ | A's site | same |
| 16 | `GET` site_a | token_b | 200 ✅ | `{"website":null}` | same |
| 17 | `GET` site_a | absent | 400 ✅ | blocked | same |
| 18 | `GET /region/list` | token_a | 200 ✅ | `[]` | same |
| 19 | `GET /region/list` | absent | 400 ✅ | blocked | same |
| 20 | `POST /region/create` | token_a | **400** ❌ | `SqlQueryError` **`22P02`** | 23502 → 22P02 |
| 18b | *(extra)* `GET /region/list` after step 20 | token_a | 200 | `[]`: nothing was created | — |

## Details

### Setup (steps 1–4)
```
POST /signup {"username":"claude_test_13_a","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T12:55:25.784Z","id":"c48dfa43-f3ff-4ba5-b3a2-51e44e2ba295","password":"pass123","username":"claude_test_13_a"}}
POST /signin (same body)
→ 200 {"user_id":"c48dfa43-f3ff-4ba5-b3a2-51e44e2ba295","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzQ1MjUsImV4cCI6MTc5NDU4MTcyNSwic3ViIjoiYzQ4ZGZhNDMtZjNmZi00YmE1LWIzYTItNTFlNDRlMmJhMjk1In0.HIqukgQierJfuFvAbN1NGcwhJq20KJVR1bs0XCUZ5qo"}
POST /signup {"username":"claude_test_13_b","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T12:55:26.075Z","id":"5a049da2-d24d-4fee-9497-87cd8a03be18","password":"pass123","username":"claude_test_13_b"}}
POST /signin (same body)
→ 200 {"user_id":"5a049da2-d24d-4fee-9497-87cd8a03be18","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzQ1MjYsImV4cCI6MTc5NDU4MTcyNiwic3ViIjoiNWEwNDlkYTItZDI0ZC00ZmVlLTk0OTctODdjZDhhMDNiZTE4In0.-IJA2ShmFQlNI1L2SMjyMGH1WXRA1FsQUjZaRcvkjFw"}
```

### Steps 5–11
```
GET /user/c48dfa43-…  token_a  → 404 <pre>Cannot GET /user/c48dfa43-f3ff-4ba5-b3a2-51e44e2ba295</pre>
GET /user/5a049da2-…  token_a  → 404 <pre>Cannot GET /user/5a049da2-d24d-4fee-9497-87cd8a03be18</pre>
```
- 6, 7: `ERR_JWS_INVALID`
- 8: `ERR_JWS_SIGNATURE_VERIFICATION_FAILED`
- 9: `ERR_JOSE_NOT_SUPPORTED`
- 10: `ERR_JWS_INVALID` ("Protected Header is invalid")
- All 400, `{"message":"Authorization Error!","error":{…,"stack":"… (trimmed)"}}`

### Steps 12–17
```
POST /user/website/create token_a {"url":"https://example.com/a13","user_id":"<a_id>"}
→ 200 {"website":{"id":"c980d686-c376-49c0-9b18-7fd7d05fda9b","timeAdded":"2026-11-13T12:55:28.074Z","url":"https://example.com/a13","user_id":"c48dfa43-f3ff-4ba5-b3a2-51e44e2ba295"}}
POST /user/website/create (none) → 400 Authorization Error! ERR_JWS_INVALID
POST /user/website/create token_b {"url":"https://example.com/b-as-a13","user_id":"<a_id>"}
→ 200 {"website":{"id":"542e5851-1aca-478c-a467-45a0cb0560a6","timeAdded":"2026-11-13T12:55:28.406Z","url":"https://example.com/b-as-a13","user_id":"5a049da2-d24d-4fee-9497-87cd8a03be18"}}
GET /user/website/c980d686-… token_a
→ 200 {"website":{"id":"c980d686-c376-49c0-9b18-7fd7d05fda9b","timeAdded":"2026-11-13T12:55:28.074Z","url":"https://example.com/a13","user_id":"c48dfa43-f3ff-4ba5-b3a2-51e44e2ba295"}}
GET /user/website/c980d686-… token_b → 200 {"website":null}
GET /user/website/c980d686-… (none)  → 400 Authorization Error! ERR_JWS_INVALID
```

### Steps 18–20 (+ 18b)
```
GET /region/list token_a → 200 []
GET /region/list (none)  → 400 Authorization Error! ERR_JWS_INVALID
POST /region/create token_a {"name":"claude-region-13"}
→ 400 {"message":"error creating region","error":{"kind":"sql_query","sqlState":"22P02","name":"SqlQueryError"}}
GET /region/list token_a (after step 20) → 200 []
```

## Notes
- **Step 20, `22P02` = Postgres `invalid_text_representation`** ("invalid input syntax for type integer"). The id `Math.random()*100000 + …` is a **fraction** (e.g. `48213.07…`), and `Region.id` is an **Int** column, so Postgres refuses it. The id is no longer null (the 23502 is gone), but it's the wrong *kind* of number.
- This error carries no `detail`, so it doesn't show whether `name` is now the plain string (the run 012 bug). That will be visible once the insert succeeds.
- Steps 5/11 still target the removed `GET /user/:id`. They need a new target once the replacement route exists.
