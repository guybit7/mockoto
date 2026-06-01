---
name: mockoto
description: >
  Orient agents to Mockoto's domain (projects, collections, rules, responses)
  and which skill to load next. Use when the user mentions Mockoto, API mocking,
  local API simulation, traffic proxy, or scaffolding mocks. Do not use for
  Nx workspace tasks (use nx-workspace) or unrelated monorepo work.
---

# Mockoto

Mockoto is a local API simulation layer: management UI + REST API on port **3000**, traffic proxy on port **3001**.

## Domain (one screen)

```
Project
  └── Collection (one isActive per project — proxy uses this set)
        └── Rule (match method + URL + optional body)
              └── RuleResponse (one isActive per rule — proxy returns this)
```

Proxy request shape: `http://localhost:3001/<projectId>/<path>`

## Which skill to use

| Task | Skill |
|------|--------|
| HTTP CRUD, paths, status codes | [mockoto-api](../mockoto-api/SKILL.md) |
| End-to-end “build a mock” checklists | [mockoto-scaffold](../mockoto-scaffold/SKILL.md) |
| Switch active collection or response | [mockoto-switching](../mockoto-switching/SKILL.md) |
| Angular UI routes, panels, UX flows | [mockoto-ui](../mockoto-ui/SKILL.md) |
| Run/build this monorepo | `nx-workspace`, `nx-run-tasks` |

## Non-negotiable invariants

1. **Active collection** — Without one, proxy returns `503` (“No active collection”).
2. **Active response per matched rule** — Without one, proxy returns `404` (“no active response”).
3. **`mode: local`** → `recordingStrategy` must be `'none'` (Zod enforces this).
4. Do not confuse **Nx project** with **Mockoto project**.

## Source of truth

| Topic | Location |
|-------|----------|
| Request/response shapes | `packages/shared/src/lib/*.model.ts` |
| Canonical API flow | `scripts/e2e-test.ts` |
| Proxy matching | `apps/mockoto-be/src/app/services/proxy.service.ts` |

## More detail

- [domain-model.md](domain-model.md) — glossary, modes, proxy flow
