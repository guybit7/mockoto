# Mockoto API examples

Replace placeholders. Server must be running (`mockoto` CLI or dev serve).

## Create full stack

```bash
API=http://localhost:3000/api

PROJECT=$(curl -s -X POST "$API/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","baseUrl":"https://example.com"}' | jq -r .id)

COLLECTION=$(curl -s -X POST "$API/collections" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT\",\"name\":\"default\",\"mode\":\"local\",\"isActive\":true}" | jq -r .id)

RULE=$(curl -s -X POST "$API/rules" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT\",\"collectionId\":\"$COLLECTION\",\"url\":\"/users\",\"requestMethod\":\"GET\"}" | jq -r .id)

curl -s -X POST "$API/rule-responses" \
  -H "Content-Type: application/json" \
  -d "{\"ruleId\":\"$RULE\",\"name\":\"empty list\",\"isActive\":true,\"statusCode\":200,\"body\":\"{\\\"users\\\":[]}\"}"

curl -s "http://localhost:3001/$PROJECT/users"
```

## List rules in a collection

```http
GET /api/rules/collection/{collectionId}
```

## List responses for a rule

```http
GET /api/rule-responses/rule/{ruleId}
```

## Fetch active collection

```http
GET /api/collections/project/{projectId}/active
```

## TypeScript fetch (matches e2e-test)

```typescript
const BASE = 'http://localhost:3000/api';

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? res.statusText);
  return data;
}
```

See `scripts/e2e-test.ts` for update, switch-active, and delete flows.
