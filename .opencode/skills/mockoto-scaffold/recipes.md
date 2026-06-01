# Mockoto scaffold recipes

Assume `projectId`, `collectionId`, and `ruleId` from prior creates. API base: `http://localhost:3000/api`.

## Health check

**Rule**

```json
{
  "projectId": "<uuid>",
  "collectionId": "<uuid>",
  "url": "/health",
  "requestMethod": "GET"
}
```

**Response**

```json
{
  "ruleId": "<uuid>",
  "name": "healthy",
  "isActive": true,
  "statusCode": 200,
  "body": "{\"status\":\"ok\"}"
}
```

**Verify:** `GET http://localhost:3001/<projectId>/health`

## REST collection (GET list + GET by id)

Create two rules in the **same active collection**:

| url | requestMethod | response body (example) |
|-----|---------------|------------------------|
| `/items` | GET | `{"items":[]}` |
| `/items/:id` | GET | `{"id":"1","name":"Sample"}` |

Use `path-to-regexp` patterns as in the `url` field (default).

## Error response variant

Add a second **inactive** response, then switch active (see mockoto-switching):

```json
{
  "ruleId": "<uuid>",
  "name": "server error",
  "isActive": false,
  "statusCode": 500,
  "body": "{\"error\":\"internal\"}",
  "isError": true
}
```

## Simulated latency

```json
{
  "ruleId": "<uuid>",
  "name": "slow OK",
  "isActive": true,
  "statusCode": 200,
  "body": "{}",
  "latency": 1500
}
```

`latency` is milliseconds before the proxy returns the mock.

## POST with body filter

When the client sends a JSON body, matching uses canonical body in `lookupHash`. Set `requestBody` on the rule to the filter shape you need (see `CreateRuleSchema` in `@mockoto/shared`).

## Second collection (A/B)

1. `POST /collections` with `isActive: false` and a new name.
2. Copy or create rules under the new `collectionId`.
3. `PATCH /collections/:newId` with `{ "isActive": true }` to swap what the proxy serves.

## Cleanup

Delete in order: rule responses → rules → collections → project (or delete project and rely on cascade if configured).

Reference delete flow: `scripts/e2e-test.ts` (final section).
