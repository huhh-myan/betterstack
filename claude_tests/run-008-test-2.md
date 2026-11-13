# Run 008: Test 2

- **Test:** 2 (signin with bad credentials)
- **Time:** 2026-11-12 04:53:49 IST (2026-11-11 23:23:49 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (**restarted** after the `(error as Error).message` change; run 007 was against the old code)
- **Result:** **4 of 4 bad-credential steps were rejected** (409), none returned user data, and the error messages now reach the client. One user (`claude_test_8`) was written to the DB in step 1.

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` (`claude_test_8`) | 200 | user created, id `7063d4ac-75dd-4ad4-8176-9cddf3d0e2c9` |
| 2 | `POST /signin`, wrong password | **409** ✅ | `"meme":"Invalid Creds! versuche es noch einmal"` |
| 3 | `POST /signin`, unknown username | **409** ✅ | `"meme":"Invalid Creds! versuche es noch einmal"` |
| 4 | `POST /signin`, no password field | **409** ✅ | `"meme":"enter password pls"` |
| 5 | `POST /signin`, no username field | **409** ✅ | `"meme":"Invalid Creds! versuche es noch einmal"` |

## Details

### Step 1: POST /signup
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_8","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"user_id":{"createdAt":"2026-11-11T23:23:49.571Z","id":"7063d4ac-75dd-4ad4-8176-9cddf3d0e2c9","password":"pass123","username":"claude_test_8"}}`

### Step 2: POST /signin (wrong password)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_8","password":"wrong-pass"}'
```
- **Status:** 409 Conflict, `Content-Type: application/json`
- **Body:** `{"message":"error!","meme":"Invalid Creds! versuche es noch einmal"}`

### Step 3: POST /signin (unknown username)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"no_such_user_8","password":"pass123"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","meme":"Invalid Creds! versuche es noch einmal"}`

### Step 4: POST /signin (no password field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_8"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","meme":"enter password pls"}`

### Step 5: POST /signin (no username field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"password":"pass123"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","meme":"Invalid Creds! versuche es noch einmal"}`

## Notes
- **Compared with run 006** (the last run against the current signin logic; run 007 hit stale code): the statuses are unchanged (all 409), and the body changed from `"error":{}` to `"meme":"<message>"`. The message now reaches the client.
- Steps 2 and 3 return **identical** messages, which is good: they don't reveal which usernames exist.
- **Step 5 got "Invalid Creds!", not "enter password pls"**, so it went past the password check and into the lookup. Whether the query had **no `WHERE`** (the first row in the table, with a password other than `pass123`), or something else, is visible in the server terminal's SQL for this step. Being rejected by luck (it depends on which row comes first) is not the same as being rejected by design.
- **SQL printed by `queryLogger` (pasted by the user). There are 4 statements for 5 requests:**
  ```sql
  -- step 1: INSERT INTO "public"."User" ("username","password","createdAt","id") VALUES ($1,$2,$3,$4) RETURNING ...
  -- step 2: SELECT ... FROM "public"."User" WHERE "User"."username" = $1 LIMIT 1
  -- step 3: SELECT ... FROM "public"."User" WHERE "User"."username" = $1 LIMIT 1
  -- step 4: (no query: "enter password pls" is thrown before the lookup)
  -- step 5: SELECT ... FROM "public"."User" LIMIT 1          <- no WHERE at all
  ```
  **Step 5 was rejected by luck.** The query returns *whichever row Postgres hands back first* (no `WHERE`, no `ORDER BY`, so the order isn't guaranteed), and that row's password just isn't `pass123`. If that row's password matched, step 5 would sign in as that user. The bug is still open: guard `username` the way `password` is guarded.
- Lesson from run 007: an edit doesn't reach the server until it's restarted (or started with `bun --watch`).
