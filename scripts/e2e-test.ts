import assert from 'node:assert/strict';

const BASE = 'http://localhost:3000/api';

// --------------------
// HTTP helper
// --------------------
async function request(path: string, options: RequestInit = {}) {
  const hasBody = options.body !== undefined;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    console.error('❌ Request failed:', path, data);

    const message = data?.message || data?.error || `HTTP ${res.status}`;

    const error = new Error(message);
    (error as any).status = res.status;

    throw error;
  }

  return data;
}

// --------------------
// Test
// --------------------
async function run() {
  console.log('🚀 Starting FULL E2E test...\n');

  const uniqueId = Date.now();

  let projectId: string | null = null;
  let collectionId: string | null = null;
  let ruleId: string | null = null;
  let responseId: string | null = null;

  try {
    // --------------------
    // CREATE
    // --------------------
    const project = await request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Project',
        baseUrl: `http://test-${uniqueId}.local`,
      }),
    });

    projectId = project.id;
    console.log('✔ Project created:', project.id);

    const collection = await request('/collections', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        name: 'Default Collection',
        mode: 'local',
        isActive: true,
      }),
    });

    collectionId = collection.id;
    console.log('✔ Collection created:', collection.id);

    const rule = await request('/rules', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        collectionId,
        url: '/users',
        requestMethod: 'GET',
        requestBody: null,
        passthrough: false,
        isEnabled: true,
      }),
    });

    ruleId = rule.id;
    console.log('✔ Rule created:', rule.id);

    const response = await request('/rule-responses', {
      method: 'POST',
      body: JSON.stringify({
        ruleId,
        name: 'Success Response',
        isActive: true,
        statusCode: 200,
        body: { users: [] },
      }),
    });

    responseId = response.id;
    console.log('✔ RuleResponse created:', response.id);

    // --------------------
    // UPDATE
    // --------------------
    const updatedProject = await request(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Project' }),
    });

    assert(updatedProject.name === 'Updated Project');
    console.log('✔ Project updated');

    const updatedCollection = await request(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Collection' }),
    });

    assert(updatedCollection.name === 'Updated Collection');
    console.log('✔ Collection updated');

    const updatedRule = await request(`/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify({ description: 'Updated rule' }),
    });

    assert(updatedRule.description === 'Updated rule');
    console.log('✔ Rule updated');

    const updatedResponse = await request(`/rule-responses/${responseId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Response' }),
    });

    assert(updatedResponse.name === 'Updated Response');
    console.log('✔ RuleResponse updated');

    // --------------------
    // VERIFY FETCH
    // --------------------
    const responses = await request(`/rule-responses/rule/${ruleId}`);
    assert(responses.length === 1);
    console.log('✔ Fetch verified');

    // --------------------
    // MULTI RESPONSES
    // --------------------
    const response2 = await request('/rule-responses', {
      method: 'POST',
      body: JSON.stringify({
        ruleId,
        name: 'Second Response',
        isActive: false,
        statusCode: 200,
        body: { users: ['second'] },
      }),
    });

    assert(response2.id);
    console.log('✔ Second response created');

    // edit response deeply
    const editedResponse = await request(`/rule-responses/${responseId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Edited Response',
        headers: { 'x-test': '123' },
        body: { users: [{ id: 1 }] },
      }),
    });

    assert(editedResponse.name === 'Edited Response');
    console.log('✔ Response edited');

    // switch active
    await request(`/rule-responses/${responseId}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: false }),
    });

    const activated = await request(`/rule-responses/${response2.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: true }),
    });

    assert(activated.isActive === true);
    console.log('✔ Active switched');

    // verify single active
    const allResponses = await request(`/rule-responses/rule/${ruleId}`);
    const activeResponses = allResponses.filter((r: any) => r.isActive);

    assert(activeResponses.length === 1);
    assert(activeResponses[0].id === response2.id);

    console.log('✔ Active uniqueness verified');

    // --------------------
    // ACTIVE SWITCH AGAIN (no error expected)
    // --------------------
    await request(`/rule-responses/${responseId}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: true }),
    });

    // verify switch
    const afterSwitch = await request(`/rule-responses/rule/${ruleId}`);
    const activeAfterSwitch = afterSwitch.filter((r: any) => r.isActive);

    assert(activeAfterSwitch.length === 1);
    assert(activeAfterSwitch[0].id === responseId);

    console.log('✔ Active auto-switch works');

    let invalidJsonError = false;

    try {
      await request('/rule-responses', {
        method: 'POST',
        body: JSON.stringify({
          ruleId,
          body: '{ invalid json }',
        }),
      });
    } catch {
      invalidJsonError = true;
    }

    assert(invalidJsonError);
    console.log('✔ Invalid JSON rejected');

    // --------------------
    // DELETE RESPONSES FLOW
    // --------------------
    await request(`/rule-responses/${response2.id}`, { method: 'DELETE' });
    console.log('✔ Active response deleted');

    const afterDelete = await request(`/rule-responses/rule/${ruleId}`);
    assert(afterDelete.length === 1);
    console.log('✔ One response left');

    await request(`/rule-responses/${responseId}`, { method: 'DELETE' });
    console.log('✔ Last response deleted');

    const emptyResponses = await request(`/rule-responses/rule/${ruleId}`);
    assert(emptyResponses.length === 0);
    console.log('✔ Empty responses verified');

    // --------------------
    // FINAL DELETE
    // --------------------
    await request(`/rules/${ruleId}`, { method: 'DELETE' });
    console.log('✔ Rule deleted');

    await request(`/collections/${collectionId}`, { method: 'DELETE' });
    console.log('✔ Collection deleted');

    await request(`/projects/${projectId}`, { method: 'DELETE' });
    console.log('✔ Project deleted');

    projectId = null;

    console.log('\n🎉 FULL E2E test passed!');
  } finally {
    if (projectId) {
      try {
        await request(`/projects/${projectId}`, { method: 'DELETE' });
        console.log('✔ Cleanup fallback');
      } catch {}
    }
  }
}

run().catch((err) => {
  console.error('❌ E2E test failed:', err);
  process.exit(1);
});
