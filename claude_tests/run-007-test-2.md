# Run 007: Test 2

- **Test:** 2 (signin with bad credentials), the first run including step 5
- **Time:** 2026-11-12 04:52:59 IST (2026-11-11 23:22:59 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api`
- **Result:** **4 of 4 bad-credential steps were rejected** (409), and none returned user data. One user (`claude_test_7`) was written to the DB in step 1. ⚠️ **The server is running older code than `index.ts` on disk** (see Notes).

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` (`claude_test_7`) | 200 | user created, id `a163d38f-e08b-40c1-8178-5e62912a5365` |
| 2 | `POST /signin`, wrong password | **409** ✅ | `{"message":"error!","error":{}}` |
| 3 | `POST /signin`, unknown username | **409** ✅ | `{"message":"error!","error":{}}` |
| 4 | `POST /signin`, no password field | **409** ✅ | `{"message":"error!","error":{}}` |
| 5 | `POST /signin`, no username field | **409** ✅ | `{"message":"error!","error":{}}` |

## Details

### Step 1: POST /signup
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_7","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"user_id":{"createdAt":"2026-11-11T23:23:08.975Z","id":"a163d38f-e08b-40c1-8178-5e62912a5365","password":"pass123","username":"claude_test_7"}}`

### Step 2: POST /signin (wrong password)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_7","password":"wrong-pass"}'
```
- **Status:** 409 Conflict, `Content-Type: application/json`
- **Body:** `{"message":"error!","error":{}}`

### Step 3: POST /signin (unknown username)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"no_such_user_7","password":"pass123"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","error":{}}`

### Step 4: POST /signin (no password field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_7"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","error":{}}`

### Step 5: POST /signin (no username field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"password":"pass123"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","error":{}}`

## Notes
- **Compared with run 006:** steps 1–4 are unchanged. Step 5 is new: rejected (409).
- ⚠️ **The response shape doesn't match the code on disk.** `index.ts` lines 59–63 now send `meme: \`${(error as Error).message}\`` and no `error` field. But every response still has `"error":{}` and no `meme`. **The running server hasn't loaded the edit.** Bun doesn't reload on save unless it's started with `--watch` / `--hot`. Restart it, then re-run.
- **Step 5 was rejected, but why is unconfirmed:** `first({ username: undefined })` should be `SELECT … LIMIT 1` with no `WHERE` (the first row in the table). It was rejected only if that row's password isn't `pass123`. Check the step 5 SQL line in the server terminal.
