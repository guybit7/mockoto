import { randomUUID } from 'crypto';
import { db } from './index';
import { runMigrations } from './migrate';
import { projects, collections, rules } from './schema';

runMigrations();

const now = () => Math.floor(Date.now() / 1000);

// ─────────────────────────────────────────────
// IDs
// ─────────────────────────────────────────────
const pid1 = randomUUID();
const pid2 = randomUUID();
const pid3 = randomUUID();

const col1_1 = randomUUID(); // PaymentsAPI  → Checkout
const col1_2 = randomUUID(); // PaymentsAPI  → Subscriptions
const col2_1 = randomUUID(); // UserService  → Auth
const col2_2 = randomUUID(); // UserService  → Profile
const col3_1 = randomUUID(); // CatalogService → Products
const col3_2 = randomUUID(); // CatalogService → Categories

// ─────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────
const projectRows = [
  {
    id: pid1,
    name: 'Payments API',
    description: 'Mock for the internal payment gateway service',
    baseUrl: 'https://api.payments.internal',
    ownerName: 'fintech-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: pid2,
    name: 'User Service',
    description: 'Authentication and user-profile management',
    baseUrl: 'https://api.users.internal',
    ownerName: 'platform-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: pid3,
    name: 'Catalog Service',
    description: 'Product catalog and category browsing',
    baseUrl: 'https://api.catalog.internal',
    ownerName: 'commerce-team',
    createdAt: now(),
    updatedAt: now(),
  },
];

// ─────────────────────────────────────────────
// Collections
// ─────────────────────────────────────────────
const collectionRows = [
  {
    id: col1_1,
    projectId: pid1,
    name: 'Checkout',
    description: 'Checkout session endpoints',
    mode: 'local' as const,
    source: 'manual' as const,
    isActive: true,
    ownerName: 'fintech-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col1_2,
    projectId: pid1,
    name: 'Subscriptions',
    description: 'Subscription management (proxied to staging)',
    mode: 'proxy' as const,
    source: 'recording' as const,
    isActive: true,
    ownerName: 'fintech-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col2_1,
    projectId: pid2,
    name: 'Auth',
    description: 'Login, token refresh and logout flows',
    mode: 'local' as const,
    source: 'manual' as const,
    isActive: true,
    ownerName: 'platform-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col2_2,
    projectId: pid2,
    name: 'Profile',
    description: 'User profile read / update',
    mode: 'local' as const,
    source: 'manual' as const,
    isActive: true,
    ownerName: 'platform-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col3_1,
    projectId: pid3,
    name: 'Products',
    description: 'Product listing and detail',
    mode: 'local' as const,
    source: 'manual' as const,
    isActive: true,
    ownerName: 'commerce-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col3_2,
    projectId: pid3,
    name: 'Categories',
    description: 'Category tree',
    mode: 'local' as const,
    source: 'har' as const,
    isActive: false,
    ownerName: 'commerce-team',
    createdAt: now(),
    updatedAt: now(),
  },
];

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────
const ruleRows = [
  // ── Checkout ──────────────────────────────
  {
    id: randomUUID(),
    projectId: pid1,
    collectionId: col1_1,
    url: '/checkout/session',
    method: 'POST' as const,
    description: 'Create a new checkout session',
    requestBody: JSON.stringify({ items: [{ productId: 'abc', qty: 1 }], currency: 'USD' }),
    response: JSON.stringify({
      sessionId: 'sess_mock_001',
      status: 'pending',
      total: 4999,
      currency: 'USD',
      expiresAt: '2025-12-31T23:59:59Z',
    }),
    latency: 120,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid1,
    collectionId: col1_1,
    url: '/checkout/session/:id/status',
    method: 'GET' as const,
    description: 'Poll checkout session status',
    response: JSON.stringify({ sessionId: 'sess_mock_001', status: 'completed' }),
    latency: 60,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid1,
    collectionId: col1_1,
    url: '/checkout/session',
    method: 'POST' as const,
    description: 'Simulate payment declined (different card)',
    requestBody: JSON.stringify({ items: [{ productId: 'abc', qty: 1 }], currency: 'USD', cardToken: 'tok_declined' }),
    response: null,
    error: JSON.stringify({ code: 'PAYMENT_DECLINED', message: 'Insufficient funds' }),
    latency: 200,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Subscriptions ─────────────────────────
  {
    id: randomUUID(),
    projectId: pid1,
    collectionId: col1_2,
    url: '/subscriptions/:id',
    method: 'GET' as const,
    description: 'Get subscription by ID',
    response: JSON.stringify({
      id: 'sub_mock_001',
      plan: 'pro',
      status: 'active',
      renewsAt: '2025-08-01T00:00:00Z',
    }),
    latency: 80,
    passthrough: false,
    type: 'recorded' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid1,
    collectionId: col1_2,
    url: '/subscriptions/:id',
    method: 'DELETE' as const,
    description: 'Cancel subscription',
    response: JSON.stringify({ id: 'sub_mock_001', status: 'cancelled' }),
    latency: 150,
    passthrough: false,
    type: 'recorded' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Auth ──────────────────────────────────
  {
    id: randomUUID(),
    projectId: pid2,
    collectionId: col2_1,
    url: '/auth/login',
    method: 'POST' as const,
    description: 'Successful login',
    requestBody: JSON.stringify({ email: 'user@example.com', password: 'secret' }),
    response: JSON.stringify({
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock',
      refreshToken: 'refresh_mock_token',
      expiresIn: 3600,
    }),
    latency: 90,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid2,
    collectionId: col2_1,
    url: '/auth/login',
    method: 'POST' as const,
    description: 'Invalid credentials error',
    requestBody: JSON.stringify({ email: 'bad@example.com', password: 'wrong' }),
    response: null,
    error: JSON.stringify({ code: 401, message: 'Invalid email or password' }),
    latency: 50,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid2,
    collectionId: col2_1,
    url: '/auth/refresh',
    method: 'POST' as const,
    description: 'Refresh access token',
    requestBody: JSON.stringify({ refreshToken: 'refresh_mock_token' }),
    response: JSON.stringify({
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_mock',
      expiresIn: 3600,
    }),
    latency: 70,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid2,
    collectionId: col2_1,
    url: '/auth/logout',
    method: 'DELETE' as const,
    description: 'Logout / invalidate session',
    response: JSON.stringify({ success: true }),
    latency: 40,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Profile ───────────────────────────────
  {
    id: randomUUID(),
    projectId: pid2,
    collectionId: col2_2,
    url: '/users/:id',
    method: 'GET' as const,
    description: 'Get user profile',
    response: JSON.stringify({
      id: 'usr_mock_001',
      email: 'user@example.com',
      name: 'Alice Example',
      plan: 'pro',
      createdAt: '2024-01-15T10:00:00Z',
    }),
    latency: 60,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid2,
    collectionId: col2_2,
    url: '/users/:id',
    method: 'PUT' as const,
    description: 'Update user profile',
    requestBody: JSON.stringify({ name: 'Alice Updated' }),
    response: JSON.stringify({
      id: 'usr_mock_001',
      email: 'user@example.com',
      name: 'Alice Updated',
      plan: 'pro',
    }),
    latency: 100,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Products ──────────────────────────────
  {
    id: randomUUID(),
    projectId: pid3,
    collectionId: col3_1,
    url: '/products',
    method: 'GET' as const,
    description: 'List products (first page)',
    response: JSON.stringify({
      items: [
        { id: 'prod_001', name: 'Widget Pro', price: 2999, stock: 42 },
        { id: 'prod_002', name: 'Gadget Lite', price: 999, stock: 120 },
        { id: 'prod_003', name: 'Doohickey Max', price: 5499, stock: 7 },
      ],
      total: 3,
      page: 1,
    }),
    latency: 100,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid3,
    collectionId: col3_1,
    url: '/products/:id',
    method: 'GET' as const,
    description: 'Get single product',
    response: JSON.stringify({
      id: 'prod_001',
      name: 'Widget Pro',
      description: 'The best widget on the market.',
      price: 2999,
      currency: 'USD',
      stock: 42,
      categoryId: 'cat_01',
    }),
    latency: 55,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid3,
    collectionId: col3_1,
    url: '/products',
    method: 'POST' as const,
    description: 'Create product',
    requestBody: JSON.stringify({ name: 'New Widget', price: 1999, categoryId: 'cat_01' }),
    response: JSON.stringify({ id: 'prod_004', name: 'New Widget', price: 1999, stock: 0 }),
    latency: 130,
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Categories ────────────────────────────
  {
    id: randomUUID(),
    projectId: pid3,
    collectionId: col3_2,
    url: '/categories',
    method: 'GET' as const,
    description: 'List all categories',
    response: JSON.stringify({
      items: [
        { id: 'cat_01', name: 'Electronics', slug: 'electronics' },
        { id: 'cat_02', name: 'Home & Garden', slug: 'home-garden' },
        { id: 'cat_03', name: 'Sports', slug: 'sports' },
      ],
    }),
    latency: 40,
    passthrough: false,
    type: 'recorded' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    projectId: pid3,
    collectionId: col3_2,
    url: '/categories/:id',
    method: 'GET' as const,
    description: 'Get category by ID',
    response: JSON.stringify({ id: 'cat_01', name: 'Electronics', slug: 'electronics', productCount: 3 }),
    latency: 35,
    passthrough: false,
    type: 'recorded' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

// ─────────────────────────────────────────────
// Insert
// ─────────────────────────────────────────────
async function seed() {
  console.log('Seeding database...');

  // wipe existing data — cascade handles collections and rules
  await db.delete(projects);

  await db.insert(projects).values(projectRows);
  console.log(`  ✓ ${projectRows.length} projects`);

  await db.insert(collections).values(collectionRows);
  console.log(`  ✓ ${collectionRows.length} collections`);

  await db.insert(rules).values(ruleRows);
  console.log(`  ✓ ${ruleRows.length} rules`);

  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
