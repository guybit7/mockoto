import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers/build-app';

const PROJECTS = '/api/projects';
const COLLECTIONS = '/api/collections';
const RULES = '/api/rules';
const RESPONSES = '/api/rule-responses';

describe('Project Manifest API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 404 for unknown project id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${PROJECTS}/00000000-0000-0000-0000-000000000000/manifest`,
    });
    expect(res.statusCode, 'Unknown project → 404').toBe(404);
  });

  it('should include a readiness warning when there is no active collection', async () => {
    const { body: project } = await app
      .inject({ method: 'POST', url: PROJECTS, payload: { name: 'P1', baseUrl: 'https://p1.example.com' } })
      .then((r) => ({ body: r.json() }));

    const res = await app.inject({ method: 'GET', url: `${PROJECTS}/${project.id}/manifest` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.project.id).toBe(project.id);
    expect(body.activeCollection).toBeNull();
    expect(body.rules).toEqual([]);
    expect(body.readinessWarnings).toContain('No active collection — proxy will return 503');
  });

  it('should reflect the active collection and its rules in the manifest', async () => {
    const project = await app
      .inject({ method: 'POST', url: PROJECTS, payload: { name: 'P2', baseUrl: 'https://p2.example.com' } })
      .then((r) => r.json());

    const collection = await app
      .inject({
        method: 'POST',
        url: COLLECTIONS,
        payload: { projectId: project.id, name: 'Active Col', isActive: true },
      })
      .then((r) => r.json());

    const rule = await app
      .inject({
        method: 'POST',
        url: RULES,
        payload: { projectId: project.id, collectionId: collection.id, url: '/api/hello', requestMethod: 'GET' },
      })
      .then((r) => r.json());

    const manifest = await app
      .inject({ method: 'GET', url: `${PROJECTS}/${project.id}/manifest` })
      .then((r) => r.json());

    expect(manifest.activeCollection.id).toBe(collection.id);
    expect(manifest.rules).toHaveLength(1);
    expect(manifest.rules[0].id).toBe(rule.id);
    expect(manifest.readinessWarnings).toContain(
      `Rule GET /api/hello has no active response — proxy will return 404`,
    );
  });

  it('should not warn about a rule when it has an active response', async () => {
    const project = await app
      .inject({ method: 'POST', url: PROJECTS, payload: { name: 'P3', baseUrl: 'https://p3.example.com' } })
      .then((r) => r.json());

    const collection = await app
      .inject({
        method: 'POST',
        url: COLLECTIONS,
        payload: { projectId: project.id, name: 'Col', isActive: true },
      })
      .then((r) => r.json());

    const rule = await app
      .inject({
        method: 'POST',
        url: RULES,
        payload: { projectId: project.id, collectionId: collection.id, url: '/api/ready', requestMethod: 'GET' },
      })
      .then((r) => r.json());

    await app.inject({
      method: 'POST',
      url: RESPONSES,
      payload: { ruleId: rule.id, statusCode: 200, isActive: true },
    });

    const manifest = await app
      .inject({ method: 'GET', url: `${PROJECTS}/${project.id}/manifest` })
      .then((r) => r.json());

    expect(manifest.readinessWarnings).toHaveLength(0);
    expect(manifest.rules[0].activeResponse.statusCode).toBe(200);
  });
});
