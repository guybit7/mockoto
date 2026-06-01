/**
 * One-off scaffold: THE BEST DEMO — 1 project, 1 collection, 3 rules × 2 responses.
 * Run: node scripts/scaffold-best-demo.mjs
 */
const API = 'http://localhost:3000/api';
const PROXY = 'http://localhost:3001';

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

/** Pass JSON objects — do NOT pre-stringify (server calls JSON.stringify once for storage). */
const rulesSpec = [
  {
    url: '/health',
    method: 'GET',
    description: 'Health check',
    responses: [
      {
        name: 'Healthy',
        isActive: true,
        statusCode: 200,
        body: { status: 'ok', service: 'THE BEST DEMO', uptime: '99.9%' },
      },
      {
        name: 'Degraded',
        isActive: false,
        statusCode: 503,
        isError: true,
        body: { status: 'degraded', message: 'Dependency timeout' },
      },
    ],
  },
  {
    url: '/users',
    method: 'GET',
    description: 'List users',
    responses: [
      {
        name: 'Users found',
        isActive: true,
        statusCode: 200,
        body: {
          users: [
            { id: 1, name: 'Alice Demo', email: 'alice@demo.local' },
            { id: 2, name: 'Bob Demo', email: 'bob@demo.local' },
          ],
          total: 2,
        },
      },
      {
        name: 'Empty list',
        isActive: false,
        statusCode: 200,
        body: { users: [], total: 0 },
      },
    ],
  },
  {
    url: '/products',
    method: 'GET',
    description: 'Product catalog',
    responses: [
      {
        name: 'Catalog',
        isActive: true,
        statusCode: 200,
        body: {
          products: [
            { id: 'sku-101', title: 'Demo Widget', price: 9.99, inStock: true },
            { id: 'sku-202', title: 'Premium Gadget', price: 49.5, inStock: false },
          ],
        },
      },
      {
        name: 'Sold out',
        isActive: false,
        statusCode: 200,
        body: {
          products: [],
          message: 'All items sold out for this demo',
        },
      },
    ],
  },
];

async function main() {
  const project = await api('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'THE BEST DEMO',
      description: 'Agent-scaffolded demo with dummy JSON mocks',
      baseUrl: 'https://api.example.com',
    }),
  });

  const collection = await api('/collections', {
    method: 'POST',
    body: JSON.stringify({
      projectId: project.id,
      name: 'default',
      description: 'Active demo collection',
      mode: 'local',
      recordingStrategy: 'none',
      isActive: true,
    }),
  });

  const createdRules = [];

  for (const spec of rulesSpec) {
    const rule = await api('/rules', {
      method: 'POST',
      body: JSON.stringify({
        projectId: project.id,
        collectionId: collection.id,
        url: spec.url,
        requestMethod: spec.method,
        description: spec.description,
        isEnabled: true,
      }),
    });

    const responses = [];
    for (const r of spec.responses) {
      const resp = await api('/rule-responses', {
        method: 'POST',
        body: JSON.stringify({
          ruleId: rule.id,
          name: r.name,
          isActive: r.isActive,
          statusCode: r.statusCode,
          isError: r.isError ?? false,
          body: r.body,
        }),
      });
      responses.push(resp);
    }
    createdRules.push({ rule, responses });
  }

  const activeCollection = await api(`/collections/project/${project.id}/active`);

  const proxyChecks = [];
  for (const spec of rulesSpec) {
    const path = spec.url;
    const res = await fetch(`${PROXY}/${project.id}${path}`);
    const text = await res.text();
    proxyChecks.push({ path, status: res.status, body: text.slice(0, 120) });
  }

  console.log(
    JSON.stringify(
      {
        projectId: project.id,
        projectName: project.name,
        collectionId: collection.id,
        activeCollectionId: activeCollection.id,
        rules: createdRules.map(({ rule, responses }) => ({
          ruleId: rule.id,
          url: rule.url,
          method: rule.requestMethod,
          responses: responses.map((r) => ({
            id: r.id,
            name: r.name,
            isActive: r.isActive,
            statusCode: r.statusCode,
          })),
        })),
        proxyBase: `${PROXY}/${project.id}`,
        proxyChecks,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
