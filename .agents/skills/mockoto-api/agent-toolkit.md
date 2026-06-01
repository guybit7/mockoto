# Mockoto agent toolkit

Copy this helper into scripts or run inline. **Always** use real HTTP against a running server — never invent IDs or responses.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `MOCKOTO_API` | `http://localhost:3000/api` | Management CRUD |
| `MOCKOTO_PROXY` | `http://localhost:3001` | Traffic verification |

## TypeScript helper (recommended)

```typescript
const API = process.env.MOCKOTO_API ?? 'http://localhost:3000/api';
const PROXY = process.env.MOCKOTO_PROXY ?? 'http://localhost:3001';

export class MockotoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

export async function mockotoApi<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new MockotoApiError(
      (data as { message?: string })?.message ?? res.statusText,
      res.status,
      data,
    );
  }
  return data as T;
}

/** GET proxy — returns status + parsed JSON body when possible */
export async function mockotoProxy(
  projectId: string,
  path: string,
  init: RequestInit = {},
) {
  const url = `${PROXY}/${projectId}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* plain text */
  }
  return { status: res.status, body, headers: Object.fromEntries(res.headers) };
}

export async function preflight(): Promise<void> {
  await mockotoApi('/projects');
}
```

## Discovery commands

| Goal | Call |
|------|------|
| Server up? | `GET /projects` → 200 |
| All projects | `GET /projects` |
| Project by id | `GET /projects/:id` |
| Active collection | `GET /collections/project/:projectId/active` |
| All collections | `GET /collections/project/:projectId` |
| Rules in collection | `GET /rules/collection/:collectionId` |
| Responses for rule | `GET /rule-responses/rule/:ruleId` |
| Find project by name | `GET /projects` → filter `.name` |

## Create chain (store every `id`)

```
POST /projects
POST /collections        { projectId, name, mode: "local", recordingStrategy: "none", isActive: true }
POST /rules              { projectId, collectionId, url, requestMethod, isEnabled: true }
POST /rule-responses     { ruleId, name, statusCode, body: { ... }, isActive: true }
```

## Update / switch

| Action | Call |
|--------|------|
| Switch collection | `PATCH /collections/:id` `{ "isActive": true }` |
| Switch response | `PUT /rule-responses/:id` `{ "isActive": true }` |
| Edit mock body | `PUT /rule-responses/:id` `{ "body": { ... } }` |
| Disable rule | `PATCH /rules/:id` `{ "isEnabled": false }` |
| Rename project | `PUT /projects/:id` `{ "name": "..." }` |

## Delete chain (safe order)

```
DELETE /rule-responses/:id   (each)
DELETE /rules/:id            (each)
DELETE /collections/:id      (non-active first if needed)
DELETE /projects/:id
```

## Body rule (critical)

```typescript
// ✅ CORRECT — object in JSON payload
await mockotoApi('/rule-responses', {
  method: 'POST',
  body: JSON.stringify({
    ruleId,
    body: { users: [] },
  }),
});

// ❌ WRONG — double-encoded in UI
body: JSON.stringify({ users: [] }),
```

`headers` follows the same rule (object, not string).

## Full scenario catalog

Step-by-step playbooks: [../mockoto-scaffold/scenarios.md](../mockoto-scaffold/scenarios.md)
