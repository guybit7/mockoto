---
name: mockoto-api
description: >
  Creates, reads, updates, and deletes Mockoto resources via the management REST
  API (projects, collections, rules, rule-responses). Use when automating mocks,
  calling localhost:3000/api, writing scripts, or implementing POST /api/agent.
  For activation semantics use mockoto-switching; for recipes use mockoto-scaffold.
---

# Mockoto REST API

**Base URL:** `http://localhost:3000/api` (env `PORT`, default `3000`)

Send JSON with `Content-Type: application/json`. Bodies must match Zod schemas in `packages/shared/src/lib/*.model.ts`.

## Resource map

| Resource | Prefix |
|----------|--------|
| Projects | `/projects` |
| Collections | `/collections` |
| Rules | `/rules` |
| Rule responses | `/rule-responses` |
| Agent (stub) | `POST /agent` |

Full route table: [api-reference.md](api-reference.md)

## Minimal create sequence

```http
POST /api/projects
{ "name": "My API", "baseUrl": "https://api.example.com" }

POST /api/collections
{ "projectId": "<uuid>", "name": "v1", "mode": "local", "isActive": true }

POST /api/rules
{ "projectId": "<uuid>", "collectionId": "<uuid>", "url": "/health", "requestMethod": "GET" }

POST /api/rule-responses
{ "ruleId": "<uuid>", "name": "OK", "isActive": true, "statusCode": 200, "body": "{\"status\":\"ok\"}" }
```

Verify proxy: `GET http://localhost:3001/<projectId>/health`

## Update methods

| Resource | PUT | PATCH |
|----------|-----|-------|
| Projects | yes | no |
| Collections | yes | yes |
| Rules | yes | no |
| Rule responses | yes | no |

Prefer **PATCH** on collections when toggling `isActive` only.

## Errors agents should expect

| Situation | Typical result |
|-----------|----------------|
| No active collection | Proxy `503` |
| Rule match, no active response | Proxy `404` |
| Duplicate collection name in project | `409` Conflict |
| Invalid body vs schema | `400` validation |
| Unknown id | `404` |

## Examples and e2e

- [examples.md](examples.md) — curl/fetch snippets
- `scripts/e2e-test.ts` — full lifecycle test (run against a live server)

## Related skills

- [mockoto-switching](../mockoto-switching/SKILL.md) — `isActive` behavior
- [mockoto-scaffold](../mockoto-scaffold/SKILL.md) — opinionated recipes
