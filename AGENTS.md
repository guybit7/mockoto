# Mockoto domain (agent skills)

For API mocking, projects, collections, rules, and responses, use the Mockoto skills (canonical: `.cursor/skills/`; also under `.agents/skills/`):

| Skill               | Use when                                                      |
| ------------------- | ------------------------------------------------------------- |
| `mockoto`           | Orientation — which skill to load next                        |
| `mockoto-api`       | REST CRUD on `localhost:3000/api` — see `agent-toolkit.md`    |
| `mockoto-scaffold`  | End-to-end mock setup — see **`scenarios.md`** (18 playbooks) |
| `mockoto-switching` | Active collection / active response (`isActive`)              |
| `mockoto-ui`        | Angular UI routes and panel flows                             |

**Agent max control:** full CRUD + switch + proxy verify via existing API only (`POST /api/agent` is stub).  
Playbooks: `.cursor/skills/mockoto-scaffold/scenarios.md`. Troubleshooting: `.cursor/skills/mockoto/troubleshooting.md`.

**Published CLI:** `npm run build:cli` copies skills to `dist/apps/mockoto-be/skills/`. Users run `mockoto skills path` or `GET /api/skills`.

Plan and maintenance notes: `docs/mockoto-agent-skills-plan.md`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
