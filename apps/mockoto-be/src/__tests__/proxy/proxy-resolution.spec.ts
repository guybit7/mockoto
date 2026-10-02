import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import type { InjectPayload } from 'light-my-request';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
import { buildTestAppWithProxy } from '../helpers/build-app';

const PROJECTS = '/api/projects';
const COLLECTIONS = '/api/collections';
const RULES = '/api/rules';
const RESPONSES = '/api/rule-responses';

describe('Proxy Resolution', () => {
  let api: FastifyInstance;
  let proxy: FastifyInstance;
  let projectId: string;
  let collectionId: string;

  beforeEach(async () => {
    ({ api, proxy } = buildTestAppWithProxy());
    await api.ready();
    await proxy.ready();

    const project = await api.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Proxy Test Project', baseUrl: 'https://upstream.example.com', ownerName: 'test-team' },
    }).then((r) => r.json());
    projectId = project.id;

    const collection = await api.inject({
      method: 'POST',
      url: COLLECTIONS,
      payload: { projectId, name: 'Proxy Collection', isActive: true },
    }).then((r) => r.json());
    collectionId = collection.id;
  });

  afterEach(async () => {
    await api.close();
    await proxy.close();
  });

  // ── helpers ───────────────────────────────────────────────────────────────────

  async function createRuleWithResponse(opts: {
    url: string;
    method: string;
    requestBody?: Record<string, unknown>;
    statusCode?: number;
    body?: unknown;
    headers?: Record<string, string>;
    passthrough?: boolean;
  }) {
    const rule = await api.inject({
      method: 'POST',
      url: RULES,
      payload: {
        projectId,
        collectionId,
        url: opts.url,
        requestMethod: opts.method,
        ...(opts.requestBody ? { requestBody: opts.requestBody } : {}),
        ...(opts.passthrough ? { passthrough: true } : {}),
      },
    }).then((r) => r.json());

    if (!opts.passthrough) {
      await api.inject({
        method: 'POST',
        url: RESPONSES,
        payload: {
          ruleId: rule.id,
          statusCode: opts.statusCode ?? 200,
          body: opts.body ?? { ok: true },
          headers: opts.headers ?? {},
          isActive: true,
        },
      });
    }

    return rule;
  }

  async function proxyRequest(opts: {
    path: string;
    method?: HttpMethod;
    body?: InjectPayload;
  }) {
    return proxy.inject({
      method: opts.method ?? 'GET',
      url: `/${projectId}${opts.path}`,
      ...(opts.body !== undefined ? { payload: opts.body } : {}),
    });
  }

  // ── No project ────────────────────────────────────────────────────────────────

  it('should return 404 when the project does not exist', async () => {
    const res = await proxy.inject({
      method: 'GET',
      url: `/00000000-0000-0000-0000-000000000000/api/test`,
    });
    expect(res.statusCode, 'Unknown project → 404').toBe(404);
  });

  // ── No active collection ──────────────────────────────────────────────────────

  it('should return 503 when the project has no active collection', async () => {
    // Deactivate the collection
    await api.inject({
      method: 'PATCH',
      url: `${COLLECTIONS}/${collectionId}`,
      payload: { isActive: false },
    });

    const res = await proxyRequest({ path: '/api/anything' });
    expect(res.statusCode, 'No active collection → 503').toBe(503);
  });

  // ── Exact rule match ──────────────────────────────────────────────────────────

  it('should return the mock response for an exact match', async () => {
    await createRuleWithResponse({ url: '/api/users', method: 'GET', statusCode: 200, body: { users: [] } });

    const res = await proxyRequest({ path: '/api/users' });
    expect(res.statusCode, 'Exact match → 200').toBe(200);
    expect(res.json()).toEqual({ users: [] });
  });

  it('should match different methods independently', async () => {
    await createRuleWithResponse({ url: '/api/items', method: 'GET', statusCode: 200, body: { get: true } });
    await createRuleWithResponse({ url: '/api/items', method: 'POST', statusCode: 201, body: { post: true } });

    const getRes = await proxyRequest({ path: '/api/items', method: 'GET' });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json()).toEqual({ get: true });

    const postRes = await proxyRequest({ path: '/api/items', method: 'POST', body: {} });
    expect(postRes.statusCode).toBe(201);
    expect(postRes.json()).toEqual({ post: true });
  });

  it('should return 404 when no rule matches (local mode)', async () => {
    const res = await proxyRequest({ path: '/api/nonexistent' });
    expect(res.statusCode, 'No matching rule in local mode → 404').toBe(404);
  });

  // ── Rule with no active response ──────────────────────────────────────────────

  it('should return 404 when a matched rule has no active response', async () => {
    const rule = await api.inject({
      method: 'POST',
      url: RULES,
      payload: { projectId, collectionId, url: '/api/empty', requestMethod: 'GET' },
    }).then((r) => r.json());

    // Create a response but don't activate it
    await api.inject({
      method: 'POST',
      url: RESPONSES,
      payload: { ruleId: rule.id, statusCode: 200, isActive: false },
    });

    const res = await proxyRequest({ path: '/api/empty' });
    expect(res.statusCode, 'Rule with no active response → 404').toBe(404);
  });

  // ── Pattern matching ──────────────────────────────────────────────────────────

  it('should match :param URL patterns', async () => {
    await createRuleWithResponse({ url: '/api/users/:id', method: 'GET', statusCode: 200, body: { user: 'found' } });

    const res = await proxyRequest({ path: '/api/users/42' });
    expect(res.statusCode, ':param match → 200').toBe(200);
    expect(res.json()).toEqual({ user: 'found' });
  });

  it('should match wildcard * URL patterns', async () => {
    await createRuleWithResponse({ url: '/api/*', method: 'GET', statusCode: 200, body: { wildcard: true } });

    const res = await proxyRequest({ path: '/api/anything' });
    expect(res.statusCode, 'Wildcard match → 200').toBe(200);
  });

  it('should prefer the more specific pattern over a wildcard', async () => {
    await createRuleWithResponse({ url: '/api/*', method: 'GET', statusCode: 200, body: { matched: 'wildcard' } });
    await createRuleWithResponse({ url: '/api/users/:id', method: 'GET', statusCode: 200, body: { matched: 'specific' } });

    const res = await proxyRequest({ path: '/api/users/1' });
    expect(res.json().matched, 'More specific pattern should win').toBe('specific');
  });

  it('should ignore query strings when pattern-matching a :param route', async () => {
    // Pattern-matched rules (containing : or *) strip the query string before comparing.
    await createRuleWithResponse({ url: '/api/search/:type', method: 'GET', statusCode: 200, body: { results: [] } });

    const res = await proxy.inject({
      method: 'GET',
      url: `/${projectId}/api/search/users?q=hello&page=1`,
    });
    expect(res.statusCode, 'Query string stripped during pattern match → 200').toBe(200);
  });

  // ── Request body matching ─────────────────────────────────────────────────────

  it('should match a rule with a specific body filter', async () => {
    await createRuleWithResponse({
      url: '/api/search',
      method: 'POST',
      requestBody: { type: 'user' },
      statusCode: 200,
      body: { match: 'user-type' },
    });

    const match = await proxyRequest({ path: '/api/search', method: 'POST', body: { type: 'user' } });
    expect(match.statusCode, 'Body match → 200').toBe(200);

    const miss = await proxyRequest({ path: '/api/search', method: 'POST', body: { type: 'order' } });
    expect(miss.statusCode, 'Body mismatch → 404').toBe(404);
  });

  it('should match a rule without a body filter against any incoming body', async () => {
    await createRuleWithResponse({ url: '/api/items', method: 'POST', statusCode: 200, body: { ok: true } });

    const res = await proxyRequest({ path: '/api/items', method: 'POST', body: { anything: 'here' } });
    expect(res.statusCode, 'No body filter → matches any body').toBe(200);
  });

  // ── Response data ─────────────────────────────────────────────────────────────

  it('should return the configured status code', async () => {
    await createRuleWithResponse({ url: '/api/error', method: 'GET', statusCode: 503 });

    const res = await proxyRequest({ path: '/api/error' });
    expect(res.statusCode, 'Custom status code → 503').toBe(503);
  });

  it('should propagate custom response headers', async () => {
    await createRuleWithResponse({
      url: '/api/with-headers',
      method: 'GET',
      statusCode: 200,
      headers: { 'x-custom-header': 'my-value' },
    });

    const res = await proxyRequest({ path: '/api/with-headers' });
    expect(res.headers['x-custom-header'], 'Custom header propagated').toBe('my-value');
  });

  // ── Content types ─────────────────────────────────────────────────────────────

  it('should default to application/json when no content type is stored', async () => {
    await createRuleWithResponse({ url: '/api/json', method: 'GET', body: { ok: true } });

    const res = await proxyRequest({ path: '/api/json' });
    expect(res.headers['content-type'], 'Default content type').toContain('application/json');
    expect(res.json()).toEqual({ ok: true });
  });

  it('should serve a plain-text body verbatim with its content type', async () => {
    await createRuleWithResponse({
      url: '/api/health',
      method: 'GET',
      body: 'OK',
      headers: { 'content-type': 'text/plain' },
    });

    const res = await proxyRequest({ path: '/api/health' });
    expect(res.headers['content-type'], 'Stored content type served').toContain('text/plain');
    expect(res.body, 'Text body is not JSON-quoted').toBe('OK');
  });

  it('should serve an XML body verbatim', async () => {
    const xml = '<?xml version="1.0"?>\n<user id="1"><name>Alice</name></user>';
    await createRuleWithResponse({
      url: '/api/user.xml',
      method: 'GET',
      body: xml,
      headers: { 'content-type': 'application/xml' },
    });

    const res = await proxyRequest({ path: '/api/user.xml' });
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.body).toBe(xml);
  });

  it('should let a mixed-case Content-Type header replace the default', async () => {
    await createRuleWithResponse({
      url: '/api/mixed-case',
      method: 'GET',
      body: 'hello',
      headers: { 'Content-Type': 'text/plain' },
    });

    const res = await proxyRequest({ path: '/api/mixed-case' });
    expect(res.headers['content-type'], 'Single content type, not json + text').toBe('text/plain');
    expect(res.body).toBe('hello');
  });

  it('should keep JSON-quoting a string body when the content type is JSON', async () => {
    await createRuleWithResponse({ url: '/api/json-string', method: 'GET', body: 'hello' });

    const res = await proxyRequest({ path: '/api/json-string' });
    expect(res.body, 'A JSON string document').toBe('"hello"');
  });

  // ── Active response switching ─────────────────────────────────────────────────

  it('should serve the currently active response', async () => {
    const rule = await api.inject({
      method: 'POST',
      url: RULES,
      payload: { projectId, collectionId, url: '/api/switch', requestMethod: 'GET' },
    }).then((r) => r.json());

    const r200 = await api.inject({
      method: 'POST',
      url: RESPONSES,
      payload: { ruleId: rule.id, statusCode: 200, body: { version: 'v1' }, isActive: true },
    }).then((r) => r.json());

    const r404 = await api.inject({
      method: 'POST',
      url: RESPONSES,
      payload: { ruleId: rule.id, statusCode: 404, body: { version: 'v2' }, isActive: false },
    }).then((r) => r.json());

    const first = await proxyRequest({ path: '/api/switch' });
    expect(first.json().version).toBe('v1');

    // Switch active response
    await api.inject({
      method: 'PATCH',
      url: `${RESPONSES}/${r404.id}`,
      payload: { isActive: true },
    });

    const second = await proxyRequest({ path: '/api/switch' });
    expect(second.json().version).toBe('v2');
    expect(second.statusCode).toBe(404);
  });
});
