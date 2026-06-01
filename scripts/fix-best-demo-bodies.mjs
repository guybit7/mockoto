/**
 * Fix rule-response bodies for project "THE BEST DEMO" (JSON objects, not strings).
 * Discovers response IDs at runtime. Run: node scripts/fix-best-demo-bodies.mjs
 */
const API = 'http://localhost:3000/api';
const PROJECT_NAME = 'THE BEST DEMO';

const bodiesByRule = {
  '/health': {
    Healthy: { status: 'ok', service: 'THE BEST DEMO', uptime: '99.9%' },
    Degraded: { status: 'degraded', message: 'Dependency timeout' },
  },
  '/users': {
    'Users found': {
      users: [
        { id: 1, name: 'Alice Demo', email: 'alice@demo.local' },
        { id: 2, name: 'Bob Demo', email: 'bob@demo.local' },
      ],
      total: 2,
    },
    'Empty list': { users: [], total: 0 },
  },
  '/products': {
    Catalog: {
      products: [
        { id: 'sku-101', title: 'Demo Widget', price: 9.99, inStock: true },
        { id: 'sku-202', title: 'Premium Gadget', price: 49.5, inStock: false },
      ],
    },
    'Sold out': { products: [], message: 'All items sold out for this demo' },
  },
};

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const projects = await api('/projects');
  const project = projects.find((p) => p.name === PROJECT_NAME);
  if (!project) {
    console.error(`Project "${PROJECT_NAME}" not found. Run: node scripts/scaffold-best-demo.mjs`);
    process.exit(1);
  }

  const collection = await api(`/collections/project/${project.id}/active`);
  const rules = await api(`/rules/collection/${collection.id}`);
  let fixed = 0;

  for (const rule of rules) {
    const map = bodiesByRule[rule.url];
    if (!map) continue;
    const responses = await api(`/rule-responses/rule/${rule.id}`);
    for (const resp of responses) {
      const body = map[resp.name];
      if (!body) continue;
      const updated = await api(`/rule-responses/${resp.id}`, {
        method: 'PUT',
        body: JSON.stringify({ body }),
      });
      if (typeof updated.body !== 'object' || updated.body === null) {
        throw new Error(`Response ${resp.id} still not an object after fix`);
      }
      fixed++;
      console.log(`✔ ${rule.url} → ${resp.name}`);
    }
  }

  console.log(`Fixed ${fixed} responses for project ${project.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
