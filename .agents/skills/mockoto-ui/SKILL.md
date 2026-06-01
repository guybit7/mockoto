---
name: mockoto-ui
description: >
  Navigates the Mockoto Angular web UI (routes, panels, collections vs rules vs
  responses) and maps UI actions to REST calls. Use when editing mockoto-ui,
  fixing UX, deep links, or explaining how users switch collections and responses
  in the browser. For HTTP automation use mockoto-api; for isActive semantics
  use mockoto-switching.
disable-model-invocation: true
---

# Mockoto UI

Management UI is served with the backend (default `http://localhost:3000`). Code lives under `packages/mockoto-ui/features/`.

## Route map

| Screen | Path |
|--------|------|
| Projects list | `/projects` |
| Project workspace (collections) | `/projects/:projectId/collections` |
| Rules + response editor | `/projects/:projectId/collections/:collectionId/rules` |

Side panels use named outlet **`panel`** with `:id` child routes (create/edit drawers).

Full tree: [navigation.md](navigation.md)

## Layout on rules page

`RulesPageComponent` — three regions:

1. **Left:** rule list for the collection (`mk-rule-list`)
2. **Center/right:** response editor when a rule is selected (`mk-response-editor`)
3. **Panel outlet:** rule detail form (`rule-panel`)

Collections list uses `CollectionItemComponent` with “Set as active collection”.

## UI action → API

| User action | REST |
|-------------|------|
| Create/edit project | `POST/PUT /api/projects` |
| Create/edit collection | `POST/PATCH /api/collections` |
| Set active collection | `PATCH /api/collections/:id` `{ "isActive": true }` |
| Create/edit rule | `POST/PUT /api/rules` |
| Toggle rule enabled | `PATCH/PUT /api/rules/:id` `{ "isEnabled": bool }` |
| Create/edit response | `POST/PUT /api/rule-responses` |
| Set active response | `PUT /api/rule-responses/:id` `{ "isActive": true }` |

## Data layer

Feature services extend `ResourceService` (`@mockoto-ui/core`) and use TanStack Query:

| Service | Key paths |
|---------|-----------|
| `CollectionsService` | `GET /collections/project/:projectId` |
| `RulesService` | `GET /rules/collection/:collectionId` |
| `ResponsesService` | `GET /rule-responses/rule/:ruleId` |

Invalidate query keys after mutations (see each service’s `onSuccess`).

## Guards

`dirtyGuard` on panel routes — prompt before leaving unsaved panel edits.

## Agent / UI integration (planned)

Not implemented yet; avoid claiming these exist:

- URL query params for `ruleId` / `responseId` handoff from agents
- In-app agent chat panel calling the same mutations as above

When building agent UX, reuse the same DTOs as the REST API (`@mockoto/shared`).

## Related skills

- [mockoto-api](../mockoto-api/SKILL.md) — agents should prefer REST for automation
- [mockoto-scaffold/scenarios.md](../mockoto-scaffold/scenarios.md) — full API playbooks
- [mockoto-switching](../mockoto-switching/SKILL.md)
