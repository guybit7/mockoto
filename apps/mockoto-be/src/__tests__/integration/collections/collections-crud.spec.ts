import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers/build-app';

const BASE = '/api/collections';
const PROJECTS = '/api/projects';

describe('Collections CRUD API', () => {
  let app: FastifyInstance;
  let projectId: string;

  beforeEach(async () => {
    app = buildTestApp();
    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Test Project', baseUrl: 'https://api.example.com' },
    });
    projectId = res.json().id;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createCollection(overrides: Record<string, unknown> = {}) {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId, name: 'Test Collection', ...overrides },
    });
    return { res, body: res.json() };
  }

  // ── List ──────────────────────────────────────────────────────────────────────

  it('should return empty array when no collections exist', async () => {
    const res = await app.inject({ method: 'GET', url: BASE });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  // ── Create ────────────────────────────────────────────────────────────────────

  it('should create a collection and return 201', async () => {
    const { res, body } = await createCollection({ name: 'My Collection' });
    expect(res.statusCode, `POST ${BASE} → 201`).toBe(201);
    expect(body).toMatchObject({ name: 'My Collection', projectId, mode: 'local' });
    expect(body.id).toBeTruthy();
  });

  it('should reject duplicate name in same project with 409 CONFLICT', async () => {
    await createCollection({ name: 'Duplicate' });
    const { res } = await createCollection({ name: 'Duplicate' });
    expect(res.statusCode, 'Duplicate name → 409').toBe(409);
    expect(res.json().code).toBe('CONFLICT');
  });

  it('should allow same name in different projects', async () => {
    const p2 = await app.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Other Project', baseUrl: 'https://other.example.com' },
    }).then((r) => r.json());

    await createCollection({ name: 'SharedName' });
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId: p2.id, name: 'SharedName' },
    });
    expect(res.statusCode, 'Same name in different project → 201').toBe(201);
  });

  it('should reject missing projectId with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { name: 'No Project' },
    });
    expect(res.statusCode, 'Missing projectId → 400').toBe(400);
  });

  it('should reject missing name with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId },
    });
    expect(res.statusCode, 'Missing name → 400').toBe(400);
  });

  it('should reject local mode with non-none recordingStrategy with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId, name: 'Invalid', mode: 'local', recordingStrategy: 'all' },
    });
    expect(res.statusCode, 'local mode + recordingStrategy → 400').toBe(400);
  });

  it('should accept proxy mode with recording strategy', async () => {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId, name: 'Proxy Col', mode: 'proxy', recordingStrategy: 'all' },
    });
    expect(res.statusCode, 'proxy + recordingStrategy → 201').toBe(201);
  });

  // ── Read ──────────────────────────────────────────────────────────────────────

  it('should retrieve a collection by id', async () => {
    const { body: created } = await createCollection({ name: 'Findable' });
    const res = await app.inject({ method: 'GET', url: `${BASE}/${created.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: created.id, name: 'Findable' });
  });

  it('should return 404 for unknown collection id', async () => {
    const res = await app.inject({ method: 'GET', url: `${BASE}/00000000-0000-0000-0000-000000000000` });
    expect(res.statusCode, 'Unknown id → 404').toBe(404);
    expect(res.json().code).toBe('NOT_FOUND');
  });

  it('should retrieve collections by project', async () => {
    await createCollection({ name: 'A' });
    await createCollection({ name: 'B' });
    const res = await app.inject({ method: 'GET', url: `${BASE}/project/${projectId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });

  // ── Update ────────────────────────────────────────────────────────────────────

  it('should update a collection via PUT', async () => {
    const { body: created } = await createCollection({ name: 'Original' });
    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/${created.id}`,
      payload: { name: 'Renamed' },
    });
    expect(res.statusCode, `PUT ${BASE}/:id → 200`).toBe(200);
    expect(res.json().name).toBe('Renamed');
  });

  it('should partially update a collection via PATCH', async () => {
    const { body: created } = await createCollection({ name: 'Patchable' });
    const res = await app.inject({
      method: 'PATCH',
      url: `${BASE}/${created.id}`,
      payload: { description: 'A description' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().description).toBe('A description');
  });

  it('should return 404 when updating non-existent collection', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `${BASE}/00000000-0000-0000-0000-000000000000`,
      payload: { name: 'Ghost' },
    });
    expect(res.statusCode, 'PUT unknown → 404').toBe(404);
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  it('should delete a collection and return 204', async () => {
    const { body: created } = await createCollection({ name: 'Deletable' });
    const del = await app.inject({ method: 'DELETE', url: `${BASE}/${created.id}` });
    expect(del.statusCode, `DELETE ${BASE}/:id → 204`).toBe(204);

    const get = await app.inject({ method: 'GET', url: `${BASE}/${created.id}` });
    expect(get.statusCode, 'Deleted collection → 404').toBe(404);
  });

  it('should return 404 when deleting non-existent collection', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `${BASE}/00000000-0000-0000-0000-000000000000`,
    });
    expect(res.statusCode, 'DELETE unknown → 404').toBe(404);
  });
});
