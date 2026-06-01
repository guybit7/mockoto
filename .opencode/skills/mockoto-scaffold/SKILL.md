---
name: mockoto-scaffold
description: >
  Scaffolds complete Mockoto mocks end-to-end (project, active collection, rules,
  active responses) and verifies via the traffic proxy. Use when the user asks to
  set up mocks, simulate an API, create health checks, or build a mock from a prompt.
  For HTTP helper and CRUD matrix use mockoto-api; for isActive-only use mockoto-switching.
---

# Mockoto scaffold

Execute **real HTTP** against `http://localhost:3000/api`. Use [agent-toolkit.md](../mockoto-api/agent-toolkit.md) for the helper.

## Full scenario catalog (start here)

**[scenarios.md](scenarios.md)** — 18 agent playbooks with checklists:

| # | Scenario |
|---|----------|
| 0 | Discover state (audit existing mocks) |
| 1 | Greenfield API (local mocks) |
| 2 | Idempotent scaffold (find or create) |
| 3 | Add endpoint to existing project |
| 4 | Multiple responses (success + error) |
| 5 | Switch active response |
| 6 | A/B collections |
| 7 | Update mock payload |
| 8 | Fix double-encoded JSON body |
| 9 | Disable rule |
| 10 | Simulated latency |
| 11 | Custom headers |
| 12 | POST with body filter |
| 13 | Proxy mode + recording |
| 14 | Full teardown |
| 15 | Proxy test matrix |
| 16 | Update project metadata |
| 17 | Export manifest (read-only) |
| 18 | Duplicate response as template |

## Greenfield checklist (Scenario 1)

```
- [ ] GET /api/projects (preflight)
- [ ] POST /api/projects — name + baseUrl
- [ ] POST /api/collections — projectId, mode:local, recordingStrategy:none, isActive:true
- [ ] POST /api/rules — one per endpoint
- [ ] POST /api/rule-responses — body:{...} object, isActive:true on one per rule
- [ ] GET /api/collections/project/:projectId/active
- [ ] GET :3001/:projectId/<path> per rule
```

## Defaults

| Field | Value |
|-------|--------|
| Collection `mode` | `local` |
| Collection `recordingStrategy` | `none` |
| First collection | `isActive: true` |
| Rule `isEnabled` | `true` |
| Response `body` | JSON **object** (never string) |
| First response per rule | `isActive: true` |

## Mode decision

```
Only mocks?
  → mode: "local", recordingStrategy: "none"

Forward unmatched to baseUrl?
  → mode: "proxy", recordingStrategy: all | success | error | none
```

## Short recipes

[recipes.md](recipes.md) — health, errors, latency snippets.

## Related

- [mockoto-api](../mockoto-api/SKILL.md) — all endpoints
- [mockoto-switching](../mockoto-switching/SKILL.md) — scenarios 5–6
- [troubleshooting.md](../mockoto/troubleshooting.md) — proxy errors
