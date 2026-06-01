# Mockoto troubleshooting (agents)

## Preflight

| Symptom | Action |
|---------|--------|
| `fetch failed` / ECONNREFUSED | Start server: `mockoto` or `nx serve mockoto-be` |
| 404 on `/api/...` | Use `/api` prefix; base is `:3000` not `:3001` |
| Wrong port | Management **3000**, proxy **3001** |

```http
GET http://localhost:3000/api/projects
```

---

## Proxy status decision tree

```
Request → :3001/{projectId}/path

404 "No project found"
  → projectId wrong; GET /api/projects

503 "No active collection"
  → POST collection with isActive:true OR PATCH existing collection { isActive:true }

404 "No mock found" (local mode)
  → No matching rule in ACTIVE collection
  → Check: rule isEnabled, url/method, collection is active, path includes query string correctly

404 "Rule matched but has no active response"
  → POST response with isActive:true OR PUT { isActive:true } on one response

200 but body is escaped string in client
  → Fix: PUT rule-response with body as object (Scenario 8 in scenarios.md)
```

---

## Management API errors

| HTTP | Meaning | Fix |
|------|---------|-----|
| 400 | Zod validation | Read `message`; check `mode:local` + `recordingStrategy:none` |
| 404 | Unknown id | Re-run discovery (Scenario 0) |
| 409 | Duplicate name (collection/project) | Pick new name or update existing |
| 409 | Duplicate `baseUrl` | Use unique baseUrl per project |

---

## Common agent mistakes

| Mistake | Result | Fix |
|---------|--------|-----|
| String `body` in POST | Escaped JSON in UI | Send `"body": { ... }` object |
| Skipped collection | Rules fail or 503 | Always POST collection after project |
| Fake UUIDs | 404 on all calls | Use ids from POST responses |
| Test only :3000 | “Works” in API but proxy broken | Always curl :3001 |
| Deactivate all responses | 404 no active response | PUT one `isActive: true` |
| Nx “project” vs Mockoto project | Wrong skill / wrong tool | Use mockoto skills only |

---

## Verify fix worked

```http
GET http://localhost:3000/api/rule-responses/{id}
```
→ `body` should be JSON **object** in response JSON, not a string.

```http
GET http://localhost:3001/{projectId}/path
```
→ Client receives parseable JSON.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/e2e-test.ts` | Full CRUD + switch lifecycle |
| `scripts/scaffold-best-demo.mjs` | Demo project (object bodies) |
| `scripts/fix-best-demo-bodies.mjs` | Repair string-encoded bodies by project name |
