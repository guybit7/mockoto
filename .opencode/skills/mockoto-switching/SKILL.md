---
name: mockoto-switching
description: >
  Switches Mockoto's active collection (per project) and active rule response
  (per rule) using isActive flags on PATCH/PUT. Use when changing which mock set
  the proxy serves, A/B collections, or toggling success vs error responses.
  For full CRUD paths use mockoto-api; for greenfield setup use mockoto-scaffold.
---

# Mockoto switching (active collection & response)

**Active** means “used by the traffic proxy at request time,” not just highlighted in the UI.

## Rules

| Scope | How many active | Set via |
|-------|-----------------|---------|
| Collections per **project** | exactly **1** | `isActive: true` on one collection |
| Responses per **rule** | exactly **1** | `isActive: true` on one response |

Do **not** manually deactivate siblings in separate calls—the server uses atomic activation.

## Switch active collection

```http
PATCH /api/collections/{targetCollectionId}
Content-Type: application/json

{ "isActive": true }
```

`PUT` also works. Implementation: `CollectionsService.update` → `repository.atomicActivate`.

**Effects**

- Proxy immediately uses rules from the new collection.
- Other collections in the same project become inactive automatically.

**Verify**

```http
GET /api/collections/project/{projectId}/active
```

## Switch active response

```http
PUT /api/rule-responses/{targetResponseId}
Content-Type: application/json

{ "isActive": true }
```

Implementation: `RuleResponsesService.update` → `repository.atomicActivate`.

**Effects**

- Previous active response for that rule is deactivated.
- Only the targeted rule changes; other rules are unaffected.

**Verify**

```http
GET /api/rule-responses/rule/{ruleId}
```

Exactly one item should have `"isActive": true`.

## Optional two-step (e2e style)

Deactivating before activating is **not required**:

```http
PUT /api/rule-responses/{oldId}  { "isActive": false }
PUT /api/rule-responses/{newId}  { "isActive": true }
```

Activating `{newId}` alone is sufficient.

## Failure modes

| Symptom | Likely cause |
|---------|----------------|
| Proxy `503` | No active collection for project |
| Proxy `404` “no active response” | Rule matched but no `isActive` response |
| Proxy `404` “No mock found” | No rule in **active** collection (`local` mode) |

## UI equivalent

| UI control | API |
|------------|-----|
| “Set as active collection” on collection card | `PATCH /collections/:id` `{ "isActive": true }` |
| “Set as active response” on response tab | `PUT /rule-responses/:id` `{ "isActive": true }` |

Details: [mockoto-ui](../mockoto-ui/SKILL.md)

## Reference test

`scripts/e2e-test.ts` — sections “switch active” and “Active auto-switch works”.
