import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers/build-app';

const BASE = '/api/projects';

describe('Projects CRUD API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createProject(overrides: Record<string, unknown> = {}) {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { name: 'Test Project', baseUrl: 'https://api.example.com', ownerName: 'test-team', ...overrides },
    });
    return { res, body: res.json() };
  }

  // ── List ──────────────────────────────────────────────────────────────────────

  it('should return empty array when no projects exist', async () => {
    const res = await app.inject({ method: 'GET', url: BASE });
    expect(res.statusCode, `GET ${BASE} → 200`).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('should return all created projects', async () => {
    await createProject({ name: 'Alpha', baseUrl: 'https://alpha.example.com' });
    await createProject({ name: 'Beta', baseUrl: 'https://beta.example.com' });
    const res = await app.inject({ method: 'GET', url: BASE });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  // ── Create ────────────────────────────────────────────────────────────────────

  it('should create a project and return 201 with the new entity', async () => {
    const { res, body } = await createProject({ name: 'My Project', baseUrl: 'https://api.test.com' });

    expect(res.statusCode, `POST ${BASE} → 201`).toBe(201);
    expect(body).toMatchObject({ name: 'My Project', baseUrl: 'https://api.test.com' });
    expect(body.id).toBeTruthy();
    expect(body.createdAt).toBeTypeOf('number');
  });

  it('should reject duplicate project names with 409 CONFLICT', async () => {
    await createProject({ name: 'Duplicate', baseUrl: 'https://first.example.com' });
    const { res } = await createProject({ name: 'Duplicate', baseUrl: 'https://second.example.com' });

    expect(res.statusCode, `Duplicate project name → 409`).toBe(409);
    expect(res.json().code).toBe('CONFLICT');
  });

  it('should reject missing name with 400 VALIDATION', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { baseUrl: 'https://api.test.com' },
    });
    expect(res.statusCode, 'Missing name → 400').toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });

  it('should reject missing baseUrl with 400 VALIDATION', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { name: 'No URL Project' },
    });
    expect(res.statusCode, 'Missing baseUrl → 400').toBe(400);
  });

  it('should reject empty name with 400 VALIDATION', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { name: '', baseUrl: 'https://api.test.com' },
    });
    expect(res.statusCode, 'Empty name → 400').toBe(400);
  });

  // ── Read ──────────────────────────────────────────────────────────────────────

  it('should retrieve a project by id', async () => {
    const { body: created } = await createProject({ name: 'Findable', baseUrl: 'https://find.me' });
    const res = await app.inject({ method: 'GET', url: `${BASE}/${created.id}` });

    expect(res.statusCode, `GET ${BASE}/:id → 200`).toBe(200);
    expect(res.json()).toMatchObject({ id: created.id, name: 'Findable' });
  });

  it('should return 404 NOT_FOUND for unknown project id', async () => {
    const res = await app.inject({ method: 'GET', url: `${BASE}/00000000-0000-0000-0000-000000000000` });
    expect(res.statusCode, 'Unknown id → 404').toBe(404);
    expect(res.json().code).toBe('NOT_FOUND');
  });

  // ── Update (PUT) ──────────────────────────────────────────────────────────────

  it('should update a project via PUT and return the updated entity', async () => {
    const { body: created } = await createProject({ name: 'Original', baseUrl: 'https://original.example.com' });
    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/${created.id}`,
      payload: { name: 'Updated' },
    });

    expect(res.statusCode, `PUT ${BASE}/:id → 200`).toBe(200);
    expect(res.json()).toMatchObject({ id: created.id, name: 'Updated' });
  });

  it('should return 404 when PUTting a non-existent project', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/00000000-0000-0000-0000-000000000000`,
      payload: { name: 'Ghost' },
    });
    expect(res.statusCode, 'PUT unknown → 404').toBe(404);
  });

  it('should reject a conflicting name on PUT with 409', async () => {
    const { body: p1 } = await createProject({ name: 'Alice', baseUrl: 'https://alice.example.com' });
    await createProject({ name: 'Bob', baseUrl: 'https://bob.example.com' });

    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/${p1.id}`,
      payload: { name: 'Bob' },
    });
    expect(res.statusCode, 'Name conflict on PUT → 409').toBe(409);
  });

  // ── Update (PATCH) ────────────────────────────────────────────────────────────

  it('should partially update a project via PATCH', async () => {
    const { body: created } = await createProject({ name: 'Patchable', baseUrl: 'https://patch.me' });
    const res = await app.inject({
      method: 'PATCH',
      url: `${BASE}/${created.id}`,
      payload: { description: 'A patched description' },
    });

    expect(res.statusCode, `PATCH ${BASE}/:id → 200`).toBe(200);
    expect(res.json()).toMatchObject({ description: 'A patched description', name: 'Patchable' });
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  it('should delete a project and return 204', async () => {
    const { body: created } = await createProject({ name: 'Deletable', baseUrl: 'https://delete.me' });
    const del = await app.inject({ method: 'DELETE', url: `${BASE}/${created.id}` });
    expect(del.statusCode, `DELETE ${BASE}/:id → 204`).toBe(204);

    const get = await app.inject({ method: 'GET', url: `${BASE}/${created.id}` });
    expect(get.statusCode, 'Project should be gone after delete → 404').toBe(404);
  });

  it('should return 404 when deleting a non-existent project', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `${BASE}/00000000-0000-0000-0000-000000000000`,
    });
    expect(res.statusCode, 'DELETE unknown → 404').toBe(404);
  });
});
