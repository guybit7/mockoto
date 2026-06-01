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

Agents have **full control** via REST — create, read, update, delete, switch active sets, and verify on the proxy. Do not use `POST /api/agent` (stub).

## Domain (one screen)

```
Project
  └── Collection (one isActive per project — proxy uses this set)
        └── Rule (match method + URL + optional body)
              └── RuleResponse (one isActive per rule — proxy returns this)
```

Proxy: `http://localhost:3001/<projectId>/<path>`

## Agent mission map

| Goal | Skill | Playbook |
|------|--------|----------|
| HTTP helper, discovery, CRUD matrix | [mockoto-api](../mockoto-api/SKILL.md) | [agent-toolkit.md](../mockoto-api/agent-toolkit.md) |
| Full end-to-end scenarios (18+) | [mockoto-scaffold](../mockoto-scaffold/SKILL.md) | [scenarios.md](../mockoto-scaffold/scenarios.md) |
| Switch active collection/response | [mockoto-switching](../mockoto-switching/SKILL.md) | scenarios 5–6 |
| UI routes / panels | [mockoto-ui](../mockoto-ui/SKILL.md) | [navigation.md](../mockoto-ui/navigation.md) |
| Errors / 503 / double-encoded JSON | [troubleshooting.md](troubleshooting.md) | — |
| Do/don't for agents | [best-practices.md](best-practices.md) | — |

## Non-negotiable invariants

1. **Active collection** — Without one, proxy returns `503`.
2. **Active response per matched rule** — Without one, proxy returns `404`.
3. **`mode: local`** → `recordingStrategy` must be `'none'`.
4. **`body` / `headers`** on rule-responses — JSON **objects**, never pre-stringified strings.
5. Do not confuse **Nx project** with **Mockoto project**.

## Bundled skills (npm CLI)

Installed via `npm i -g mockoto`, skills ship at `dist/apps/mockoto-be/skills/`:

```bash
mockoto skills path    # absolute path — symlink or copy into .cursor/skills
mockoto skills list
mockoto skills copy    # print cp commands for current project
```

HTTP manifest (server running): `GET http://localhost:3000/api/skills`

## Agent workflow (default)

```
1. GET /api/projects                    (preflight)
2. Create or discover project → collection → rules → responses
3. GET /api/collections/project/:id/active
4. GET :3001/:projectId/path            (verify each mock)
```

## Source of truth

| Topic | Location |
|-------|----------|
| Request/response shapes | `packages/shared/src/lib/*.model.ts` |
| All routes | [mockoto-api/api-reference.md](../mockoto-api/api-reference.md) |
| Lifecycle test | `scripts/e2e-test.ts` |
| Proxy matching | `apps/mockoto-be/src/app/services/proxy.service.ts` |

## More detail

- [domain-model.md](domain-model.md) — glossary, modes, proxy flow
- [best-practices.md](best-practices.md) — agent rules, anti-patterns
- [troubleshooting.md](troubleshooting.md) — status codes, fixes
