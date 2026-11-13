# Run 015: Test 3 (only the steps that failed)

- **Test:** 3, **partial run**: setup (steps 1–3) + the steps that failed in run 014 (**5, 11, 20**) + 18b (list regions)
- **Time:** 2026-11-13 18:32:49 IST (2026-11-13 13:02:49 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (after the user changed the handler to read `name`)
- **Captured values:**
  - `a_id` = `b653276c-bd71-44d7-9869-579f09bf4d85`
  - `b_id` = `99e095d4-22ed-478b-8fca-738a7950e8cb`
- **Result:** **step 20 passes.** The region was created and shows up in the list. Steps 5/11 still 404 (route removed).
- **Written to the DB:**
  - users `claude_test_15_a`, `claude_test_15_b`
  - **region `{id: 3905, name: "claude-region-15"}`**

## Summary

| Step | Request | Auth | Status | Outcome | vs run 014 |
|---|---|---|---|---|---|
| 1–3 | setup | none | 200 | token_a, a_id, b_id | same |
| 5 | `GET /user/{a_id}` | token_a | 404 | HTML "Cannot GET /user/…" | same |
| 11 | `GET /user/{b_id}` | token_a | 404 | HTML "Cannot GET /user/…" | same |
| 20 | `POST /region/create` `{"name":"claude-region-15"}` | token_a | **200** ✅ | `{"message":"claude-region-15 created!"}` | **400 → 200, fixed** |
| 18b | `GET /region/list` | token_a | 200 ✅ | `[{"id":3905,"name":"claude-region-15"}]` | `[]` → 1 region |

## Details
```
POST /signup {"username":"claude_test_15_a","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T13:02:50.001Z","id":"b653276c-bd71-44d7-9869-579f09bf4d85","password":"pass123","username":"claude_test_15_a"}}
POST /signin {"username":"claude_test_15_a","password":"pass123"}
→ 200 {"user_id":"b653276c-bd71-44d7-9869-579f09bf4d85","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzQ5NzAsImV4cCI6MTc5NDU4MjE3MCwic3ViIjoiYjY1MzI3NmMtYmQ3MS00NGQ3LTk4NjktNTc5ZjA5YmY0ZDg1In0.eHnpUKCGPN3igXpYLah1G_l8J9h15KqdMTQVkHaNyUg"}
POST /signup {"username":"claude_test_15_b","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T13:02:50.270Z","id":"99e095d4-22ed-478b-8fca-738a7950e8cb","password":"pass123","username":"claude_test_15_b"}}

GET /user/b653276c-…  (token_a) → 404 <pre>Cannot GET /user/b653276c-bd71-44d7-9869-579f09bf4d85</pre>
GET /user/99e095d4-…  (token_a) → 404 <pre>Cannot GET /user/99e095d4-22ed-478b-8fca-738a7950e8cb</pre>

POST /region/create  (token_a)  {"name":"claude-region-15"}
→ 200 {"message":"claude-region-15 created!"}

GET /region/list  (token_a)
→ 200 [{"id":3905,"name":"claude-region-15"}]
```

## Notes
- **Compared with run 014:** step 20 went from 400 (`23502`, `name` null) to **200**. The handler now reads `name`, which matches the test and the model field.
- **The region id is `3905`**, a random integer from `Math.floor(Math.random()*100000 + …)`. It works, and collisions are unlikely at this scale (still a known risk; `@default(autoincrement())` or a UUID later).
- `POST /region/create` returns only a message, not the created region. A client wanting the new id must call `/region/list`. Returning the created object (+ **201**) is the usual convention.
- **Any logged-in user can create a region.** Regions are system-wide (they represent *your* checker locations), so this is probably an admin-only action later.
- Steps 5/11: `GET /user/:id` no longer exists. Waiting for the user to name a replacement, or to remove the steps.
