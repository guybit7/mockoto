# Mockoto full scenarios (agent playbook)

Complete workflows using **only** the management API (`:3000/api`) and traffic proxy (`:3001`).  
Use [agent-toolkit.md](../mockoto-api/agent-toolkit.md) for the HTTP helper.

**Before every scenario:** `GET /api/projects` (preflight). If it fails, start Mockoto (`mockoto` or dev serve) and retry.

---

## Scenario 0 — Discover current state

**When:** User says “what mocks exist?”, “find project X”, or before editing unknown data.

```
GET  /api/projects
GET  /api/collections/project/{projectId}
GET  /api/collections/project/{projectId}/active
GET  /api/rules/collection/{collectionId}
GET  /api/rule-responses/rule/{ruleId}    (per rule)
```

**Output for user:** project name/id, active collection, rule list (method + url), active response name per rule.

---

## Scenario 1 — Greenfield API (local mocks)

**When:** “Create mocks for …”, “scaffold demo API”, greenfield.

**Checklist**

```
- [ ] POST /api/projects { name, baseUrl, description? }
- [ ] POST /api/collections { projectId, name, mode:"local", recordingStrategy:"none", isActive:true }
- [ ] For each endpoint: POST /api/rules { projectId, collectionId, url, requestMethod, isEnabled:true }
- [ ] For each rule: POST /api/rule-responses × N { ruleId, name, statusCode, body:{...}, isActive on one }
- [ ] GET  /api/collections/project/{projectId}/active
- [ ] GET  http://localhost:3001/{projectId}{path} per rule
```

**Example — 3 GET endpoints, 2 responses each**

| Step | Request body (key fields) |
|------|---------------------------|
| Project | `{ "name": "Payments Demo", "baseUrl": "https://api.example.com" }` |
| Collection | `{ "projectId", "name": "v1", "mode": "local", "isActive": true }` |
| Rule 1 | `{ "url": "/health", "requestMethod": "GET" }` |
| Rule 1 responses | `{ "name": "OK", "isActive": true, "statusCode": 200, "body": { "status": "ok" } }` + inactive error variant |
| Rule 2 | `{ "url": "/users", "requestMethod": "GET" }` |
| Rule 3 | `{ "url": "/orders", "requestMethod": "GET" }` |

**Verify:** Each proxy URL returns expected JSON object (not escaped string).

---

## Scenario 2 — Idempotent scaffold (find or create)

**When:** User asks for a named project that might already exist.

```
1. GET /api/projects
2. If project.name matches:
     → use existing projectId
     → GET /api/collections/project/{id}/active
     → if missing collection/rules, add only what's missing
3. Else:
     → run Scenario 1
```

Do **not** create duplicate projects with the same name unless the user asks for a new copy.

---

## Scenario 3 — Add endpoint to existing project

**When:** “Add GET /invoices to Payments Demo”.

```
1. Scenario 0 → projectId, active collectionId
2. POST /api/rules { projectId, collectionId, url, requestMethod, ... }
3. POST /api/rule-responses { ruleId, name, isActive:true, statusCode, body:{...} }
4. GET :3001/{projectId}{url}
```

---

## Scenario 4 — Multiple responses (success + error)

**When:** “Add 500 error variant”, “toggle happy/sad path”.

```
1. POST /api/rule-responses {
     ruleId,
     name: "Server error",
     isActive: false,
     statusCode: 500,
     isError: true,
     body: { "error": "internal", "code": "DEMO_500" }
   }
2. Keep existing response isActive:true for default behavior
3. To serve error: PUT /api/rule-responses/{errorId} { "isActive": true }
   (see mockoto-switching — one call, atomic)
```

---

## Scenario 5 — Switch active response

**When:** “Return empty list instead”, “use degraded health”.

```
PUT /api/rule-responses/{targetId}
{ "isActive": true }

GET /api/rule-responses/rule/{ruleId}   → exactly one isActive:true
GET :3001/{projectId}{path}            → body matches target
```

Do not deactivate siblings manually first.

---

## Scenario 6 — A/B collections

**When:** “v2 mocks”, “swap entire API version”.

```
1. POST /api/collections {
     projectId,
     name: "v2",
     mode: "local",
     recordingStrategy: "none",
     isActive: false
   }
2. POST rules + responses under new collectionId (copy or new URLs)
3. PATCH /api/collections/{v2Id} { "isActive": true }
4. GET /api/collections/project/{projectId}/active  → v2
5. Proxy tests — v1 rules no longer match
```

---

## Scenario 7 — Update mock payload in place

**When:** “Change users response to include 10 items”, fix JSON in editor.

```
PUT /api/rule-responses/{id}
{
  "body": { "users": [ ... ], "total": 10 },
  "headers": { "x-mock-version": "2" }
}

GET :3001/{projectId}/users
```

`body` and `headers` must be **objects**, not strings.

---

## Scenario 8 — Fix double-encoded body

**When:** UI shows `"{ \"users\": ... }"` as one escaped string.

```
PUT /api/rule-responses/{id}
{ "body": { "users": [] } }    ← real object

GET /api/rule-responses/{id}   → typeof body === "object"
```

Or run `node scripts/fix-best-demo-bodies.mjs` if project name is `THE BEST DEMO`.

---

## Scenario 9 — Disable rule (no delete)

**When:** “Turn off /legacy endpoint”.

```
PATCH /api/rules/{ruleId}
{ "isEnabled": false }

GET :3001/{projectId}/legacy  → 404 No mock found (local mode)
```

Re-enable: `{ "isEnabled": true }`.

---

## Scenario 10 — Simulated latency

**When:** “Slow API”, timeout testing.

```
POST or PUT /api/rule-responses/{id}
{
  "latency": 2000,
  "statusCode": 200,
  "body": { "ok": true }
}
```

Proxy waits `latency` ms before responding.

---

## Scenario 11 — Custom response headers

**When:** “Add X-Request-Id”, CORS-style headers for client tests.

```
PUT /api/rule-responses/{id}
{
  "headers": {
    "x-request-id": "mock-123",
    "cache-control": "no-store"
  }
}
```

---

## Scenario 12 — POST rule with body filter

**When:** Same URL/method but different mocks by request body.

```
POST /api/rules
{
  "projectId", "collectionId",
  "url": "/checkout",
  "requestMethod": "POST",
  "requestBody": { "plan": "pro" }
}

POST /api/rule-responses { ruleId, body: { "total": 99 }, isActive: true }
```

Create a **second rule** with different `requestBody` shape for another plan. Matching uses canonical body hash (`rule-hash.ts`).

**Verify:** Proxy `POST :3001/{projectId}/checkout` with matching JSON body.

---

## Scenario 13 — Proxy mode (forward + optional record)

**When:** “Forward unknown traffic to real API”, record successes.

```
POST /api/collections
{
  "projectId",
  "name": "recorded",
  "mode": "proxy",
  "recordingStrategy": "success",
  "isActive": true
}
```

Ensure `project.baseUrl` is reachable. Unmatched requests forward upstream; recording behavior depends on strategy.

**Switch back to pure mocks:** new `local` collection + `PATCH isActive:true`.

---

## Scenario 14 — Full project teardown

**When:** “Delete demo”, cleanup after test.

```
For each rule in active collection:
  GET  /api/rule-responses/rule/{ruleId}
  DELETE /api/rule-responses/{id}   (each)

For each rule:
  DELETE /api/rules/{id}

For each collection:
  DELETE /api/collections/{id}

DELETE /api/projects/{projectId}
```

If `DELETE /projects/{id}` cascades in your DB version, still prefer explicit child deletes when unsure.

---

## Scenario 15 — Proxy test matrix

**When:** After any scaffold or switch — prove mocks work.

| Check | Expected |
|-------|----------|
| `GET :3001/{projectId}/health` | 200 + JSON object |
| Wrong path | 404 `No mock found` (local) |
| No active collection | 503 `No active collection` |
| Rule match, no active response | 404 `no active response` |
| Unknown project id | 404 project message |

---

## Scenario 16 — Update project metadata

**When:** Rename, favorite, change upstream URL.

```
PUT /api/projects/{id}
{
  "name": "New name",
  "description": "...",
  "baseUrl": "https://new-upstream.example.com",
  "isFavorite": true
}
```

`baseUrl` must stay unique across projects.

---

## Scenario 17 — List and export manifest (read-only)

**When:** User wants JSON summary for docs or another agent.

```
GET /projects/{id}
GET /collections/project/{id}/active
GET /rules/collection/{collectionId}
For each rule:
  GET /rule-responses/rule/{ruleId}
```

Build manifest: `{ project, activeCollection, rules: [{ url, method, activeResponse: { statusCode, body } }] }`.

---

## Scenario 18 — Duplicate response as template

**When:** “Copy success response, tweak for edge case”.

```
1. GET /api/rule-responses/{sourceId}
2. POST /api/rule-responses {
     ruleId: same,
     name: "Variant B",
     statusCode, headers, body from source (tweak body),
     isActive: false
   }
3. Optional: PATCH/PUT isActive to test
```

---

## Agent execution rules

1. **Real HTTP only** — capture IDs from responses.
2. **Object bodies** — never `JSON.stringify` the `body` field in API payloads.
3. **Verify on :3001** after every write that affects proxy behavior.
4. **One active** collection per project, one active response per rule.
5. **Prefer PATCH** on collections for `isActive`; **PUT** on rule-responses for `isActive`.
6. **Do not use** `POST /api/agent` for scaffolding (stub).

## Related

- [recipes.md](recipes.md) — short snippets
- [../mockoto-switching/SKILL.md](../mockoto-switching/SKILL.md) — activation detail
- [../mockoto/troubleshooting.md](../mockoto/troubleshooting.md) — errors
- `scripts/e2e-test.ts` — lifecycle reference
