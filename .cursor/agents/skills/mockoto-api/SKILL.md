---
name: mockoto-api
description: >
  Creates, reads, updates, and deletes Mockoto resources via the management REST
  API (projects, collections, rules, rule-responses). Use when automating mocks,
  calling localhost:3000/api, writing scripts, or implementing POST /api/agent.
  For full scenario playbooks use mockoto-scaffold; for isActive use mockoto-switching.
---

# Mockoto REST API

**Base URL:** `http://localhost:3000/api`  
**Proxy:** `http://localhost:3001/<projectId>/<path>`

Agents control **everything** through this API. Start with [agent-toolkit.md](agent-toolkit.md) (helper + discovery). Full playbooks: [scenarios.md](../mockoto-scaffold/scenarios.md).

## Preflight (always)

```http
GET /api/projects
```

If this fails, ask the user to start Mockoto — do not fabricate data.

## Resource map

| Resource | Prefix | PATCH |
|----------|--------|-------|
| Projects | `/projects` | yes |
| Collections | `/collections` | yes |
| Rules | `/rules` | yes |
| Rule responses | `/rule-responses` | yes |
| Agent (stub) | `/agent` | — |

Full routes: [api-reference.md](api-reference.md)

## Create sequence (chain IDs)

```http
POST /api/projects
{ "name": "My API", "baseUrl": "https://api.example.com" }

POST /api/collections
{ "projectId": "<uuid>", "name": "v1", "mode": "local", "recordingStrategy": "none", "isActive": true }

POST /api/rules
{ "projectId": "<uuid>", "collectionId": "<uuid>", "url": "/health", "requestMethod": "GET", "isEnabled": true }

POST /api/rule-responses
{ "ruleId": "<uuid>", "name": "OK", "isActive": true, "statusCode": 200, "body": { "status": "ok" } }
```

Verify: `GET http://localhost:3001/<projectId>/health`

## Read / discover

| Need | Endpoint |
|------|----------|
| All projects | `GET /projects` |
| Active collection | `GET /collections/project/:projectId/active` |
| Rules in collection | `GET /rules/collection/:collectionId` |
| Responses for rule | `GET /rule-responses/rule/:ruleId` |

## Update / delete

| Action | Method | Path |
|--------|--------|------|
| Edit project | PUT/PATCH | `/projects/:id` |
| Switch collection | PATCH | `/collections/:id` `{ "isActive": true }` |
| Edit/disable rule | PUT/PATCH | `/rules/:id` |
| Edit/switch response | PUT/PATCH | `/rule-responses/:id` |
| Delete response | DELETE | `/rule-responses/:id` |
| Delete rule | DELETE | `/rules/:id` |
| Delete collection | DELETE | `/collections/:id` |
| Delete project | DELETE | `/projects/:id` |

Delete order: responses → rules → collections → project.

## Rule response `body` and `headers`

Send **JSON objects or arrays** — not pre-stringified strings.

| Wrong | Correct |
|-------|---------|
| `"body": "{\"status\":\"ok\"}"` | `"body": { "status": "ok" }` |

## Errors agents should expect

| Situation | Typical result |
|-----------|----------------|
| No active collection | Proxy `503` |
| Rule match, no active response | Proxy `404` |
| Duplicate collection name in project | `409` |
| Invalid body vs schema | `400` |
| Unknown id | `404` |

Details: [troubleshooting.md](../mockoto/troubleshooting.md)

## Related

- [agent-toolkit.md](agent-toolkit.md) — TypeScript helper, discovery, delete chain
- [examples.md](examples.md) — curl snippets
- [scenarios.md](../mockoto-scaffold/scenarios.md) — 18+ full workflows
- [mockoto-switching](../mockoto-switching/SKILL.md) — `isActive` semantics
- `scripts/e2e-test.ts` — lifecycle reference
