import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers/build-app';

const BASE = '/api/rules';
const PROJECTS = '/api/projects';
const COLLECTIONS = '/api/collections';

describe('Rules CRUD API', () => {
  let app: FastifyInstance;
  let projectId: string;
  let collectionId: string;

  beforeEach(async () => {
    app = buildTestApp();
    await app.ready();

    const project = await app.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Rules Project', baseUrl: 'https://rules.example.com' },
    }).then((r) => r.json());
    projectId = project.id;

    const collection = await app.inject({
      method: 'POST',
      url: COLLECTIONS,
      payload: { projectId, name: 'Test Collection' },
    }).then((r) => r.json());
    collectionId = collection.id;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createRule(overrides: Record<string, unknown> = {}) {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: {
        projectId,
        collectionId,
        url: '/api/users',
        requestMethod: 'GET',
        ...overrides,
      },
    });
    return { res, body: res.json() };
  }

  // ── List ──────────────────────────────────────────────────────────────────────

  it('should return empty array when no rules exist', async () => {
    const res = await app.inject({ method: 'GET', url: BASE });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('should return rules for a collection', async () => {
    await createRule({ url: '/api/a', requestMethod: 'GET' });
    await createRule({ url: '/api/b', requestMethod: 'POST' });

    const res = await app.inject({ method: 'GET', url: `${BASE}/collection/${collectionId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  // ── Create ────────────────────────────────────────────────────────────────────

  it('should create a rule and return 201', async () => {
    const { res, body } = await createRule({ url: '/api/items', requestMethod: 'GET' });
    expect(res.statusCode, `POST ${BASE} → 201`).toBe(201);
    expect(body).toMatchObject({ url: '/api/items', requestMethod: 'GET', collectionId });
    expect(body.id).toBeTruthy();
    expect(body.lookupHash).toBeTruthy();
  });

  it('should reject duplicate url+method in same collection with 409 CONFLICT', async () => {
    await createRule({ url: '/api/users', requestMethod: 'GET' });
    const { res } = await createRule({ url: '/api/users', requestMethod: 'GET' });
    expect(res.statusCode, 'Duplicate rule → 409').toBe(409);
    expect(res.json().code).toBe('CONFLICT');
  });

  it('should allow same url+method in different collections', async () => {
    const col2 = await app.inject({
      method: 'POST',
      url: COLLECTIONS,
      payload: { projectId, name: 'Second Collection' },
    }).then((r) => r.json());

    await createRule({ url: '/api/shared', requestMethod: 'GET' });
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId, collectionId: col2.id, url: '/api/shared', requestMethod: 'GET' },
    });
    expect(res.statusCode, 'Same rule in different collection → 201').toBe(201);
  });

  it('should treat same url+method with different body as distinct rules', async () => {
    await createRule({ url: '/api/search', requestMethod: 'POST', requestBody: { type: 'a' } });
    const { res } = await createRule({ url: '/api/search', requestMethod: 'POST', requestBody: { type: 'b' } });
    expect(res.statusCode, 'Different body → 201 (distinct rule)').toBe(201);
  });

  it('should reject missing collectionId with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId, url: '/api/x', requestMethod: 'GET' },
    });
    expect(res.statusCode, 'Missing collectionId → 400').toBe(400);
  });

  it('should reject missing url with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId, collectionId, requestMethod: 'GET' },
    });
    expect(res.statusCode, 'Missing url → 400').toBe(400);
  });

  it('should reject invalid HTTP method with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId, collectionId, url: '/api/x', requestMethod: 'INVALID' },
    });
    expect(res.statusCode, 'Invalid method → 400').toBe(400);
  });

  // ── Read ──────────────────────────────────────────────────────────────────────

  it('should retrieve a rule by id', async () => {
    const { body: created } = await createRule({ url: '/api/findable', requestMethod: 'GET' });
    const res = await app.inject({ method: 'GET', url: `${BASE}/${created.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: created.id, url: '/api/findable' });
  });

  it('should return 404 for unknown rule id', async () => {
    const res = await app.inject({ method: 'GET', url: `${BASE}/00000000-0000-0000-0000-000000000000` });
    expect(res.statusCode, 'Unknown id → 404').toBe(404);
    expect(res.json().code).toBe('NOT_FOUND');
  });

  // ── Update ────────────────────────────────────────────────────────────────────

  it('should update a rule via PUT', async () => {
    const { body: created } = await createRule({ url: '/api/original', requestMethod: 'GET' });
    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/${created.id}`,
      payload: { url: '/api/updated' },
    });
    expect(res.statusCode, `PUT ${BASE}/:id → 200`).toBe(200);
    expect(res.json().url).toBe('/api/updated');
  });

  it('should partially update a rule via PATCH', async () => {
    const { body: created } = await createRule();
    const res = await app.inject({
      method: 'PATCH',
      url: `${BASE}/${created.id}`,
      payload: { description: 'Updated desc' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().description).toBe('Updated desc');
  });

  it('should disable a rule via PATCH', async () => {
    const { body: created } = await createRule();
    const res = await app.inject({
      method: 'PATCH',
      url: `${BASE}/${created.id}`,
      payload: { isEnabled: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isEnabled).toBe(false);
  });

  it('should return 404 when updating non-existent rule', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/00000000-0000-0000-0000-000000000000`,
      payload: { url: '/api/ghost' },
    });
    expect(res.statusCode, 'PUT unknown → 404').toBe(404);
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  it('should delete a rule and return 204', async () => {
    const { body: created } = await createRule();
    const del = await app.inject({ method: 'DELETE', url: `${BASE}/${created.id}` });
    expect(del.statusCode, `DELETE ${BASE}/:id → 204`).toBe(204);

    const get = await app.inject({ method: 'GET', url: `${BASE}/${created.id}` });
    expect(get.statusCode, 'Deleted rule → 404').toBe(404);
  });

  it('should return 404 when deleting non-existent rule', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `${BASE}/00000000-0000-0000-0000-000000000000`,
    });
    expect(res.statusCode, 'DELETE unknown → 404').toBe(404);
  });

  it('should cascade delete rules when the collection is deleted', async () => {
    const { body: rule } = await createRule();
    await app.inject({ method: 'DELETE', url: `${COLLECTIONS}/${collectionId}` });

    const get = await app.inject({ method: 'GET', url: `${BASE}/${rule.id}` });
    expect(get.statusCode, 'Rule should be cascade-deleted → 404').toBe(404);
  });
});
