import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers/build-app';

const BASE = '/api/collections';
const PROJECTS = '/api/projects';

describe('Collections Activation API', () => {
  let app: FastifyInstance;
  let projectId: string;

  beforeEach(async () => {
    app = buildTestApp();
    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Activation Project', baseUrl: 'https://activation.example.com' },
    });
    projectId = res.json().id;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createCollection(name: string, isActive = false) {
    const res = await app.inject({
      method: 'POST',
      url: BASE,
      payload: { projectId, name, isActive },
    });
    return res.json() as { id: string; name: string; isActive: boolean };
  }

  it('should return 404 when no active collection exists for the project', async () => {
    await createCollection('Inactive', false);
    const res = await app.inject({ method: 'GET', url: `${BASE}/project/${projectId}/active` });
    expect(res.statusCode, 'No active collection → 404').toBe(404);
    expect(res.json().code).toBe('NOT_FOUND');
  });

  it('should return the active collection', async () => {
    await createCollection('Active One', true);
    const res = await app.inject({ method: 'GET', url: `${BASE}/project/${projectId}/active` });
    expect(res.statusCode, 'Active collection → 200').toBe(200);
    expect(res.json()).toMatchObject({ name: 'Active One', isActive: true });
  });

  it('should activate a collection via PATCH and deactivate others', async () => {
    const first = await createCollection('First', true);
    const second = await createCollection('Second', false);

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/${second.id}`,
      payload: { isActive: true },
    });
    expect(patch.statusCode, 'Activate second → 200').toBe(200);

    const active = await app.inject({ method: 'GET', url: `${BASE}/project/${projectId}/active` });
    expect(active.json().id, 'Active collection should be Second').toBe(second.id);

    const firstAfter = await app.inject({ method: 'GET', url: `${BASE}/${first.id}` });
    expect(firstAfter.json().isActive, 'First should be deactivated').toBe(false);
  });

  it('should allow only one active collection per project at a time', async () => {
    await createCollection('C1', true);
    await createCollection('C2', true);
    await createCollection('C3', true);

    const all = await app.inject({ method: 'GET', url: `${BASE}/project/${projectId}` });
    const active = all.json().filter((c: { isActive: boolean }) => c.isActive);
    expect(active, 'Only one collection should be active').toHaveLength(1);
  });

  it('should include readinessWarnings on the active collection response', async () => {
    await createCollection('Active', true);
    const res = await app.inject({ method: 'GET', url: `${BASE}/project/${projectId}/active` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('readinessWarnings');
    expect(Array.isArray(res.json().readinessWarnings)).toBe(true);
  });
});
