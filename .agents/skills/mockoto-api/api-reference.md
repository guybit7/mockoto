# Mockoto API reference

All paths are under `/api`. Controllers: `apps/mockoto-be/src/app/controllers/`.

## Projects `/projects`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/projects` | — | List all |
| GET | `/projects/:id` | — | By id |
| GET | `/projects/:id/manifest` | — | Full project tree + warnings (see below) |
| POST | `/projects` | `CreateProjectDto` | `201`; name unique. `409` body includes `existing` project |
| PUT | `/projects/:id` | `UpdateProjectDto` | Partial fields allowed in schema |
| PATCH | `/projects/:id` | `UpdateProjectDto` | Same as PUT |
| DELETE | `/projects/:id` | — | `204`; cascades to collections → rules → responses |

**CreateProjectDto:** `name`, `baseUrl` (required); optional `description`, `logoBase64`, `logoUrl`, `isFavorite`, `ownerName`.

### Manifest response (`GET /projects/:id/manifest`)

Single call that replaces the 5-step Scenario 0 discovery flow:

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
  "readinessWarnings": ["Rule GET /orders has no active response — proxy will return 404"]
}
```

`activeCollection` is `null` and `readinessWarnings` contains a 503 notice when no collection is active.

## Collections `/collections`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/collections` | — | List all |
| GET | `/collections/:id` | — | By id |
| GET | `/collections/project/:projectId` | — | All for project |
| GET | `/collections/project/:projectId/active` | — | Active collection + `readinessWarnings[]` array |
| POST | `/collections` | `CreateCollectionDto` | `201` |
| PUT | `/collections/:id` | `UpdateCollectionDto` | Full/partial update |
| PATCH | `/collections/:id` | `UpdateCollectionDto` | Same as PUT |
| DELETE | `/collections/:id` | — | `204` |

**Active collection response** now includes a `readinessWarnings` array listing every enabled rule that has no active response (proxy would return 404 for those). Empty array means the collection is fully ready.

**CreateCollectionDto:** `projectId`, `name` (required); `mode` (`local`|`proxy`, default `local`); `recordingStrategy` (default `none`); optional `description`, `source`, `isActive`, `isFavorite`, `ownerName`.

**Invariant:** If `mode` is `local`, `recordingStrategy` must be `none`.

## Rules `/rules`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/rules` | — | List all |
| GET | `/rules/collection/:collectionId` | — | Rules in collection |
| GET | `/rules/:id` | — | By id |
| POST | `/rules` | `CreateRuleDto` | `201`; server sets `lookupHash` |
| PUT | `/rules/:id` | `UpdateRuleDto` | Changing url/method/body updates hash |
| PATCH | `/rules/:id` | `UpdateRuleDto` | e.g. `{ "isEnabled": false }` |
| DELETE | `/rules/:id` | — | `204` |

**CreateRuleDto:** `projectId`, `collectionId`, `url`, `requestMethod` (required); optional `description`, `requestBody`, `passthrough`, `type`, `isFavorite`, `isEnabled`.

**Methods:** `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`.

**Path parameters:** `url` may contain `:param` segments (e.g. `/users/:id`, `/orgs/:orgId/members/:userId`). The proxy first tries an exact hash match, then falls back to pattern matching ordered by specificity. A rule for `/users/:id` beats `/*` when both match.

**Duplicate rule:** `409` body includes `existing` rule when the same `url + method + requestBody` already exists in the collection. Use `existing.id` directly — no need to scan all rules.

## Rule responses `/rule-responses`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/rule-responses` | — | List all |
| GET | `/rule-responses/rule/:ruleId` | — | All for rule |
| GET | `/rule-responses/:id` | — | By id |
| POST | `/rule-responses` | `CreateRuleResponseDto` | `201` |
| PUT | `/rule-responses/:id` | `UpdateRuleResponseDto` | Use for `isActive`, `body`, `headers` |
| PATCH | `/rule-responses/:id` | `UpdateRuleResponseDto` | Same as PUT |
| DELETE | `/rule-responses/:id` | — | `204`; may promote another active |

**CreateRuleResponseDto:** `ruleId` (required); optional `name`, `isActive`, `isFavorite`, `statusCode` (default 200), `headers`, `body`, `isError`, `latency`.

`headers` and `body` accept JSON **objects/arrays** (not pre-stringified strings — see [agent-toolkit.md](agent-toolkit.md)).

**Response body templating** — ⚠️ *disabled pending UI toggle per rule.* Infrastructure is implemented but not active. Do not use template variables in stored bodies — they will be returned literally.

## Agent playbooks

Full scenarios: [../mockoto-scaffold/scenarios.md](../mockoto-scaffold/scenarios.md)

## Agent skills (bundled with CLI)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/skills` | Manifest: `root`, `packages[]`, file paths |
| GET | `/skills/:skillName` | `SKILL.md` for package (e.g. `mockoto-api`) |
| GET | `/skills/:skillName/*` | Other files (e.g. `mockoto-scaffold/scenarios.md`) |

CLI: `mockoto skills path` | `mockoto skills list` | `mockoto skills copy`

## Agent

| Method | Path | Body |
|--------|------|------|
| POST | `/agent` | `{ "prompt": string }` |

Stub response only — not a substitute for CRUD above.

## Traffic proxy (not under `/api`)

| Method | URL | Notes |
|--------|-----|-------|
| ANY | `http://localhost:3001/:projectId/*` | Uses active collection + active responses |

Default `PROXY_PORT`: `3001`.
