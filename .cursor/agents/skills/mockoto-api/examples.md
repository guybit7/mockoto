# Mockoto API examples

Server must run on `:3000` (API) and `:3001` (proxy). See [agent-toolkit.md](agent-toolkit.md) and [scenarios.md](../mockoto-scaffold/scenarios.md).

## Preflight

```bash
curl -s http://localhost:3000/api/projects | head
```

## Create full stack (bash)

```bash
API=http://localhost:3000/api
PROXY=http://localhost:3001

PROJECT=$(curl -s -X POST "$API/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","baseUrl":"https://example.com"}' | jq -r .id)

COLLECTION=$(curl -s -X POST "$API/collections" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT\",\"name\":\"default\",\"mode\":\"local\",\"recordingStrategy\":\"none\",\"isActive\":true}" | jq -r .id)

RULE=$(curl -s -X POST "$API/rules" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT\",\"collectionId\":\"$COLLECTION\",\"url\":\"/users\",\"requestMethod\":\"GET\",\"isEnabled\":true}" | jq -r .id)

curl -s -X POST "$API/rule-responses" \
  -H "Content-Type: application/json" \
  -d "{\"ruleId\":\"$RULE\",\"name\":\"empty list\",\"isActive\":true,\"statusCode\":200,\"body\":{\"users\":[]}}"

curl -s "$PROXY/$PROJECT/users" | jq .
```

## Switch active response

```bash
curl -s -X PUT "$API/rule-responses/$RESPONSE_ID" \
  -H "Content-Type: application/json" \
  -d '{"isActive":true}'
```

## Switch active collection

```bash
curl -s -X PATCH "$API/collections/$COLLECTION_ID" \
  -H "Content-Type: application/json" \
  -d '{"isActive":true}'
```

## Discover project by name (jq)

```bash
curl -s "$API/projects" | jq '.[] | select(.name=="Payments Demo") | .id'
```

## TypeScript — full control

See [agent-toolkit.md](agent-toolkit.md) for `mockotoApi`, `mockotoProxy`, `preflight`.

```typescript
import { mockotoApi, mockotoProxy, preflight } from './mockoto-client';

await preflight();

const project = await mockotoApi<{ id: string }>('/projects', {
  method: 'POST',
  body: JSON.stringify({ name: 'Demo', baseUrl: 'https://example.com' }),
});

const collection = await mockotoApi<{ id: string }>('/collections', {
  method: 'POST',
  body: JSON.stringify({
    projectId: project.id,
    name: 'v1',
    mode: 'local',
    recordingStrategy: 'none',
    isActive: true,
  }),
});

const rule = await mockotoApi<{ id: string }>('/rules', {
  method: 'POST',
  body: JSON.stringify({
    projectId: project.id,
    collectionId: collection.id,
    url: '/health',
    requestMethod: 'GET',
    isEnabled: true,
  }),
});

await mockotoApi('/rule-responses', {
  method: 'POST',
  body: JSON.stringify({
    ruleId: rule.id,
    name: 'OK',
    isActive: true,
    statusCode: 200,
    body: { status: 'ok' },
  }),
});

const { status, body } = await mockotoProxy(project.id, '/health');
console.log(status, body);
```

## Reference scripts

| Script | Purpose |
|--------|---------|
| `scripts/e2e-test.ts` | Full CRUD + switch + delete |
| `scripts/scaffold-best-demo.mjs` | Multi-endpoint demo |
| `scripts/fix-best-demo-bodies.mjs` | Repair string-encoded bodies |
