import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers/build-app';

const BASE = '/api/rule-responses';
const PROJECTS = '/api/projects';
const COLLECTIONS = '/api/collections';
const RULES = '/api/rules';

describe('Rule Response Promotion on Delete', () => {
  let app: FastifyInstance;
  let ruleId: string;

  beforeEach(async () => {
    app = buildTestApp();
    await app.ready();

    const project = await app.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Promotion Project', baseUrl: 'https://promo.example.com' },
    }).then((r) => r.json());

    const collection = await app.inject({
      method: 'POST',
      url: COLLECTIONS,
      payload: { projectId: project.id, name: 'Collection' },
    }).then((r) => r.json());

    const rule = await app.inject({
      method: 'POST',
      url: RULES,
      payload: { projectId: project.id, collectionId: collection.id, url: '/api/promo', requestMethod: 'GET' },
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
    }).then((r) => r.json() as { id: string; isActive: boolean });
  }

  async function getActiveResponse() {
    const all = await app.inject({ method: 'GET', url: `${BASE}/rule/${ruleId}` });
    return (all.json() as Array<{ id: string; isActive: boolean }>).find((r) => r.isActive) ?? null;
  }

  it('should promote a sibling when the active response is deleted', async () => {
    const sibling = await createResponse({ isActive: false });
    const active = await createResponse({ isActive: true });

    const del = await app.inject({ method: 'DELETE', url: `${BASE}/${active.id}` });
    expect(del.statusCode, 'Delete active response → 204').toBe(204);

    const nowActive = await getActiveResponse();
    expect(nowActive, 'Sibling should be promoted').not.toBeNull();
    expect(nowActive!.id).toBe(sibling.id);
  });

  it('should leave no active response when the only response is deleted', async () => {
    const resp = await createResponse({ isActive: true });

    await app.inject({ method: 'DELETE', url: `${BASE}/${resp.id}` });

    const nowActive = await getActiveResponse();
    expect(nowActive, 'No response should be active after deleting the only one').toBeNull();
  });

  it('should not change other responses when a non-active response is deleted', async () => {
    const active = await createResponse({ isActive: true });
    const inactive = await createResponse({ isActive: false });

    await app.inject({ method: 'DELETE', url: `${BASE}/${inactive.id}` });

    const nowActive = await getActiveResponse();
    expect(nowActive!.id, 'Active response should remain unchanged').toBe(active.id);
  });

  it('should promote one of the remaining siblings when multiple siblings exist', async () => {
    const sibling1 = await createResponse({ isActive: false });
    const sibling2 = await createResponse({ isActive: false });
    const active = await createResponse({ isActive: true });

    await app.inject({ method: 'DELETE', url: `${BASE}/${active.id}` });

    const nowActive = await getActiveResponse();
    expect(nowActive).not.toBeNull();
    expect([sibling1.id, sibling2.id]).toContain(nowActive!.id);
  });
});
