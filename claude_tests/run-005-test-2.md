# Run 005: Test 2

- **Test:** 2 (signin with bad credentials)
- **Time:** 2026-11-12 04:33:35 IST (2026-11-11 23:03:35 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (with `console.log(plan.sql)` added to the `queryLogger` middleware's `beforeEncode`)
- **Result:** the same as runs 003/004. **0 of 3 bad-credential steps were rejected**, and step 4 still signs in without a password. One user (`claude_test_5`) was written to the DB in step 1.

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` (`claude_test_5`) | 200 | user created, id `167976fa-2e33-4100-845a-0dc9885b16fe` |
| 2 | `POST /signin`, wrong password | **200** ❌ | `{"user_id":null,"login_key":"JWT or Session Cookies"}` |
| 3 | `POST /signin`, unknown username | **200** ❌ | `{"user_id":null,"login_key":"JWT or Session Cookies"}` |
| 4 | `POST /signin`, no password field | **200** ❌❌ | returns the full user, incl. `"password":"pass123"` |

## Details

### Step 1: POST /signup
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_5","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"user_id":{"createdAt":"2026-11-11T23:03:46.872Z","id":"167976fa-2e33-4100-845a-0dc9885b16fe","password":"pass123","username":"claude_test_5"}}`

### Step 2: POST /signin (wrong password)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_5","password":"wrong-pass"}'
```
- **Status:** 200 OK
- **Body:** `{"user_id":null,"login_key":"JWT or Session Cookies"}`

### Step 3: POST /signin (unknown username)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"no_such_user_5","password":"pass123"}'
```
- **Status:** 200 OK
- **Body:** `{"user_id":null,"login_key":"JWT or Session Cookies"}`

### Step 4: POST /signin (no password field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_5"}'
```
- **Status:** 200 OK
- **Body:** `{"user_id":{"createdAt":"2026-11-11T23:03:46.872Z","id":"167976fa-2e33-4100-845a-0dc9885b16fe","password":"pass123","username":"claude_test_5"},"login_key":"JWT or Session Cookies"}`

## Notes
- **Compared with run 004:** no change in any HTTP response. This was expected, since only the logger changed.
- **The purpose of this run** was to see the SQL that `queryLogger` prints in the server terminal, especially the `WHERE` clause of step 4 versus step 2. Claude can't see that terminal, so the user pastes it (it goes into the learning log, P54/P55).
- The step 4 security bug (P54) is still open.

## SQL printed by `queryLogger` (pasted by the user from the server terminal)
```sql
-- step 1 (signup)
INSERT INTO "public"."User" ("username", "password", "createdAt", "id") VALUES ($1, $2, $3, $4) RETURNING "User"."createdAt", "User"."id", "User"."password", "User"."username"
-- step 2 (wrong password)
SELECT ... FROM "public"."User" WHERE ("User"."username" = $1 AND "User"."password" = $2) LIMIT 1
-- step 3 (unknown username)
SELECT ... FROM "public"."User" WHERE ("User"."username" = $1 AND "User"."password" = $2) LIMIT 1
-- step 4 (no password field)
SELECT ... FROM "public"."User" WHERE "User"."username" = $1 LIMIT 1
```
- **Step 4 confirms P54:** the `password` condition is **gone** from the `WHERE`. The `undefined` key was dropped, so the query matches on username alone.
- **Step 1:** `createdAt` and `id` are sent **as values from the app** (`$3`, `$4`), which confirms that `@onCreate(uuid())` / `@onCreate(now())` are generated client-side (P45). `RETURNING` includes `password`, which is why the response leaks it.
