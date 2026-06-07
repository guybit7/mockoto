import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers/build-app';

const BASE = '/api/rule-responses';
const PROJECTS = '/api/projects';
const COLLECTIONS = '/api/collections';
const RULES = '/api/rules';

describe('Rule Responses CRUD API', () => {
  let app: FastifyInstance;
  let ruleId: string;

  beforeEach(async () => {
    app = buildTestApp();
    await app.ready();

    const project = await app.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Responses Project', baseUrl: 'https://responses.example.com', ownerName: 'test-team' },
    }).then((r) => r.json());

    const collection = await app.inject({
      method: 'POST',
      url: COLLECTIONS,
      payload: { projectId: project.id, name: 'Test Collection' },
    }).then((r) => r.json());

    const rule = await app.inject({
      method: 'POST',
      url: RULES,
      payload: { projectId: project.id, collectionId: collection.id, url: '/api/items', requestMethod: 'GET' },
    }).then((r) => r.json());
    ruleId = rule.id;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createResponse(overrides: Record<string, unknown> = {}) {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { ruleId, statusCode: 200, ...overrides },
    });
    return { res, body: res.json() };
  }

  // ── List ──────────────────────────────────────────────────────────────────────

  it('should return empty array when no responses exist', async () => {
    const res = await app.inject({ method: 'GET', url: BASE });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('should return responses for a rule', async () => {
    await createResponse({ name: 'R1' });
    await createResponse({ name: 'R2' });
    const res = await app.inject({ method: 'GET', url: `${BASE}/rule/${ruleId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  // ── Create ────────────────────────────────────────────────────────────────────

  it('should create a response and return 201', async () => {
    const { res, body } = await createResponse({ statusCode: 201, name: 'Created Response' });
    expect(res.statusCode, `POST ${BASE} → 201`).toBe(201);
    expect(body).toMatchObject({ ruleId, statusCode: 201, name: 'Created Response' });
    expect(body.id).toBeTruthy();
  });

  it('should reject missing ruleId with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { statusCode: 200 },
    });
    expect(res.statusCode, 'Missing ruleId → 400').toBe(400);
  });

  it('should reject statusCode below 100 with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { ruleId, statusCode: 99 },
    });
    expect(res.statusCode, 'statusCode < 100 → 400').toBe(400);
  });

  it('should reject statusCode above 599 with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { ruleId, statusCode: 600 },
    });
    expect(res.statusCode, 'statusCode > 599 → 400').toBe(400);
  });

  it('should store headers and body as JSON', async () => {
    const { body } = await createResponse({
      headers: { 'x-custom': 'header' },
      body: { result: 'ok' },
    });
    expect(body.headers).toEqual({ 'x-custom': 'header' });
    expect(body.body).toEqual({ result: 'ok' });
  });

  // ── Read ──────────────────────────────────────────────────────────────────────

  it('should retrieve a response by id', async () => {
    const { body: created } = await createResponse({ name: 'Findable' });
    const res = await app.inject({ method: 'GET', url: `${BASE}/${created.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: created.id, name: 'Findable' });
  });

  it('should return 404 for unknown response id', async () => {
    const res = await app.inject({ method: 'GET', url: `${BASE}/00000000-0000-0000-0000-000000000000` });
    expect(res.statusCode, 'Unknown id → 404').toBe(404);
    expect(res.json().code).toBe('NOT_FOUND');
  });

  // ── Update ────────────────────────────────────────────────────────────────────

  it('should update a response via PUT', async () => {
    const { body: created } = await createResponse({ statusCode: 200 });
    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/${created.id}`,
      payload: { statusCode: 404 },
    });
    expect(res.statusCode, `PUT ${BASE}/:id → 200`).toBe(200);
    expect(res.json().statusCode).toBe(404);
  });

  it('should partially update a response via PATCH', async () => {
    const { body: created } = await createResponse({ name: 'Old Name' });
    const res = await app.inject({
      method: 'PATCH',
      url: `${BASE}/${created.id}`,
      payload: { name: 'New Name' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('New Name');
  });

  it('should return 404 when updating non-existent response', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/00000000-0000-0000-0000-000000000000`,
      payload: { statusCode: 404 },
    });
    expect(res.statusCode, 'PUT unknown → 404').toBe(404);
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  it('should delete a response and return 204', async () => {
    const { body: created } = await createResponse();
    const del = await app.inject({ method: 'DELETE', url: `${BASE}/${created.id}` });
    expect(del.statusCode, `DELETE ${BASE}/:id → 204`).toBe(204);

    const get = await app.inject({ method: 'GET', url: `${BASE}/${created.id}` });
    expect(get.statusCode, 'Deleted response → 404').toBe(404);
  });

  it('should return 404 when deleting non-existent response', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `${BASE}/00000000-0000-0000-0000-000000000000`,
    });
    expect(res.statusCode, 'DELETE unknown → 404').toBe(404);
  });

  it('should cascade delete responses when the rule is deleted', async () => {
    const { body: resp } = await createResponse();
    await app.inject({ method: 'DELETE', url: `${RULES}/${ruleId}` });

    const get = await app.inject({ method: 'GET', url: `${BASE}/${resp.id}` });
    expect(get.statusCode, 'Response should cascade-delete with rule → 404').toBe(404);
  });
});
