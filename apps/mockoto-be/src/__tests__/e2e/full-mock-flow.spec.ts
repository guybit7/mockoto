import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestAppWithProxy } from '../helpers/build-app';

const PROJECTS = '/api/projects';
const COLLECTIONS = '/api/collections';
const RULES = '/api/rules';
const RESPONSES = '/api/rule-responses';

/**
 * End-to-end workflow tests.
 *
 * Each scenario runs a complete user journey: create entities, verify behavior,
 * then tear down and confirm cleanup. The proxy app shares the same in-memory DB
 * as the management API so data flows through naturally.
 */

describe('E2E: Full Mock Flow', () => {
  let api: FastifyInstance;
  let proxy: FastifyInstance;

  beforeEach(async () => {
    ({ api, proxy } = buildTestAppWithProxy());
    await api.ready();
    await proxy.ready();
  });

  afterEach(async () => {
    await api.close();
    await proxy.close();
  });

  it('Scenario 1 — Project lifecycle: create, read, update, delete', async () => {
    // Create
    const createRes = await api.inject({
      method: 'POST',
      url: PROJECTS,
      payload: { name: 'Lifecycle Project', baseUrl: 'https://lifecycle.example.com' },
    });
    expect(createRes.statusCode, 'Create project → 201').toBe(201);
    const project = createRes.json();
    expect(project.name).toBe('Lifecycle Project');

    // Read
    const readRes = await api.inject({ method: 'GET', url: `${PROJECTS}/${project.id}` });
    expect(readRes.statusCode, 'Read project → 200').toBe(200);
    expect(readRes.json().id).toBe(project.id);

    // Update
    const updateRes = await api.inject({
      method: 'PATCH',
      url: `${PROJECTS}/${project.id}`,
      payload: { name: 'Updated Lifecycle Project' },
    });
    expect(updateRes.statusCode, 'Update project → 200').toBe(200);
    expect(updateRes.json().name).toBe('Updated Lifecycle Project');

    // Delete
    const deleteRes = await api.inject({ method: 'DELETE', url: `${PROJECTS}/${project.id}` });
    expect(deleteRes.statusCode, 'Delete project → 204').toBe(204);

    const afterDelete = await api.inject({ method: 'GET', url: `${PROJECTS}/${project.id}` });
    expect(afterDelete.statusCode, 'Project gone after delete → 404').toBe(404);
  });

  it('Scenario 2 — Collection activation: create, activate, switch, delete', async () => {
    const project = await api.inject({
      method: 'POST', url: PROJECTS,
      payload: { name: 'Activation Scenario', baseUrl: 'https://act-scenario.example.com' },
    }).then((r) => r.json());

    const c1 = await api.inject({
      method: 'POST', url: COLLECTIONS,
      payload: { projectId: project.id, name: 'Collection 1', isActive: true },
    }).then((r) => r.json());

    const c2 = await api.inject({
      method: 'POST', url: COLLECTIONS,
      payload: { projectId: project.id, name: 'Collection 2' },
    }).then((r) => r.json());

    // c1 should be active
    let active = await api.inject({ method: 'GET', url: `${COLLECTIONS}/project/${project.id}/active` }).then((r) => r.json());
    expect(active.id, 'c1 should be active').toBe(c1.id);

    // Switch to c2
    await api.inject({ method: 'PATCH', url: `${COLLECTIONS}/${c2.id}`, payload: { isActive: true } });
    active = await api.inject({ method: 'GET', url: `${COLLECTIONS}/project/${project.id}/active` }).then((r) => r.json());
    expect(active.id, 'c2 should now be active').toBe(c2.id);

    // Delete c2 — no more active collection
    await api.inject({ method: 'DELETE', url: `${COLLECTIONS}/${c2.id}` });
    const noActive = await api.inject({ method: 'GET', url: `${COLLECTIONS}/project/${project.id}/active` });
    expect(noActive.statusCode, 'No active collection after deleting it → 404').toBe(404);
  });

  it('Scenario 3 — Rule lifecycle: create, update, disable, delete', async () => {
    const project = await api.inject({
      method: 'POST', url: PROJECTS,
      payload: { name: 'Rule Lifecycle', baseUrl: 'https://rule-lifecycle.example.com' },
    }).then((r) => r.json());

    const collection = await api.inject({
      method: 'POST', url: COLLECTIONS,
      payload: { projectId: project.id, name: 'Collection' },
    }).then((r) => r.json());

    const rule = await api.inject({
      method: 'POST', url: RULES,
      payload: { projectId: project.id, collectionId: collection.id, url: '/api/test', requestMethod: 'GET' },
    }).then((r) => r.json());
    expect(rule.isEnabled, 'Rule created enabled').toBe(true);

    // Update
    await api.inject({ method: 'PATCH', url: `${RULES}/${rule.id}`, payload: { url: '/api/updated' } });
    const updated = await api.inject({ method: 'GET', url: `${RULES}/${rule.id}` }).then((r) => r.json());
    expect(updated.url).toBe('/api/updated');

    // Disable
    await api.inject({ method: 'PATCH', url: `${RULES}/${rule.id}`, payload: { isEnabled: false } });
    const disabled = await api.inject({ method: 'GET', url: `${RULES}/${rule.id}` }).then((r) => r.json());
    expect(disabled.isEnabled, 'Rule disabled').toBe(false);

    // Proxy should not match a disabled rule even with an active collection + response
    await api.inject({ method: 'PATCH', url: `${COLLECTIONS}/${collection.id}`, payload: { isActive: true } });
    await api.inject({
      method: 'POST', url: RESPONSES,
      payload: { ruleId: rule.id, statusCode: 200, body: { ok: true }, isActive: true },
    });
    const skipped = await proxy.inject({ method: 'GET', url: `/${project.id}/api/updated` });
    expect(skipped.statusCode, 'Disabled rule skipped by proxy → 404').toBe(404);

    // Delete
    await api.inject({ method: 'DELETE', url: `${RULES}/${rule.id}` });
    const gone = await api.inject({ method: 'GET', url: `${RULES}/${rule.id}` });
    expect(gone.statusCode, 'Rule deleted → 404').toBe(404);
  });

  it('Scenario 4 — Response lifecycle: create, activate, switch, delete with promotion', async () => {
    const project = await api.inject({
      method: 'POST', url: PROJECTS,
      payload: { name: 'Response Lifecycle', baseUrl: 'https://resp-lifecycle.example.com' },
    }).then((r) => r.json());

    const collection = await api.inject({
      method: 'POST', url: COLLECTIONS,
      payload: { projectId: project.id, name: 'Collection' },
    }).then((r) => r.json());

    const rule = await api.inject({
      method: 'POST', url: RULES,
      payload: { projectId: project.id, collectionId: collection.id, url: '/api/r', requestMethod: 'GET' },
    }).then((r) => r.json());

    // Create first response (active)
    const r1 = await api.inject({
      method: 'POST', url: RESPONSES,
      payload: { ruleId: rule.id, statusCode: 200, body: { v: 1 }, isActive: true },
    }).then((r) => r.json());

    // Create second (inactive)
    const r2 = await api.inject({
      method: 'POST', url: RESPONSES,
      payload: { ruleId: rule.id, statusCode: 202, body: { v: 2 }, isActive: false },
    }).then((r) => r.json());

    // Switch to r2
    await api.inject({ method: 'PATCH', url: `${RESPONSES}/${r2.id}`, payload: { isActive: true } });
    expect((await api.inject({ method: 'GET', url: `${RESPONSES}/${r1.id}` }).then((r) => r.json())).isActive, 'r1 deactivated').toBe(false);
    expect((await api.inject({ method: 'GET', url: `${RESPONSES}/${r2.id}` }).then((r) => r.json())).isActive, 'r2 activated').toBe(true);

    // Delete r2 — r1 should be promoted
    await api.inject({ method: 'DELETE', url: `${RESPONSES}/${r2.id}` });
    const promoted = await api.inject({ method: 'GET', url: `${RESPONSES}/${r1.id}` }).then((r) => r.json());
    expect(promoted.isActive, 'r1 promoted after r2 deleted').toBe(true);
  });

  it('Scenario 5 — Full mock flow: create everything and verify proxy serves the mock', async () => {
    // Step 1: Create project
    const project = await api.inject({
      method: 'POST', url: PROJECTS,
      payload: { name: 'Full Flow Project', baseUrl: 'https://full-flow.example.com' },
    }).then((r) => r.json());

    // Step 2: Create and activate collection
    const collection = await api.inject({
      method: 'POST', url: COLLECTIONS,
      payload: { projectId: project.id, name: 'Production Mock', isActive: true },
    }).then((r) => r.json());
    expect(collection.isActive, 'Collection should be active').toBe(true);

    // Step 3: Create rule
    const rule = await api.inject({
      method: 'POST', url: RULES,
      payload: { projectId: project.id, collectionId: collection.id, url: '/api/products', requestMethod: 'GET' },
    }).then((r) => r.json());

    // Step 4: Verify proxy returns 404 (rule has no response yet)
    const noResp = await proxy.inject({ method: 'GET', url: `/${project.id}/api/products` });
    expect(noResp.statusCode, 'No active response → 404').toBe(404);

    // Step 5: Create active response
    await api.inject({
      method: 'POST', url: RESPONSES,
      payload: {
        ruleId: rule.id,
        statusCode: 200,
        body: [{ id: 1, name: 'Widget' }],
        headers: { 'x-mocked': 'true' },
        isActive: true,
      },
    });

    // Step 6: Verify proxy now serves the mock
    const proxied = await proxy.inject({ method: 'GET', url: `/${project.id}/api/products` });
    expect(proxied.statusCode, 'Mock served → 200').toBe(200);
    expect(proxied.json()).toEqual([{ id: 1, name: 'Widget' }]);
    expect(proxied.headers['x-mocked'], 'Custom header propagated').toBe('true');

    // Step 7: Delete everything and confirm cleanup
    await api.inject({ method: 'DELETE', url: `${PROJECTS}/${project.id}` });

    // Proxy should now return 404 (project gone)
    const afterDelete = await proxy.inject({ method: 'GET', url: `/${project.id}/api/products` });
    expect(afterDelete.statusCode, 'Proxy returns 404 after project deleted').toBe(404);
  });
});
