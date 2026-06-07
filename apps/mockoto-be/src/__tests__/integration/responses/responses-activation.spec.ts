import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers/build-app';

const BASE = '/api/rule-responses';
const PROJECTS = '/api/projects';
const COLLECTIONS = '/api/collections';
const RULES = '/api/rules';

describe('Rule Response Activation API', () => {
  let app: FastifyInstance;
  let ruleId: string;

  beforeEach(async () => {
    app = buildTestApp();
    await app.ready();

    const project = await app.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Activation Project', baseUrl: 'https://act.example.com', ownerName: 'test-team' },
    }).then((r) => r.json());

    const collection = await app.inject({
      method: 'POST',
      url: COLLECTIONS,
      payload: { projectId: project.id, name: 'Collection' },
    }).then((r) => r.json());

    const rule = await app.inject({
      method: 'POST',
      url: RULES,
      payload: { projectId: project.id, collectionId: collection.id, url: '/api/test', requestMethod: 'GET' },
    }).then((r) => r.json());
    ruleId = rule.id;
  });

  afterEach(async () => {
    await app.close();
  });

  async function createResponse(overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: 'POST',
      url: BASE,
      payload: { ruleId, statusCode: 200, ...overrides },
    }).then((r) => r.json() as { id: string; isActive: boolean; statusCode: number });
  }

  it('should activate a response via PATCH and deactivate others', async () => {
    const first = await createResponse({ isActive: true });
    const second = await createResponse({ isActive: false });

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/${second.id}`,
      payload: { isActive: true },
    });
    expect(patch.statusCode, 'Activate second → 200').toBe(200);
    expect(patch.json().isActive).toBe(true);

    const firstAfter = await app.inject({ method: 'GET', url: `${BASE}/${first.id}` });
    expect(firstAfter.json().isActive, 'First should be deactivated').toBe(false);
  });

  it('should allow at most one active response per rule', async () => {
    for (let i = 0; i < 3; i++) {
      await createResponse({ isActive: true });
    }
    const all = await app.inject({ method: 'GET', url: `${BASE}/rule/${ruleId}` });
    const active = all.json().filter((r: { isActive: boolean }) => r.isActive);
    expect(active, 'Only one response should be active').toHaveLength(1);
  });

  it('should create an active response via POST with isActive:true', async () => {
    await createResponse({ isActive: true, statusCode: 200 });
    const second = await createResponse({ isActive: true, statusCode: 404 });

    const all = await app.inject({ method: 'GET', url: `${BASE}/rule/${ruleId}` });
    const active = all.json().filter((r: { isActive: boolean }) => r.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(second.id);
  });

  it('should switch active response when a new one is activated', async () => {
    const r1 = await createResponse({ statusCode: 200, isActive: true });
    const r2 = await createResponse({ statusCode: 500, isActive: false });

    await app.inject({
      method: 'PATCH',
      url: `${BASE}/${r2.id}`,
      payload: { isActive: true },
    });

    const r1After = await app.inject({ method: 'GET', url: `${BASE}/${r1.id}` });
    const r2After = await app.inject({ method: 'GET', url: `${BASE}/${r2.id}` });

    expect(r1After.json().isActive, 'r1 should be inactive').toBe(false);
    expect(r2After.json().isActive, 'r2 should be active').toBe(true);
  });
});
