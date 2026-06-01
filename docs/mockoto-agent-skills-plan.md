# Mockoto Agent Skills — Implementation Plan

> **Purpose:** Define how to author Cursor Agent Skills so AI agents can reliably create and manage **projects**, **collections**, **rules**, and **responses**, switch **active** sets at runtime, and eventually drive the UI with capabilities beyond manual clicking.
>
> **Audience:** Skill authors, agent integrators, and contributors wiring `POST /api/agent` and UI automation.
>
> **Status:** Phase 1 implemented — skills live under `.cursor/skills/mockoto*` (synced to `.opencode/skills/`).

---

## 1. Goals

| Goal | Why it matters |
|------|----------------|
| **Correct domain operations** | Agents must not guess API shapes, activation rules, or proxy behavior. |
| **Composable skills** | Small, focused skills load only when needed (token budget). |
| **API-first, UI-aware** | Automation uses REST today; UI routes and panels are documented for future in-IDE / browser agents. |
| **Single source of truth** | Schemas in `@mockoto/shared` and `scripts/e2e-test.ts` beat stale README tables. |
| **Safe switching** | “Active collection” and “active response” are concurrency-sensitive; skills must teach atomic patterns. |

**North star:** An agent can scaffold a working mock from a natural-language prompt—project → active collection → rules → active responses—and verify it via the traffic proxy (`:3001`).

---

## 2. Domain model (what agents must internalize)

```
Project (baseUrl, unique per install)
  └── Collection[]          ← exactly ONE isActive per project (proxy uses this)
        └── Rule[]          ← matched by method + url pattern + lookupHash(body)
              └── RuleResponse[]   ← exactly ONE isActive per rule (proxy returns this)
```

### Runtime path (traffic proxy)

1. Request hits `http://localhost:3001/<projectId>/<path>`.
2. Backend loads the project’s **active collection**.
3. Computes `lookupHash` from path, method, and canonical request body.
4. Finds enabled rule in that collection; returns **active** `rule_response`.
5. If no rule: `local` mode → 404 mock; `proxy` mode → forward to `project.baseUrl` (optional recording).

### Key invariants (non-negotiable in skills)

| Invariant | Enforcement |
|-----------|-------------|
| One active collection per project | `atomicActivate` on `PATCH/PUT` with `isActive: true` |
| One active response per rule | Partial unique index + `atomicActivate` on responses |
| `recordingStrategy` must be `none` when `mode` is `local` | Zod `superRefine` in `@mockoto/shared` |
| Rule uniqueness per collection | Unique index on `(collection_id, lookup_hash)` |

### Terminology (use consistently in all skills)

| Term | Meaning | Do not confuse with |
|------|---------|---------------------|
| **Project** | Top-level workspace; has `baseUrl` | “workspace” (Nx) |
| **Collection** | Versioned set of rules for a project | Postman “collection” file only |
| **Rule** | Match definition (method, URL, optional body) | “Route” in framework routers |
| **Response** / **Rule response** | Mock payload for a rule | HTTP response from real server |
| **Active** | The one item used at proxy time | “Selected” in UI list (UI may show non-active items) |

---

## 3. Skill architecture (recommended)

Follow [Cursor skill best practices](https://cursor.com/docs): YAML frontmatter, third-person `description`, **&lt; 500 lines** in `SKILL.md`, progressive disclosure via sibling files.

### 3.1 Location

| Type | Path | When |
|------|------|------|
| **Canonical (edit here)** | `.cursor/skills/<skill-name>/` | Cursor project skills (per Cursor docs) |
| **Synced copies** | `.agents/skills/`, `.opencode/skills/` | Same content as `.cursor/skills/` — keep in sync when changing Mockoto skills (matches `nx-workspace`, etc.) |
| Personal skills | `~/.cursor/skills/` | Only for developer-specific workflows |

Do **not** write Mockoto domain skills under `~/.cursor/skills-cursor/` (reserved for Cursor internals).

### 3.2 Layered skill set (proposed)

```
.cursor/skills/
├── mockoto/                          # Umbrella — read first for any Mockoto task
│   ├── SKILL.md
│   ├── domain-model.md               # Diagrams, invariants, glossary
│   └── troubleshooting.md
├── mockoto-api/                      # REST automation (primary for agents today)
│   ├── SKILL.md
│   ├── api-reference.md              # Endpoints, bodies, status codes
│   └── examples.md                   # Copy-paste curl / fetch sequences
├── mockoto-scaffold/                 # End-to-end “create a mock” workflows
│   ├── SKILL.md
│   └── recipes.md                    # Health check, CRUD API, error scenarios
├── mockoto-switching/                # Active collection & response switching
│   ├── SKILL.md
│   └── activation-patterns.md
└── mockoto-ui/                       # Optional — UI routes, panels, user flows
    ├── SKILL.md
    └── navigation.md
```

**Why split?**

- **`mockoto`**: Short orientation + links; triggers on “mockoto”, “mock API”, “local API simulation”.
- **`mockoto-api`**: Detailed HTTP contract; triggers on “create project via API”, “curl”, “automate”.
- **`mockoto-scaffold`**: Opinionated recipes; triggers on “set up mocks for…”, “scaffold endpoints”.
- **`mockoto-switching`**: Easy to get wrong; isolated so agents load it when changing `isActive`.
- **`mockoto-ui`**: Load only when task mentions UI, Angular routes, or panel outlets.

### 3.3 `disable-model-invocation`

| Skill | Suggested default |
|-------|-------------------|
| `mockoto`, `mockoto-api`, `mockoto-scaffold` | `false` (auto-invoke when description matches) |
| `mockoto-ui` | `true` (only when UI work is explicit) |

### 3.4 Description template (copy for each skill)

```yaml
description: >
  [WHAT in one sentence]. Use when [trigger phrases],
  [user intents], or when working with Mockoto [entities].
  Do not use for [out-of-scope, e.g. Nx workspace tasks].
```

Example for `mockoto-api`:

```yaml
description: >
  Creates and updates Mockoto resources via the management REST API
  (projects, collections, rules, rule-responses). Use when automating mocks,
  calling localhost:3000/api, scaffolding from scripts, or implementing
  POST /api/agent. Do not use for Nx build/serve tasks.
```

---

## 4. API contract (authoritative for skills)

> **Note:** Public `README.md` lists nested paths like `/api/projects/:id/collections`. The **implemented** API uses **flat resource prefixes** (see `scripts/e2e-test.ts` and controllers). Skills must document the real paths.

| Resource | Base path | Notes |
|----------|-----------|--------|
| Projects | `GET/POST /api/projects`, `GET/PUT/PATCH/DELETE /api/projects/:id` | `baseUrl` unique |
| Collections | `POST /api/collections`, `GET /api/collections/project/:projectId`, `GET /api/collections/project/:projectId/active`, `PATCH /api/collections/:id` | Set `isActive: true` to switch |
| Rules | `POST /api/rules`, `GET /api/rules/collection/:collectionId`, `PATCH /api/rules/:id` | Include `projectId` + `collectionId` on create |
| Rule responses | `POST /api/rule-responses`, `GET /api/rule-responses/rule/:ruleId`, `PATCH /api/rule-responses/:id` | Set `isActive: true` to switch |
| Agent (stub) | `POST /api/agent` `{ "prompt": "..." }` | Placeholder; skills should prefer direct API until implemented |

**Defaults:** Management `http://localhost:3000`, proxy `http://localhost:3001`, DB `./data/mockoto.db` relative to CWD.

**Validation:** DTOs live in `packages/shared/src/lib/*.model.ts` — skills should say “match Create*Schema fields” rather than duplicating every field in `SKILL.md`.

---

## 5. Core workflows (must appear in skills)

### 5.1 Greenfield mock (checklist pattern)

Use this checklist in `mockoto-scaffold/SKILL.md`:

```
- [ ] 1. POST /api/projects { name, baseUrl }
- [ ] 2. POST /api/collections { projectId, name, mode: "local", isActive: true }
- [ ] 3. For each endpoint: POST /api/rules { projectId, collectionId, url, requestMethod, ... }
- [ ] 4. For each rule: POST /api/rule-responses { ruleId, name, statusCode, body, isActive: true }
- [ ] 5. Verify: GET /api/collections/project/:projectId/active
- [ ] 6. Verify proxy: curl http://localhost:3001/<projectId><path>
```

### 5.2 Switch active collection

```
PATCH /api/collections/:targetId
Body: { "isActive": true }
```

- Do **not** manually deactivate siblings; server runs `atomicActivate`.
- After switch, proxy uses the new collection immediately.
- Skill should warn: rules are per-collection; switching collections changes which rules match.

### 5.3 Switch active response (within a rule)

```
PATCH /api/rule-responses/:targetId
Body: { "isActive": true }
```

- Reference implementation: `scripts/e2e-test.ts` (“switch active” section).
- Optional: deactivate previous with `isActive: false` first (e2e does this); activating another with `true` is sufficient.

### 5.4 Collection modes (decision tree)

```
Need only mocks, no upstream?
  → mode: "local", recordingStrategy: "none"

Need to forward unmatched traffic to baseUrl?
  → mode: "proxy", pick recordingStrategy: none | all | success | error
```

---

## 6. UI guidance (`mockoto-ui` skill)

Agents improving or driving the UI need route context, not pixel coordinates.

### 6.1 Route map

| User-facing area | Angular route |
|------------------|---------------|
| Project list | `/projects` |
| Project workspace (collections) | `/projects/:projectId/collections` |
| Rules + response editor | `/projects/:projectId/collections/:collectionId/rules` |
| Side panels | Named outlet `panel` with `:id` child routes |

### 6.2 UI ↔ API mapping

| UI action | API equivalent |
|-----------|----------------|
| “Set as active collection” on collection card | `PATCH /collections/:id` `{ isActive: true }` |
| “Set as active response” on response tab | `PATCH /rule-responses/:id` `{ isActive: true }` |
| Toggle rule enabled | `PATCH /rules/:id` `{ isEnabled: true/false }` |
| Response editor (Monaco body/headers) | `PATCH /rule-responses/:id` with `body`, `headers` |

### 6.3 Future “UI power” directions (document, implement later)

- **Deep links:** Encode `projectId`, `collectionId`, `ruleId`, `responseId` in URL query params for agent handoff.
- **Agent panel:** Chat UI that calls the same services as `CollectionsService` / `RulesService` / `ResponsesService`.
- **Bulk scaffold:** Agent posts a manifest JSON; UI previews diff before apply.
- **Test from UI:** Wire `RuleTestService` outcomes into agent feedback loops.

Keep these in `mockoto-ui/navigation.md` as “planned” so skills do not claim they exist today.

---

## 7. Supporting assets

### 7.1 Generated vs hand-written

| Asset | Maintainer | Update trigger |
|-------|------------|----------------|
| `api-reference.md` | Hand-written initially | Any controller route change |
| Field tables | **Link to** `packages/shared` schemas | Schema change |
| `examples.md` | Hand-written | Copy from `e2e-test.ts` |
| Optional `scripts/mockoto-cli.sh` | Script | Wrap common curl sequences |

**Avoid** duplicating full Zod schemas in markdown—agents can read `packages/shared/src/lib/*.model.ts` when needed.

### 7.2 Validation loop (feedback pattern)

In `mockoto-scaffold/SKILL.md`:

1. Run `pnpm exec tsx scripts/e2e-test.ts` (or document `nx` target if added).
2. If server not running: `mockoto` or `nx serve mockoto-be` per `nx-run-tasks` skill.
3. Only claim success after proxy curl returns expected status/body.

### 7.3 Register skills for discovery

Ensure new skills are discoverable:

- Add entries to repo `AGENTS.md` (if the workspace lists available skills).
- Mirror descriptions in `.cursor/` or OpenCode agent config if the team uses those entry points.

---

## 8. Implementation phases

### Phase 0 — Foundations (1–2 days)

- [ ] Fix or annotate README API table vs actual flat routes (reduces agent confusion).
- [ ] Add `docs/mockoto-agent-skills-plan.md` (this file) to contributor onboarding.
- [ ] Decide canonical env URLs and document in `mockoto/domain-model.md`.

### Phase 1 — API skills (MVP, 2–3 days)

- [x] `mockoto/SKILL.md` — domain summary + links (&lt; 120 lines).
- [x] `mockoto-api/SKILL.md` + `api-reference.md` + `examples.md`.
- [x] `mockoto-switching/SKILL.md` — activation-only, with e2e citations.
- [x] `mockoto-scaffold/SKILL.md` + `recipes.md`.
- [x] `mockoto-ui/SKILL.md` + `navigation.md`.
- [ ] Run manual test: fresh agent session, prompt “create GET /health returning 200 OK”.

### Phase 2 — Scaffold recipes (2 days)

- [ ] `mockoto-scaffold/SKILL.md` + `recipes.md` (health, 404, 500, latency, multiple responses).
- [ ] Optional: thin `scripts/agent-scaffold.json` manifest format for batch create.

### Phase 3 — Agent endpoint (product, parallel track)

- [ ] Replace stub in `apps/mockoto-be/src/app/routes/agent.ts` with orchestration that follows skills’ checklists.
- [ ] Return structured result: `{ projectId, collectionId, rules: [...] }` for UI deep link.
- [ ] Skill `mockoto-agent-endpoint.md` section inside `mockoto-api` when shape stabilizes.

### Phase 4 — UI skill (when needed)

- [ ] `mockoto-ui/SKILL.md` + `navigation.md`.
- [ ] Document panel outlets, dirty guard, TanStack query keys (`['collections', ...]`).

### Phase 5 — Hardening

- [ ] Contract test: assert `api-reference.md` paths match Fastify registrations (script or CI).
- [ ] “Skill lint”: max line count, required frontmatter fields.
- [x] User-facing doc link from README → `.cursor/skills/mockoto/`.

---

## 9. Quality bar (checklist before merging any skill)

### Content

- [ ] `description` is third person, includes WHAT + WHEN + trigger terms.
- [ ] Terminology matches table in §2 (no mixed “endpoint”/“rule” without definition).
- [ ] Active-switching documented with `isActive: true` PATCH pattern.
- [ ] `local` + `recordingStrategy` constraint mentioned where collections are created.
- [ ] Proxy verification step included for scaffold workflows.

### Structure

- [ ] `SKILL.md` under 500 lines; details in linked files one level deep.
- [ ] No Windows backslashes in paths.
- [ ] No time-sensitive “before August 2025” style notes.

### Accuracy

- [ ] Cross-checked against `scripts/e2e-test.ts` and controllers under `apps/mockoto-be/src/app/controllers/`.
- [ ] README discrepancies called out or fixed.

---

## 10. Anti-patterns (teach agents to avoid)

| Anti-pattern | Why | Instead |
|--------------|-----|---------|
| Creating rules without an active collection | Proxy returns 503 “No active collection” | Activate on create or PATCH after |
| Creating rules without active response | Proxy 404 “no active response” | First response with `isActive: true` |
| Nested README paths | 404 on automation | Flat `/api/collections`, `/api/rules`, etc. |
| Duplicating entire Zod schemas in skills | Drift and token waste | Point to `@mockoto/shared` |
| Deactivating all responses then deleting active | Orphan rule | Use service’s `atomicDeleteAndPromote` behavior; document in switching skill |
| Mixing Nx “project” with Mockoto “project” | Wrong commands | Use `nx-workspace` skill separately |

---

## 11. Example skill outline (`mockoto-api/SKILL.md`)

```markdown
---
name: mockoto-api
description: >
  Manages Mockoto projects, collections, rules, and rule-responses via REST.
  Use when automating API mocks, localhost:3000/api, or agent scaffolding.
---

# Mockoto REST API

## Prerequisites
- Server on PORT (default 3000). See mockoto skill for start commands.

## Quick reference
| Action | Method | Path |
| ... |

## Activate collection
PATCH /api/collections/:id  { "isActive": true }

## Activate response
PATCH /api/rule-responses/:id  { "isActive": true }

## Verify via proxy
curl http://localhost:3001/$PROJECT_ID/your/path

## More detail
- [api-reference.md](api-reference.md)
- [examples.md](examples.md)
```

---

## 12. Success metrics

| Metric | Target |
|--------|--------|
| Agent completes greenfield mock without human correction | ≥ 90% on scripted eval prompts |
| Wrong API path rate | 0 after Phase 1 |
| Active-switch failures (503/404 at proxy) | &lt; 5% in evals |
| Skill maintenance | api-reference updated in same PR as controller changes |

---

## 13. Open questions (resolve before Phase 3)

1. **Agent API shape:** Single prompt → full graph, or stepwise tool calls?
2. **Auth:** Will management API gain API keys? Skills need a security section if yes.
3. **Idempotency:** Should agents upsert by `(project, collection, lookupHash)` instead of always POST?
4. **HAR / recording:** Separate `mockoto-import` skill when features land?
5. **CLI vs HTTP:** Should global `mockoto` CLI expose subcommands that mirror skills?

---

## 14. References in this repo

| Source | Use for |
|--------|---------|
| `packages/shared/src/lib/*.model.ts` | Request/response validation |
| `scripts/e2e-test.ts` | Canonical API sequences |
| `apps/mockoto-be/src/app/services/proxy.service.ts` | Runtime matching behavior |
| `apps/mockoto-be/src/app/services/collections.service.ts` | Active collection logic |
| `apps/mockoto-be/src/app/services/rule-responses.service.ts` | Active response logic |
| `README.md` | Product overview (verify API table) |
| `.cursor/skills/nx-workspace/SKILL.md` | Pattern for skill tone and structure |
| Cursor `create-skill` skill | Authoring mechanics |

---

## 15. Next action

1. Review and approve skill names + phase order with the team.
2. Implement **Phase 1** (`mockoto` + `mockoto-api` + `mockoto-switching`).
3. Add a one-line pointer in root `README.md` under “Agent” → link to `.cursor/skills/mockoto/`.

When Phase 1 is done, agents should be able to: **create project → active collection → rules → active responses → verify on :3001** without reading the whole monorepo.
