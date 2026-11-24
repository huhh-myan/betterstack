# betteruptime: manual test definitions

The test steps that Claude runs when you say "test N". Results are saved to `run-NNN-test-N.md` in this folder (one file per run, numbered across all runs).

**Placeholders:**
- `{{base}}` = `http://localhost:3000`
- `{{run}}` = this run's number, without padding (so usernames are unique per run)
- `{{name}}` = a value captured from an earlier step in the same run

Every POST is sent with the header `Content-Type: application/json`. Every request has a 10 s timeout; a hang is recorded as a result.

**API conventions (since `feature/ai-changed`, 2026-11-24).** The temporary "409 for signin, 400 for everything else" conventions are gone. Runs 001–016 were made under them and stay as history.
- Tokens go in **`Authorization: Bearer {{token}}`**. The raw token without `Bearer` is still accepted for compatibility; step 3.10 checks that.
- **201** for creates, **204** for delete, **400** invalid input (body `{message, details}`), **401** auth failures (missing/bad token, wrong username *or* password), **403** signed in but not allowed (non-admin), **404** not found **or not yours**, **409** conflicts (taken username, duplicate region, already decided), **503** `/health` with the DB down.
- Error bodies are `{ "message": "...", "details"?: [...] }` and never contain stack traces or SQL.
- Signup returns `{ "user": { "id", "username" } }` (no password). Signin returns `{ "token", "user": { "id", "username", "isAdmin" }, "user_id" }`.
- Passwords are stored as argon2id hashes. Old `pass123` rows are re-hashed on their next sign-in.

**Always a real bug, whatever the step says:** a 500, a hang, a stack trace or file path in a response, a password or hash in a response, or a 2xx on a step that should be rejected.

---

## Test 1: signup → signin → create website → get website

| Step | Request | Body | Expect | Capture |
|---|---|---|---|---|
| 1 | `POST {{base}}/signup` | `{"username":"claude_test_{{run}}","password":"pass123"}` | **201**, no `password` anywhere in the body | `user_id` ← `user.id` |
| 2 | `POST {{base}}/signin` | `{"username":"claude_test_{{run}}","password":"pass123"}` | 200, `user.isAdmin` = false | `token` ← `token` |
| 3 | `POST {{base}}/user/website/create`, `Authorization: Bearer {{token}}` | `{"url":"example.com"}` | **201**, `website.url` = `https://example.com`, `website.user_id` = user_id | `website_id` ← `website.id` |
| 4 | `GET {{base}}/user/website/{{website_id}}`, Bearer | none | 200, same website | none |

**If a capture is missing** because an earlier step failed: step 3 sends no `Authorization` header (expect 401); step 4 uses `does-not-exist` as the id (expect 404). Note the substitution in the results file.

**What to check in the database after a run:**
- `"User"` has `claude_test_<run>` and its `password` starts with `$argon2`.
- `"Website"` has `https://example.com` owned by that user.

---

## Test 2: signin with bad credentials

| Step | Request | Body | Expect |
|---|---|---|---|
| 1 | `POST {{base}}/signup` (a known user) | `{"username":"claude_test_{{run}}","password":"pass123"}` | 201 |
| 2 | `POST {{base}}/signin`: **wrong password** | `{"username":"claude_test_{{run}}","password":"wrong-pass"}` | **401** |
| 3 | `POST {{base}}/signin`: **unknown username** | `{"username":"no_such_user_{{run}}","password":"pass123"}` | **401**, the **same message** as step 2 |
| 4 | `POST {{base}}/signin`: **no password field** | `{"username":"claude_test_{{run}}"}` | **400** |
| 5 | `POST {{base}}/signin`: **no username field** | `{"password":"pass123"}` | **400** (it can no longer match "whichever row comes first") |
| 6 | `POST {{base}}/signup` again with step 1's username | `{"username":"claude_test_{{run}}","password":"other123"}` | **409** |
| 7 | `POST {{base}}/signup` invalid | `{"username":"ab","password":"1"}` | **400**, `details` lists both problems |
| 8 | `POST {{base}}/signin` with body `{oops` (not JSON) | – | **400** "not valid JSON" |

**Database after a run:** only `claude_test_<run>` from step 1; steps 2–8 change nothing.

---

## Test 3: auth + every protected endpoint

**Forged tokens are built by Claude in bash:**
- "tampered": user A's real header and signature, with the payload swapped for one whose `sub` = user B's id;
- "alg none": header `{"alg":"none"}` + payload `{"sub":"<A's id>","exp":<now+1h>}` + an empty signature.

### Setup: two users
| Step | Request | Body | Capture |
|---|---|---|---|
| 1 | `POST /signup` | `{"username":"claude_test_{{run}}_a","password":"pass123"}` | `a_id` ← `user.id` |
| 2 | `POST /signin` | same | `token_a` ← `token` |
| 3 | `POST /signup` | `{"username":"claude_test_{{run}}_b","password":"pass123"}` | `b_id` ← `user.id` |
| 4 | `POST /signin` | same | `token_b` ← `token` |

### `GET /user` (the current user)
| Step | Authorization | Expect |
|---|---|---|
| 5 | `Bearer {{token_a}}` | 200, `id` = a_id, `isAdmin` = false |
| 6 | *(absent)* | 401 |
| 7 | `Bearer not-a-jwt` | 401 |
| 8 | `Bearer <tampered>` (`sub` = b_id, A's signature) | 401 |
| 9 | `Bearer <alg-none>` (`sub` = a_id) | 401 |
| 10 | `{{token_a}}` (raw, no `Bearer`) | 200 (compatibility; to be removed later) |
| 11 | `Bearer {{token_b}}` | 200, `id` = **b_id** |

### Websites
| Step | Request | Authorization | Body | Expect |
|---|---|---|---|---|
| 12 | `POST /user/website/create` | A | `{"url":"https://example.com/a{{run}}","user_id":"{{b_id}}"}` | **201**, owned by **A** (the body's `user_id` is ignored) → `site_a` ← `website.id` |
| 13 | `POST /user/website/create` | *(absent)* | `{"url":"https://example.com/x{{run}}"}` | 401, nothing created |
| 14 | `POST /user/website/create` | A | `{"url":"not a url"}` | 400 |
| 15 | `GET /user/website/{{site_a}}` | A | none | 200 |
| 16 | `GET /user/website/{{site_a}}` | B | none | **404** (not 403: don't confirm it exists) |
| 17 | `GET /user/website/{{site_a}}` | *(absent)* | none | 401 |
| 18 | `GET /user/websites` | A | none | 200, contains site_a, every `user_id` = a_id, each has a `ticks` array |
| 19 | `GET /user/websites` | B | none | 200, does **not** contain site_a |
| 20 | `GET /user/website/{{site_a}}/ticks?hours=24` | A | none | 200, `ticks` array (may be empty) |
| 21 | `GET /user/website/{{site_a}}/ticks?hours=9999` | A | none | 400 (max 168) |

### Regions and misc
| Step | Request | Authorization | Body | Expect |
|---|---|---|---|---|
| 22 | `GET /region/list` | A | none | 200, an array |
| 23 | `GET /region/list` | *(absent)* | none | 401 |
| 24 | `POST /region/create` | A (not admin) | `{"name":"claude-region-{{run}}"}` | **403** |
| 25 | `GET /does-not-exist` | *(absent)* | none | **404** (used to be the auth error) |
| 26 | `GET /health` | *(absent)* | none | 200, `db` = `up` |

**Database after a run:** users `_a` and `_b`; website `https://example.com/a<run>` owned by A; nothing from steps 13, 14, 24.

---

## Test 4: delete a website

| Step | Request | Authorization | Expect | Capture |
|---|---|---|---|---|
| 1 | `POST /signup` + `POST /signin` as `claude_test_{{run}}_d` / `pass123` | – | 201, 200 | `token` |
| 2 | `POST /user/website/create` `{"url":"https://example.com/del{{run}}"}` | `token` | 201 | `site` ← `website.id` |
| 3 | Insert one tick for `site` in the DB: `INSERT INTO "WebsiteTicks" (response_time_ms,status,region_id,website_id) VALUES (100,'Up',<any region id>,'<site>');` | – | 1 row | none |
| 4 | `DELETE /user/website/{{site}}` | *(absent)* | 401 | none |
| 5 | `DELETE /user/website/{{site}}` | `token` | **204**, empty body | none |
| 6 | `GET /user/website/{{site}}` | `token` | 404 | none |
| 7 | `DELETE /user/website/{{site}}` | `token` | 404 | none |

**Database after a run:** no `"Website"` row for `site`, and **no `"WebsiteTicks"` rows** for it.

---

## Test 5: admins and region requests

Needs an admin. Claude creates one for the run: sign up `claude_admin_{{run}}` / `pass123`, then make them an admin in the DB with `INSERT INTO "Admin" (user_id) VALUES ('<their id>');`.

| Step | Request | Authorization | Body | Expect | Capture |
|---|---|---|---|---|---|
| 1 | signup + signin `claude_test_{{run}}_u` | – | – | 201, 200 | `token_u`, `u_id` |
| 2 | signup `claude_admin_{{run}}`, insert the `Admin` row, then signin | – | – | signin 200 with `user.isAdmin` = **true** | `token_admin` |
| 3 | `POST /region/request` | u | `{"name":"claude-req-{{run}}","reason":"testing"}` | **201**, `status` = Pending | `req_id` ← `request.id` |
| 4 | `POST /region/request` | u | same | **409** (already asked) | |
| 5 | `GET /region/requests` | u | – | 200, `isAdmin` false, only u's requests | |
| 6 | `POST /region/requests/{{req_id}}/approve` | u | – | **403** | |
| 7 | `GET /region/requests` | admin | – | 200, `isAdmin` true, contains req_id with `username` = `claude_test_{{run}}_u` | |
| 8 | `POST /region/requests/{{req_id}}/approve` | admin | – | 200, `region.name` = `claude-req-{{run}}`, `request.status` = Approved | |
| 9 | `POST /region/requests/{{req_id}}/approve` | admin | – | **409** (already approved) | |
| 10 | `GET /region/list` | u | – | contains `claude-req-{{run}}` | |
| 11 | `POST /region/request` | u | `{"name":"claude-req-{{run}}"}` | **409** (region exists) | |
| 12 | `POST /region/create` | admin | `{"name":"claude-adm-{{run}}"}` | **201**, a numeric `region.id` | |
| 13 | `POST /region/create` | admin | same | **409** | |
| 14 | `POST /region/create` | admin | `{}` | **400** (used to hang) | |
| 15 | `POST /region/request` then `.../reject` (admin) for `claude-rej-{{run}}` | u, then admin | – | 201, then 200 with `status` = Rejected | |

**Database after a run:** regions `claude-req-<run>` and `claude-adm-<run>`; `"RegionRequest"` rows: one Approved (`decided_by` = admin's id), one Rejected; an `"Admin"` row for `claude_admin_<run>`.

---

## Clean-up (optional)

These tests write into whichever database the API uses. To remove a run's data afterwards:

```sql
DELETE FROM "WebsiteTicks" WHERE website_id IN (SELECT w.id FROM "Website" w JOIN "User" u ON u.id = w.user_id WHERE u.username LIKE 'claude\_%');
DELETE FROM "Website" WHERE user_id IN (SELECT id FROM "User" WHERE username LIKE 'claude\_%');
DELETE FROM "RegionRequest" WHERE user_id IN (SELECT id FROM "User" WHERE username LIKE 'claude\_%');
DELETE FROM "Admin" WHERE user_id IN (SELECT id FROM "User" WHERE username LIKE 'claude\_%');
-- users and regions are kept unless you remove them too
```

The automated suite in `apps/tests` covers most of these against a separate `bstack_test` database.
