# betteruptime: manual test definitions

The test steps that Claude runs when you say "test N". Results are saved to `run-NNN-test-N.md` in this folder (one file per run, numbered across all runs).

**Placeholders:**
- `{{base}}` = `http://localhost:3000`
- `{{run}}` = this run's number, without padding (so usernames are unique per run)
- `{{name}}` = a value captured from an earlier step in the same run

Every POST is sent with the header `Content-Type: application/json`.

**The API's current error codes are temporary (decided 2026-11-12):**
- Every error from `/signin` returns **409**.
- Errors from the other endpoints generally return **400**.

Success responses don't set an explicit status yet, so Express's default **200** comes back (e.g. signup returns 200, not 201). That's also deliberate for now. Proper per-error codes come later (it's on the learning-log To do list, under P48/P49). Until then:
- Record the status codes as they come back.
- Don't treat a 409 or 400 as a bug just because the code is generic.
- Do flag anything that should be an error but comes back **200**, and any **500**. Those are real problems whatever the convention is.

---

## Test 1: signup → signin → create website → get website

| Step | Request | Body | Capture from response |
|---|---|---|---|
| 1 | `POST {{base}}/signup` | `{"username":"claude_test_{{run}}","password":"pass123"}` | `user_id` ← `user_id.id` (the response's `user_id` key holds the whole user object; changed in run 002) |
| 2 | `POST {{base}}/signin` | `{"username":"claude_test_{{run}}","password":"pass123"}` | `token` ← `token` (added 2026-11-13: signin now returns a JWT) |
| 3 | `POST {{base}}/user/website/create`, header `Authorization: {{token}}` | `{"url":"https://example.com","user_id":"{{user_id}}"}` | `website_id` ← `website.id` |
| 4 | `GET {{base}}/user/website/{{website_id}}`, header `Authorization: {{token}}` | none | none |

**Changed 2026-11-13 (before run 010):** the website routes now sit behind the JWT middleware (`app.use(jsonMiddleware)`), so steps 3–4 send the token from step 2 as the raw `Authorization` header value (no `Bearer ` prefix, per the user's current design). If `token` is missing, send no `Authorization` header and note it. Runs 001–002 predate this change.

**If a capture is missing** because an earlier step failed:
- Step 3 sends `"user_id":"none-yet"`.
- Step 4 uses `does-not-exist` as the id.
- Note the substitution in the results file.

**What to check in the database after a run:**
- `"User"` has a row with username `claude_test_<run>`.
- `"Website"` has a row with url `https://example.com` linked to that user.

---

## Test 2: signin with bad credentials

| Step | Request | Body | Capture from response |
|---|---|---|---|
| 1 | `POST {{base}}/signup` (a known user to sign in against) | `{"username":"claude_test_{{run}}","password":"pass123"}` | none |
| 2 | `POST {{base}}/signin`: **wrong password** | `{"username":"claude_test_{{run}}","password":"wrong-pass"}` | none |
| 3 | `POST {{base}}/signin`: **username that doesn't exist** | `{"username":"no_such_user_{{run}}","password":"pass123"}` | none |
| 4 | `POST {{base}}/signin`: **no password field at all** | `{"username":"claude_test_{{run}}"}` | none |
| 5 | `POST {{base}}/signin`: **no username field at all** (added after run 006) | `{"password":"pass123"}` | none |

**Note on step 5:** every `claude_test_N` user so far has the password `pass123`, so this probes whether a missing username still lets someone in. The result can depend on which row the DB returns first.

**What a correct API would answer for steps 2–5:**
- **401 Unauthorized**, with no user data.
- Steps 2 and 3 should get the **same** message. If they differ, attackers can tell which usernames exist.
- Step 4 could also reasonably be **400**, because the input is invalid. That becomes Zod's job later (P50).
- **What counts as passing for now:** any error status, including the temporary **409** from `/signin`, as long as no user data comes back. A **200** for any of steps 2–5 is a real bug.

**What to check in the database after a run:**
- `"User"` has `claude_test_<run>`, created in step 1.
- Steps 2–5 should change nothing.

---

## Test 3: JWT auth middleware + every protected endpoint (added 2026-11-13)

**What it covers:** the `jsonMiddleware` JWT check on each protected route (`GET /user/:id`, `POST /user/website/create`, `GET /user/website/:id`, `GET /region/list`, `POST /region/create`), forged and tampered tokens, and whether one user can reach another user's data.

**Conventions:**
- The token goes in `Authorization` as the raw value (the user's current design; step 10 checks the `Bearer` form).
- `{{token_x}}` = the JWT from user x's signin.
- **Forged tokens are built by Claude in bash:**
  - "tampered": user A's real header and signature, with the payload swapped for one whose `sub` = user B's id;
  - "alg none": header `{"alg":"none"}` + payload `{"sub":"<A's id>","exp":<now+1h>}` + an empty signature.
- Every request has a 10 s timeout. A hang is recorded as a result.

### Setup: two users
| Step | Request | Body | Capture |
|---|---|---|---|
| 1 | `POST /signup` | `{"username":"claude_test_{{run}}_a","password":"pass123"}` | `a_id` ← `user_id.id` |
| 2 | `POST /signin` | `{"username":"claude_test_{{run}}_a","password":"pass123"}` | `token_a` ← `token` |
| 3 | `POST /signup` | `{"username":"claude_test_{{run}}_b","password":"pass123"}` | `b_id` ← `user_id.id` |
| 4 | `POST /signin` | `{"username":"claude_test_{{run}}_b","password":"pass123"}` | `token_b` ← `token` |

### Middleware: `GET /user` (the current user)
**Changed 2026-11-13, after run 015:** the user removed `/:id`, so the route is now **`GET /user`**, which returns the caller's own id from the token. Steps 5 and 11 now check that **the token alone decides who you are**. Runs 010–015 called `GET /user/{id}`.
| Step | Request | Authorization | A correct API would answer |
|---|---|---|---|
| 5 | `GET /user` | `{{token_a}}` | 200, `user_id` = a_id |
| 6 | `GET /user` | *(header absent)* | 401 |
| 7 | `GET /user` | `not-a-jwt` | 401 |
| 8 | `GET /user` | tampered token (`sub` = b_id, A's signature) | 401 (signature mismatch) |
| 9 | `GET /user` | alg-none token (`sub` = a_id) | 401 |
| 10 | `GET /user` | `Bearer {{token_a}}` | rejected under the current raw-token design (Bearer support is in the learning-log To do, P58) |
| 11 | `GET /user` | `{{token_b}}` | 200, `user_id` = **b_id** (same route, different token → different user) |

### Websites
| Step | Request | Authorization | Body | A correct API would answer |
|---|---|---|---|---|
| 12 | `POST /user/website/create` | `{{token_a}}` | `{"url":"https://example.com/a{{run}}","user_id":"{{a_id}}"}` | 200/201, a website owned by A → capture `site_a` ← `website.id` |
| 13 | `POST /user/website/create` | *(absent)* | `{"url":"https://example.com/x{{run}}","user_id":"{{a_id}}"}` | 401, nothing created |
| 14 | `POST /user/website/create` | `{{token_b}}` | `{"url":"https://example.com/b-as-a{{run}}","user_id":"{{a_id}}"}` | the owner should come from the **token** (B), never from the body. Creating it for A = a bug |
| 15 | `GET /user/website/{{site_a}}` | `{{token_a}}` | none | 200, A's website |
| 16 | `GET /user/website/{{site_a}}` | `{{token_b}}` | none | 403/404: B mustn't read A's website |
| 17 | `GET /user/website/{{site_a}}` | *(absent)* | none | 401 |

### Regions
| Step | Request | Authorization | Body | A correct API would answer |
|---|---|---|---|---|
| 18 | `GET /region/list` | `{{token_a}}` | none | 200, a JSON array |
| 19 | `GET /region/list` | *(absent)* | none | 401 |
| 20 | `POST /region/create` | `{{token_a}}` | `{"name":"claude-region-{{run}}"}` | 200/201 with the new region (the handler was empty when this test was written) |

**What counts as passing for now:** under the temporary conventions, any error status counts for the "should be rejected" steps. A **200 on a rejection step is a real bug**, and so is any hang or 500.

**What to check in the database after a run:**
- `"User"` has `claude_test_<run>_a` and `claude_test_<run>_b`.
- `"Website"` has `https://example.com/a<run>`, owned by A. Note who owns `b-as-a<run>`, if step 14 created it.
- Nothing from step 13.
- A region `claude-region-<run>`, if step 20 worked.
