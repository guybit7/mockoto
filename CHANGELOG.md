# Changelog

## Unreleased

### New features

#### Path parameter matching in proxy rules

Rule URLs now support `:param` and `*` wildcard segments. The proxy resolves a request in three passes, stopping at the first match:

1. **Exact hash** — `url + method + body` must match exactly (fast path, unchanged).
2. **Null-body hash** — same lookup with no body, so rules created without a `requestBody` filter match any incoming body.
3. **Pattern matching** — tries rules whose URL contains `:param` or `*`, ranked by specificity (`/users/:id` beats `/*`).

```
POST /api/rules  { "url": "/users/:id", "requestMethod": "GET" }
→ GET http://localhost:3001/<projectId>/users/42  ✓ matched
```

#### 409 Conflict includes the existing resource

`POST /api/projects` and `POST /api/rules` now return the conflicting resource under the `existing` key. No follow-up `GET` needed to recover the ID.

```json
{
  "code": "CONFLICT",
  "message": "A project named \"Users Demo\" already exists",
  "existing": { "id": "abc-123", "name": "Users Demo" }
}
```

#### Project manifest endpoint

Single call that replaces the multi-step discovery flow.

```
GET /api/projects/:id/manifest
```

```json
{
  "project": { "id": "...", "name": "...", "baseUrl": "..." },
  "activeCollection": { "id": "...", "name": "...", "mode": "local" },
  "rules": [
    {
      "id": "...",
      "url": "/users/:id",
      "requestMethod": "GET",
      "isEnabled": true,
      "responseCount": 2,
      "activeResponse": { "statusCode": 200, "headers": {}, "body": {} }
    }
  ],
  "readinessWarnings": ["Rule POST /orders has no active response — proxy will return 404"]
}
```

`readinessWarnings` is empty when the collection is fully proxy-ready. `activeCollection` is `null` and `readinessWarnings` contains a 503 notice when no collection is active.

#### Readiness warnings on active collection

`GET /api/collections/project/:projectId/active` now includes a `readinessWarnings` array — every enabled rule that has no active response is listed. An empty array means the collection is ready.

```json
{
  "id": "...",
  "name": "v1",
  "mode": "local",
  "isActive": true,
  "readinessWarnings": ["Rule DELETE /users has no active response — proxy will return 404"]
}
```

---

### Bug fixes

**Proxy**
- Rules created without a `requestBody` filter now correctly match incoming requests that have a body (null-body hash fallback).
- Pattern-matching fallback now respects `requestBody` filters — two rules with the same URL pattern but different body filters are correctly distinguished.
- `NoActiveCollectionError` now returns 404 instead of 500.

**Rules**
- Duplicate-rule 409 now always includes the `existing` rule in the response body, even when the conflict is detected by the database UNIQUE constraint (TOCTOU race).
- `readinessWarnings` no longer flags disabled rules (`isEnabled: false`) as missing an active response.

**Error handler**
- `ConflictError` returns 409, `ValidationError` returns 400. Both previously fell through to 500.
- Fastify built-in parse errors (e.g. malformed JSON body) are forwarded with their original status code instead of 500.

**Performance**
- `getActiveWithWarnings` and `getManifest` replaced per-rule response queries with a single `findByRuleIds` batch query, eliminating the N+1 pattern.

---

### Pending

#### Response body templating *(disabled — pending UI toggle per rule)*

Infrastructure is implemented and tested but disabled in the proxy until the UI exposes a per-rule toggle. When re-enabled, stored response bodies can reference these variables:

| Variable | Replaced with |
|---|---|
| `{{$uuid}}` | Fresh `crypto.randomUUID()` |
| `{{$timestamp}}` | Unix epoch seconds |
| `{{$isodate}}` | ISO-8601 date string |
| `{{$body.field}}` | Dot-path into the incoming request body |
