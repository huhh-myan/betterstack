# Run 001: Test 1

- **Test:** 1 (signup → signin → create website → get website)
- **Time:** 2026-11-12 03:13:55 IST (2026-11-11 21:43:55 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api`
- **Result:** 0 of 4 steps did what the endpoint is meant to do. Nothing was written to the DB.

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` | **500** | `TypeError: Cannot destructure property 'username' from null or undefined value`, at index.ts:13 |
| 2 | `POST /signin` | **500** | same cause (`req.body` is undefined) |
| 3 | `POST /user/website/create` | **500** | `TypeError: Cannot destructure property 'url' from null or undefined value` |
| 4 | `GET /user/website/does-not-exist` | **200** | `{"website":null}`. The fake id was used because step 3 failed |

## Details

### Step 1: POST /signup
```
curl -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_1","password":"pass123"}'
```
- **Status:** 500 Internal Server Error, `Content-Type: text/html` (Express 5's default error handler)
- **Body:** an HTML page with this stack trace (the file paths are visible to the client):
  ```
  TypeError: Cannot destructure property 'username' from null or undefined value
      at <anonymous> (D:\cohort\betteruptime\betteruptime\apps\api\index.ts:13:36)
      at handleRequest (...\router@2.2.0\...\layer.js:152:17)
      ...
  ```
- **Captured:** `user_id`: none

### Step 2: POST /signin
```
curl -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_1","password":"pass123"}'
```
- **Status:** 500
- **Body:** the same kind of HTML stack trace (`req.body` is undefined)

### Step 3: POST /user/website/create
```
curl -i -X POST http://localhost:3000/user/website/create -H "Content-Type: application/json" -d '{"url":"https://example.com","user_id":"none-yet"}'
```
- **Substitution:** `user_id` was missing, so `none-yet` was sent instead.
- **Status:** 500
- **Body:** HTML stack trace: `TypeError: Cannot destructure property 'url' from null or undefined value`
- **Captured:** `website_id`: none

### Step 4: GET /user/website/:id
```
curl -i http://localhost:3000/user/website/does-not-exist
```
- **Substitution:** `website_id` was missing, so `does-not-exist` was used instead.
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"website":null}`

## Extra observation (not part of test 1)
- The reachability check `GET /region/list` **timed out** (curl exit 28). The handler is empty and never sends a response.

## Notes
- Steps 1–3: the destructuring of `req.body` is outside the `try`, so the 409/400 catch blocks never ran.
- Step 4: "not found" returns 200 with `null`. It should probably be a 404.
- index.ts:105 `res.json(400).json(...)`: this branch wasn't triggered in this run.
- Analysis is in the learning log under P52.
