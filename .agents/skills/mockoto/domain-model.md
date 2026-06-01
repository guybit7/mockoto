# Mockoto domain model

## Glossary

| Term | Definition |
|------|------------|
| **Project** | Named workspace with unique `baseUrl` (upstream reference for proxy mode). |
| **Collection** | Versioned rule set under a project; exactly one `isActive` per project at a time. |
| **Rule** | Matcher: HTTP method, URL pattern, optional body filter; belongs to one collection. |
| **Rule response** | Mock payload (status, headers, body, latency) for a rule; exactly one `isActive` per rule. |
| **Active** | The entity the **traffic proxy** uses at request time—not merely “selected” in the UI list. |

## Collection `mode`

| mode | Unmatched request |
|------|-------------------|
| `local` | `404` mock not found |
| `proxy` | Forward to `project.baseUrl` (may record per `recordingStrategy`) |

`recordingStrategy`: `none` | `all` | `success` | `error` — only meaningful when `mode` is `proxy`. For `local`, use `none`.

## Rule matching (proxy)

1. Resolve project by ID from URL (`/:projectId/*`).
2. Load **active collection** for that project.
3. Compute `lookupHash` from path, method, and canonical request body (see `apps/mockoto-be/src/app/utils/rule-hash.ts`).
4. Find enabled rule in that collection with matching hash.
5. Return **active** rule response body/status/headers.

## Agent endpoint (stub)

`POST /api/agent` with `{ "prompt": "..." }` — placeholder. Agents use direct REST ([scenarios.md](../mockoto-scaffold/scenarios.md)) for full control.

## Agent playbooks

18 end-to-end scenarios: [../mockoto-scaffold/scenarios.md](../mockoto-scaffold/scenarios.md)
