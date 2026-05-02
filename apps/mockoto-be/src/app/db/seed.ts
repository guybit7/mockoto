import { randomUUID } from 'crypto';
import { db } from './index';
import { runMigrations } from './migrate';
import { projects, collections, rules, ruleResponses } from './schema';
import { ruleLookupHash } from '../utils/rule-hash';

runMigrations();

const now = () => Math.floor(Date.now() / 1000);

// ─────────────────────────────────────────────
// Project IDs
// ─────────────────────────────────────────────
const pid1 = randomUUID(); // Payments API
const pid2 = randomUUID(); // User Service
const pid3 = randomUUID(); // Catalog Service

// ─────────────────────────────────────────────
// Collection IDs
// ─────────────────────────────────────────────
const col_checkout = randomUUID();
const col_subs = randomUUID();
const col_auth = randomUUID();
const col_profile = randomUUID();
const col_products = randomUUID();
const col_categories = randomUUID();

// ─────────────────────────────────────────────
// Rule IDs
// ─────────────────────────────────────────────
const r = {
  checkoutCreate: randomUUID(),
  checkoutStatus: randomUUID(),
  checkoutDeclined: randomUUID(),
  subGet: randomUUID(),
  subCancel: randomUUID(),
  loginOk: randomUUID(),
  loginFail: randomUUID(),
  tokenRefresh: randomUUID(),
  logout: randomUUID(),
  profileGet: randomUUID(),
  profileUpdate: randomUUID(),
  productsList: randomUUID(),
  productGet: randomUUID(),
  productCreate: randomUUID(),
  categoriesList: randomUUID(),
  categoryGet: randomUUID(),
};

// ─────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────
const projectRows = [
  {
    id: pid1,
    name: 'Payments API',
    description: 'Internal payment gateway service',
    baseUrl: 'https://api.payments.internal',
    ownerName: 'fintech-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: pid2,
    name: 'User Service',
    description: 'Authentication and user profiles',
    baseUrl: 'https://api.users.internal',
    ownerName: 'platform-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: pid3,
    name: 'Catalog Service',
    description: 'Product catalog and categories',
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
    id: col_checkout,
    projectId: pid1,
    name: 'Checkout',
    description: 'Checkout session endpoints',
    mode: 'local' as const,
    recordingStrategy: 'none' as const,
    source: 'manual' as const,
    isActive: true,
    ownerName: 'fintech-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col_subs,
    projectId: pid1,
    name: 'Subscriptions',
    description: 'Subscription management',
    mode: 'proxy' as const,
    recordingStrategy: 'all' as const,
    source: 'recording' as const,
    isActive: true,
    ownerName: 'fintech-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col_auth,
    projectId: pid2,
    name: 'Auth',
    description: 'Login, refresh and logout flows',
    mode: 'local' as const,
    recordingStrategy: 'none' as const,
    source: 'manual' as const,
    isActive: true,
    ownerName: 'platform-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col_profile,
    projectId: pid2,
    name: 'Profile',
    description: 'User profile read / update',
    mode: 'local' as const,
    recordingStrategy: 'none' as const,
    source: 'manual' as const,
    isActive: true,
    ownerName: 'platform-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col_products,
    projectId: pid3,
    name: 'Products',
    description: 'Product listing and detail',
    mode: 'local' as const,
    recordingStrategy: 'none' as const,
    source: 'manual' as const,
    isActive: true,
    ownerName: 'commerce-team',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: col_categories,
    projectId: pid3,
    name: 'Categories',
    description: 'Category tree',
    mode: 'local' as const,
    recordingStrategy: 'none' as const,
    source: 'har' as const,
    isActive: false,
    ownerName: 'commerce-team',
    createdAt: now(),
    updatedAt: now(),
  },
];

// ─────────────────────────────────────────────
// Request body fixtures
// ─────────────────────────────────────────────
const body = {
  checkoutOk: JSON.stringify({
    items: [{ productId: 'prod_001', qty: 2 }],
    currency: 'USD',
  }),
  checkoutDeclined: JSON.stringify({
    items: [{ productId: 'prod_001', qty: 2 }],
    currency: 'USD',
    cardToken: 'tok_declined',
  }),
  loginOk: JSON.stringify({
    email: 'alice@example.com',
    password: 'correct-horse',
  }),
  loginFail: JSON.stringify({
    email: 'eve@example.com',
    password: 'wrong-pass',
  }),
  tokenRefresh: JSON.stringify({ refreshToken: 'rt_mock_abc123' }),
  profileUpdate: JSON.stringify({
    name: 'Alice Updated',
    avatarUrl: 'https://cdn.example.com/alice2.png',
  }),
  productCreate: JSON.stringify({
    name: 'Turbo Widget',
    price: 3499,
    categoryId: 'cat_01',
    sku: 'TW-001',
  }),
};

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────
const ruleRows = [
  // ── Checkout ──────────────────────────────
  {
    id: r.checkoutCreate,
    projectId: pid1,
    collectionId: col_checkout,
    url: '/checkout/session',
    requestMethod: 'POST' as const,
    description: 'Create checkout session',
    requestBody: body.checkoutOk,
    lookupHash: ruleLookupHash('/checkout/session', 'POST', body.checkoutOk),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.checkoutStatus,
    projectId: pid1,
    collectionId: col_checkout,
    url: '/checkout/session/sess_001/status',
    requestMethod: 'GET' as const,
    description: 'Poll checkout session status',
    lookupHash: ruleLookupHash('/checkout/session/sess_001/status', 'GET'),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.checkoutDeclined,
    projectId: pid1,
    collectionId: col_checkout,
    url: '/checkout/session',
    requestMethod: 'POST' as const,
    description: 'Declined card scenario',
    requestBody: body.checkoutDeclined,
    lookupHash: ruleLookupHash(
      '/checkout/session',
      'POST',
      body.checkoutDeclined,
    ),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Subscriptions ─────────────────────────
  {
    id: r.subGet,
    projectId: pid1,
    collectionId: col_subs,
    url: '/subscriptions/sub_001',
    requestMethod: 'GET' as const,
    description: 'Get subscription by ID',
    lookupHash: ruleLookupHash('/subscriptions/sub_001', 'GET'),
    passthrough: false,
    type: 'recorded' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.subCancel,
    projectId: pid1,
    collectionId: col_subs,
    url: '/subscriptions/sub_001',
    requestMethod: 'DELETE' as const,
    description: 'Cancel subscription',
    lookupHash: ruleLookupHash('/subscriptions/sub_001', 'DELETE'),
    passthrough: false,
    type: 'recorded' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Auth ──────────────────────────────────
  {
    id: r.loginOk,
    projectId: pid2,
    collectionId: col_auth,
    url: '/auth/login',
    requestMethod: 'POST' as const,
    description: 'Successful login',
    requestBody: body.loginOk,
    lookupHash: ruleLookupHash('/auth/login', 'POST', body.loginOk),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.loginFail,
    projectId: pid2,
    collectionId: col_auth,
    url: '/auth/login',
    requestMethod: 'POST' as const,
    description: 'Bad credentials',
    requestBody: body.loginFail,
    lookupHash: ruleLookupHash('/auth/login', 'POST', body.loginFail),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.tokenRefresh,
    projectId: pid2,
    collectionId: col_auth,
    url: '/auth/refresh',
    requestMethod: 'POST' as const,
    description: 'Refresh access token',
    requestBody: body.tokenRefresh,
    lookupHash: ruleLookupHash('/auth/refresh', 'POST', body.tokenRefresh),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.logout,
    projectId: pid2,
    collectionId: col_auth,
    url: '/auth/logout',
    requestMethod: 'DELETE' as const,
    description: 'Logout / revoke session',
    lookupHash: ruleLookupHash('/auth/logout', 'DELETE'),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Profile ───────────────────────────────
  {
    id: r.profileGet,
    projectId: pid2,
    collectionId: col_profile,
    url: '/users/usr_001',
    requestMethod: 'GET' as const,
    description: 'Get user profile',
    lookupHash: ruleLookupHash('/users/usr_001', 'GET'),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.profileUpdate,
    projectId: pid2,
    collectionId: col_profile,
    url: '/users/usr_001',
    requestMethod: 'PUT' as const,
    description: 'Update user profile',
    requestBody: body.profileUpdate,
    lookupHash: ruleLookupHash('/users/usr_001', 'PUT', body.profileUpdate),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Products ──────────────────────────────
  {
    id: r.productsList,
    projectId: pid3,
    collectionId: col_products,
    url: '/products?page=1&limit=20',
    requestMethod: 'GET' as const,
    description: 'List products',
    lookupHash: ruleLookupHash('/products?page=1&limit=20', 'GET'),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.productGet,
    projectId: pid3,
    collectionId: col_products,
    url: '/products/prod_001',
    requestMethod: 'GET' as const,
    description: 'Get product',
    lookupHash: ruleLookupHash('/products/prod_001', 'GET'),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.productCreate,
    projectId: pid3,
    collectionId: col_products,
    url: '/products',
    requestMethod: 'POST' as const,
    description: 'Create product',
    requestBody: body.productCreate,
    lookupHash: ruleLookupHash('/products', 'POST', body.productCreate),
    passthrough: false,
    type: 'manual' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },

  // ── Categories ────────────────────────────
  {
    id: r.categoriesList,
    projectId: pid3,
    collectionId: col_categories,
    url: '/categories?include=subcategories',
    requestMethod: 'GET' as const,
    description: 'List all categories',
    lookupHash: ruleLookupHash('/categories?include=subcategories', 'GET'),
    passthrough: false,
    type: 'recorded' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: r.categoryGet,
    projectId: pid3,
    collectionId: col_categories,
    url: '/categories/cat_01',
    requestMethod: 'GET' as const,
    description: 'Get category by ID',
    lookupHash: ruleLookupHash('/categories/cat_01', 'GET'),
    passthrough: false,
    type: 'recorded' as const,
    isEnabled: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

// ─────────────────────────────────────────────
// Rule Responses
// Each rule has 2–3 responses so users / agents can switch scenarios.
// Only one response per rule has isActive: true.
// ─────────────────────────────────────────────
const ruleResponseRows = [
  // ── POST /checkout/session (ok body) ───────
  {
    id: randomUUID(),
    ruleId: r.checkoutCreate,
    name: 'Session Created',
    isActive: true,
    statusCode: 201,
    isError: false,
    latency: 120,
    body: JSON.stringify({
      sessionId: 'sess_001',
      status: 'pending',
      total: 5998,
      currency: 'USD',
      expiresAt: '2025-12-31T23:59:59Z',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.checkoutCreate,
    name: 'Service Unavailable',
    isActive: false,
    statusCode: 503,
    isError: true,
    latency: 50,
    body: JSON.stringify({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Payment processor is temporarily down, please retry.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.checkoutCreate,
    name: 'Cart Empty',
    isActive: false,
    statusCode: 422,
    isError: true,
    latency: 30,
    body: JSON.stringify({ code: 'CART_EMPTY', message: 'No items in cart.' }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── GET /checkout/session/:id/status ──────
  {
    id: randomUUID(),
    ruleId: r.checkoutStatus,
    name: 'Completed',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 60,
    body: JSON.stringify({
      sessionId: 'sess_001',
      status: 'completed',
      paidAt: '2025-05-01T10:00:00Z',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.checkoutStatus,
    name: 'Pending',
    isActive: false,
    statusCode: 200,
    isError: false,
    latency: 40,
    body: JSON.stringify({ sessionId: 'sess_001', status: 'pending' }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.checkoutStatus,
    name: 'Session Expired',
    isActive: false,
    statusCode: 410,
    isError: true,
    latency: 25,
    body: JSON.stringify({
      code: 'SESSION_EXPIRED',
      message: 'Checkout session has expired.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── POST /checkout/session (declined body) ─
  {
    id: randomUUID(),
    ruleId: r.checkoutDeclined,
    name: 'Insufficient Funds',
    isActive: true,
    statusCode: 402,
    isError: true,
    latency: 200,
    body: JSON.stringify({
      code: 'PAYMENT_DECLINED',
      reason: 'insufficient_funds',
      message: 'Your card has insufficient funds.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.checkoutDeclined,
    name: 'Card Stolen',
    isActive: false,
    statusCode: 402,
    isError: true,
    latency: 200,
    body: JSON.stringify({
      code: 'PAYMENT_DECLINED',
      reason: 'card_reported_stolen',
      message: 'This card has been reported stolen.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── GET /subscriptions/:id ─────────────────
  {
    id: randomUUID(),
    ruleId: r.subGet,
    name: 'Active — Pro',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 80,
    body: JSON.stringify({
      id: 'sub_001',
      plan: 'pro',
      status: 'active',
      renewsAt: '2025-08-01T00:00:00Z',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.subGet,
    name: 'Cancelled',
    isActive: false,
    statusCode: 200,
    isError: false,
    latency: 70,
    body: JSON.stringify({
      id: 'sub_001',
      plan: 'pro',
      status: 'cancelled',
      cancelledAt: '2025-04-15T09:00:00Z',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.subGet,
    name: 'Not Found',
    isActive: false,
    statusCode: 404,
    isError: true,
    latency: 30,
    body: JSON.stringify({
      code: 'NOT_FOUND',
      message: 'Subscription not found.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── DELETE /subscriptions/:id ──────────────
  {
    id: randomUUID(),
    ruleId: r.subCancel,
    name: 'Cancelled Successfully',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 150,
    body: JSON.stringify({
      id: 'sub_001',
      status: 'cancelled',
      cancelledAt: '2025-05-01T12:00:00Z',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.subCancel,
    name: 'Already Cancelled',
    isActive: false,
    statusCode: 409,
    isError: true,
    latency: 40,
    body: JSON.stringify({
      code: 'ALREADY_CANCELLED',
      message: 'Subscription is already cancelled.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── POST /auth/login (ok) ──────────────────
  {
    id: randomUUID(),
    ruleId: r.loginOk,
    name: 'Login Success',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 90,
    body: JSON.stringify({
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.alice.mock',
      refreshToken: 'rt_mock_abc123',
      expiresIn: 3600,
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.loginOk,
    name: 'MFA Required',
    isActive: false,
    statusCode: 202,
    isError: false,
    latency: 80,
    body: JSON.stringify({
      mfaRequired: true,
      mfaChannel: 'totp',
      sessionToken: 'mfa_sess_xyz',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── POST /auth/login (fail) ────────────────
  {
    id: randomUUID(),
    ruleId: r.loginFail,
    name: 'Invalid Credentials',
    isActive: true,
    statusCode: 401,
    isError: true,
    latency: 50,
    body: JSON.stringify({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.loginFail,
    name: 'Account Locked',
    isActive: false,
    statusCode: 423,
    isError: true,
    latency: 40,
    body: JSON.stringify({
      code: 'ACCOUNT_LOCKED',
      message: 'Too many failed attempts. Account locked for 15 minutes.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── POST /auth/refresh ─────────────────────
  {
    id: randomUUID(),
    ruleId: r.tokenRefresh,
    name: 'Token Refreshed',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 70,
    body: JSON.stringify({
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.alice.new',
      expiresIn: 3600,
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.tokenRefresh,
    name: 'Token Expired',
    isActive: false,
    statusCode: 401,
    isError: true,
    latency: 30,
    body: JSON.stringify({
      code: 'REFRESH_TOKEN_EXPIRED',
      message: 'Refresh token has expired. Please log in again.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── DELETE /auth/logout ────────────────────
  {
    id: randomUUID(),
    ruleId: r.logout,
    name: 'Logged Out',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 40,
    body: JSON.stringify({ success: true }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.logout,
    name: 'Session Already Ended',
    isActive: false,
    statusCode: 200,
    isError: false,
    latency: 20,
    body: JSON.stringify({
      success: true,
      note: 'Session was already expired.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── GET /users/:id ─────────────────────────
  {
    id: randomUUID(),
    ruleId: r.profileGet,
    name: 'Full Profile',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 60,
    body: JSON.stringify({
      id: 'usr_001',
      email: 'alice@example.com',
      name: 'Alice Example',
      plan: 'pro',
      avatarUrl: 'https://cdn.example.com/alice.png',
      createdAt: '2024-01-15T10:00:00Z',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.profileGet,
    name: 'Not Found',
    isActive: false,
    statusCode: 404,
    isError: true,
    latency: 25,
    body: JSON.stringify({ code: 'NOT_FOUND', message: 'User not found.' }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── PUT /users/:id ─────────────────────────
  {
    id: randomUUID(),
    ruleId: r.profileUpdate,
    name: 'Updated Successfully',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 100,
    body: JSON.stringify({
      id: 'usr_001',
      email: 'alice@example.com',
      name: 'Alice Updated',
      plan: 'pro',
      avatarUrl: 'https://cdn.example.com/alice2.png',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.profileUpdate,
    name: 'Validation Error',
    isActive: false,
    statusCode: 422,
    isError: true,
    latency: 30,
    body: JSON.stringify({
      code: 'VALIDATION_ERROR',
      fields: { name: 'Name must be at least 2 characters.' },
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── GET /products ──────────────────────────
  {
    id: randomUUID(),
    ruleId: r.productsList,
    name: 'First Page',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 100,
    body: JSON.stringify({
      items: [
        { id: 'prod_001', name: 'Widget Pro', price: 2999, stock: 42 },
        { id: 'prod_002', name: 'Gadget Lite', price: 999, stock: 120 },
        { id: 'prod_003', name: 'Doohickey Max', price: 5499, stock: 7 },
      ],
      total: 3,
      page: 1,
      pageSize: 20,
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.productsList,
    name: 'Empty Catalog',
    isActive: false,
    statusCode: 200,
    isError: false,
    latency: 50,
    body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── GET /products/:id ──────────────────────
  {
    id: randomUUID(),
    ruleId: r.productGet,
    name: 'Widget Pro',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 55,
    body: JSON.stringify({
      id: 'prod_001',
      name: 'Widget Pro',
      description: 'The best widget on the market.',
      price: 2999,
      currency: 'USD',
      stock: 42,
      categoryId: 'cat_01',
      sku: 'WP-001',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.productGet,
    name: 'Out of Stock',
    isActive: false,
    statusCode: 200,
    isError: false,
    latency: 40,
    body: JSON.stringify({
      id: 'prod_001',
      name: 'Widget Pro',
      price: 2999,
      currency: 'USD',
      stock: 0,
      stockStatus: 'out_of_stock',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.productGet,
    name: 'Not Found',
    isActive: false,
    statusCode: 404,
    isError: true,
    latency: 20,
    body: JSON.stringify({ code: 'NOT_FOUND', message: 'Product not found.' }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── POST /products ─────────────────────────
  {
    id: randomUUID(),
    ruleId: r.productCreate,
    name: 'Created',
    isActive: true,
    statusCode: 201,
    isError: false,
    latency: 130,
    body: JSON.stringify({
      id: 'prod_004',
      name: 'Turbo Widget',
      price: 3499,
      stock: 0,
      sku: 'TW-001',
      categoryId: 'cat_01',
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.productCreate,
    name: 'Duplicate SKU',
    isActive: false,
    statusCode: 409,
    isError: true,
    latency: 40,
    body: JSON.stringify({
      code: 'DUPLICATE_SKU',
      message: 'A product with SKU "TW-001" already exists.',
    }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── GET /categories ────────────────────────
  {
    id: randomUUID(),
    ruleId: r.categoriesList,
    name: 'All Categories',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 40,
    body: JSON.stringify({
      items: [
        {
          id: 'cat_01',
          name: 'Electronics',
          slug: 'electronics',
          productCount: 42,
        },
        {
          id: 'cat_02',
          name: 'Home & Garden',
          slug: 'home-garden',
          productCount: 18,
        },
        { id: 'cat_03', name: 'Sports', slug: 'sports', productCount: 31 },
      ],
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.categoriesList,
    name: 'Empty',
    isActive: false,
    statusCode: 200,
    isError: false,
    latency: 20,
    body: JSON.stringify({ items: [] }),
    createdAt: now(),
    updatedAt: now(),
  },

  // ── GET /categories/:id ────────────────────
  {
    id: randomUUID(),
    ruleId: r.categoryGet,
    name: 'Electronics',
    isActive: true,
    statusCode: 200,
    isError: false,
    latency: 35,
    body: JSON.stringify({
      id: 'cat_01',
      name: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets, components and devices.',
      productCount: 42,
    }),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: randomUUID(),
    ruleId: r.categoryGet,
    name: 'Not Found',
    isActive: false,
    statusCode: 404,
    isError: true,
    latency: 15,
    body: JSON.stringify({ code: 'NOT_FOUND', message: 'Category not found.' }),
    createdAt: now(),
    updatedAt: now(),
  },
];

// ─────────────────────────────────────────────
// Insert
// ─────────────────────────────────────────────
async function seed() {
  console.log('Seeding database...');

  await db.delete(projects); // cascade handles everything below

  await db.insert(projects).values(projectRows);
  console.log(`  ✓ ${projectRows.length} projects`);

  await db.insert(collections).values(collectionRows);
  console.log(`  ✓ ${collectionRows.length} collections`);

  await db.insert(rules).values(ruleRows);
  console.log(`  ✓ ${ruleRows.length} rules`);

  await db.insert(ruleResponses).values(ruleResponseRows);
  console.log(`  ✓ ${ruleResponseRows.length} rule responses`);

  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
