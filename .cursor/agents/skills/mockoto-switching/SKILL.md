---
name: mockoto-switching
description: >
  Switches Mockoto's active collection (per project) and active rule response
  (per rule) using isActive flags on PATCH/PUT. Use when changing which mock set
  the proxy serves, A/B collections, or toggling success vs error responses.
  For full playbooks see mockoto-scaffold scenarios 5-6.
---

# Mockoto switching (active collection & response)

**Active** = used by the traffic proxy at request time.

Full steps: [scenarios.md](../mockoto-scaffold/scenarios.md) (scenarios 5–6).

## Rules

| Scope | Count | Set via |
|-------|-------|---------|
| Collections per project | **1** active | `PATCH /collections/:id` `{ "isActive": true }` |
| Responses per rule | **1** active | `PUT /rule-responses/:id` `{ "isActive": true }` |

Server **atomic-activates** — do not manually deactivate siblings.

## Switch active collection (Scenario 6)

```http
PATCH /api/collections/{targetCollectionId}
{ "isActive": true }
```

Verify:

```http
GET /api/collections/project/{projectId}/active
GET http://localhost:3001/{projectId}/<path>   → uses new collection's rules
```

## Switch active response (Scenario 5)

```http
PUT /api/rule-responses/{targetResponseId}
{ "isActive": true }
```

Verify:

```http
GET /api/rule-responses/rule/{ruleId}   → one isActive:true
GET http://localhost:3001/{projectId}/<path>
```

## A/B workflow summary

1. `POST /collections` with `isActive: false` (new version)
2. Create rules + responses under new `collectionId`
3. `PATCH /collections/{newId}` `{ "isActive": true }`
4. Proxy immediately serves the new rule set

## Failure modes

| Symptom | Cause |
|---------|--------|
| Proxy `503` | No active collection |
| Proxy `404` no active response | Rule matched, no `isActive` response |
| Proxy `404` no mock | No rule in **active** collection (`local`) |

[troubleshooting.md](../mockoto/troubleshooting.md)

## UI equivalent

| UI | API |
|----|-----|
| Set active collection | `PATCH /collections/:id` `{ "isActive": true }` |
| Set active response | `PUT /rule-responses/:id` `{ "isActive": true }` |

[mockoto-ui](../mockoto-ui/SKILL.md)

## Reference

`scripts/e2e-test.ts` — “switch active”, “Active auto-switch works”
