# Mockoto agent skills — best practices

## Golden rules (agents)

1. **Preflight** — `GET /api/projects` before any write.
2. **Real HTTP** — store every `id` from POST responses; never invent UUIDs.
3. **Object bodies** — `"body": { }` and `"headers": { }`, never stringified JSON inside those fields.
4. **Verify proxy** — `GET :3001/:projectId/path` after changes that affect traffic.
5. **One active** — collection per project, response per rule; single `isActive: true` call to switch.
6. **Right skill** — `mockoto` → pick child; full work in [scenarios.md](../mockoto-scaffold/scenarios.md).
7. **Manifest first** — after scaffolding, call `GET /api/projects/:id/manifest` and check `readinessWarnings[]` is empty before testing the proxy. A non-empty array means some rules will return 404.
8. **409 carries existing** — when POST /projects or POST /rules returns 409, read `response.existing.id` and continue. Never scan the full list to recover from a conflict.
9. **Use :param in URLs** — `/users/:id` works in rule URLs; the proxy matches by pattern when exact hash fails. No need to create one rule per ID.

## Skill loading

| Task | Load |
|------|------|
| Any Mockoto mention | `mockoto` |
| CRUD / scripts | `mockoto-api` + `agent-toolkit.md` |
| Build / extend mocks | `mockoto-scaffold` + `scenarios.md` |
| Toggle active only | `mockoto-switching` |
| UI work | `mockoto-ui` (explicit only) |
| Errors | `troubleshooting.md` |

## Maximum agent control (existing API)

Agents can perform **without UI**:

- Full CRUD on projects, collections, rules, rule-responses
- PATCH/PUT on all resources that support it
- Atomic active switching (collections + responses)
- Proxy verification and test matrices
- Discovery / audit (Scenario 0)
- Idempotent scaffold (Scenario 2)
- A/B collections, latency, custom headers, body-filtered rules
- Teardown (Scenario 14)
- Manifest export (Scenario 17)

**Not available yet:** `POST /api/agent` orchestration, UI deep links — use REST.

## Anti-patterns

1. Stringify `body` / `headers` in API JSON  
2. Skip collection after project  
3. Test only management API, not proxy  
4. Manual deactivate-then-activate siblings  
5. Load all skills for every question  
6. Use `POST /api/agent` for scaffolding  

## Maintainer sync

Edit `.cursor/skills/mockoto*` → copy to `.agents/skills/`.  
On API route changes: update `api-reference.md`, `scenarios.md`, `e2e-test.ts`.

## Quick validation

```
GET /api/projects
POST chain → ids
GET /api/projects/:id/manifest
GET :3001/:projectId/path
GET /api/rule-responses/rule/:ruleId  → one isActive:true
```
