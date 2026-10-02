import { randomUUID } from 'crypto';
import { db } from './index';
import { runMigrations } from './migrate';
import { projects, collections, rules, ruleResponses } from './schema';
import { ruleLookupHash } from '../utils/rule-hash';

runMigrations();

const ts = () => Math.floor(Date.now() / 1000);

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const j = (v: unknown) => JSON.stringify(v);
const ok = (data: unknown) => j(data);
const err = (code: string, msg: string, extra?: object) =>
  j({ code, message: msg, ...extra });
const list = (items: unknown[], total?: number) =>
  j({ items, total: total ?? items.length, page: 1, pageSize: 20 });

// ─── Types ────────────────────────────────────────────────────────────────────

type M = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

interface RespDef {
  name: string;
  statusCode: number;
  isActive?: boolean;
  isError?: boolean;
  latency?: number;
  headers?: Record<string, string>;
  body: string;
}

interface RuleDef {
  url: string;
  method: M;
  description?: string;
  isFavorite?: boolean;
  isEnabled?: boolean;
  passthrough?: boolean;
  requestBody?: string;
  responses: RespDef[];
}

interface ColDef {
  name: string;
  description?: string;
  isActive?: boolean;
  isFavorite?: boolean;
  rules: RuleDef[];
}

interface ProjDef {
  name: string;
  description?: string;
  baseUrl: string;
  ownerName: string;
  isFavorite?: boolean;
  collections: ColDef[];
}

// ─── Project definitions ──────────────────────────────────────────────────────

const DEFS: ProjDef[] = [

  // ── 1. Payments API ──────────────────────────────────────────────────────
  {
    name: 'Payments API',
    description: 'Internal payment gateway and billing service',
    baseUrl: 'https://api.payments.internal',
    ownerName: 'fintech-team',
    isFavorite: true,
    collections: [
      {
        name: 'Checkout',
        description: 'Checkout session lifecycle',
        isActive: true,
        isFavorite: true,
        rules: [
          {
            url: '/checkout/sessions', method: 'POST', description: 'Create checkout session', isFavorite: true,
            requestBody: j({ items: [{ productId: 'prod_001', qty: 2 }], currency: 'USD' }),
            responses: [
              { name: 'Session Created', statusCode: 201, isActive: true, latency: 120, body: ok({ sessionId: 'sess_001', status: 'pending', total: 5998, currency: 'USD', expiresAt: '2025-12-31T23:59:59Z' }) },
              { name: 'Cart Empty', statusCode: 422, isError: true, latency: 30, body: err('CART_EMPTY', 'No items in cart.') },
              { name: 'Service Unavailable', statusCode: 503, isError: true, latency: 50, body: err('SERVICE_UNAVAILABLE', 'Payment processor is temporarily down.') },
            ],
          },
          {
            url: '/checkout/sessions/:id', method: 'GET', description: 'Get session details',
            responses: [
              { name: 'Pending', statusCode: 200, isActive: true, latency: 45, body: ok({ sessionId: 'sess_001', status: 'pending', total: 5998 }) },
              { name: 'Completed', statusCode: 200, latency: 40, body: ok({ sessionId: 'sess_001', status: 'completed', paidAt: '2025-05-01T10:00:00Z' }) },
              { name: 'Expired', statusCode: 410, isError: true, latency: 25, body: err('SESSION_EXPIRED', 'Checkout session has expired.') },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Session not found.') },
            ],
          },
          {
            url: '/checkout/sessions/:id/confirm', method: 'POST', description: 'Confirm payment',
            responses: [
              { name: 'Confirmed', statusCode: 200, isActive: true, latency: 300, body: ok({ sessionId: 'sess_001', status: 'completed', paidAt: '2025-05-01T10:00:00Z' }) },
              { name: 'Insufficient Funds', statusCode: 402, isError: true, latency: 200, body: err('PAYMENT_DECLINED', 'Insufficient funds.', { reason: 'insufficient_funds' }) },
              { name: 'Card Stolen', statusCode: 402, isError: true, latency: 200, body: err('PAYMENT_DECLINED', 'Card reported stolen.', { reason: 'card_stolen' }) },
            ],
          },
          {
            url: '/checkout/sessions/:id', method: 'DELETE', description: 'Cancel session',
            responses: [
              { name: 'Cancelled', statusCode: 200, isActive: true, latency: 80, body: ok({ sessionId: 'sess_001', status: 'cancelled' }) },
              { name: 'Already Completed', statusCode: 409, isError: true, latency: 30, body: err('ALREADY_COMPLETED', 'Cannot cancel a completed session.') },
            ],
          },
          {
            url: '/checkout/sessions', method: 'GET', description: 'List recent sessions',
            responses: [
              { name: 'Recent Sessions', statusCode: 200, isActive: true, latency: 90, body: list([{ sessionId: 'sess_001', status: 'completed' }, { sessionId: 'sess_002', status: 'pending' }]) },
              { name: 'Empty', statusCode: 200, latency: 40, body: list([]) },
            ],
          },
          {
            // Non-JSON responses: the body is stored raw and served with its content type.
            url: '/checkout/health', method: 'GET', description: 'Health check (plain text, XML, HTML)',
            responses: [
              { name: 'OK (text)', statusCode: 200, isActive: true, latency: 10, headers: { 'content-type': 'text/plain' }, body: 'OK' },
              { name: 'Status (XML)', statusCode: 200, latency: 15, headers: { 'content-type': 'application/xml' }, body: '<?xml version="1.0"?>\n<health>\n  <status>ok</status>\n  <version>1.4.2</version>\n</health>' },
              { name: 'Maintenance (HTML)', statusCode: 503, isError: true, latency: 20, headers: { 'content-type': 'text/html' }, body: '<!doctype html>\n<html>\n  <body>\n    <h1>Down for maintenance</h1>\n  </body>\n</html>' },
            ],
          },
        ],
      },
      {
        name: 'Subscriptions',
        description: 'Recurring billing and plan management',
        isActive: false,
        isFavorite: true,
        rules: [
          {
            url: '/subscriptions', method: 'GET', description: 'List subscriptions', isFavorite: true,
            responses: [
              { name: 'Active Subs', statusCode: 200, isActive: true, latency: 80, body: list([{ id: 'sub_001', plan: 'pro', status: 'active' }, { id: 'sub_002', plan: 'starter', status: 'trialing' }]) },
              { name: 'Empty', statusCode: 200, latency: 30, body: list([]) },
            ],
          },
          {
            url: '/subscriptions/:id', method: 'GET', description: 'Get subscription by ID',
            responses: [
              { name: 'Active — Pro', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'sub_001', plan: 'pro', status: 'active', renewsAt: '2025-08-01T00:00:00Z', seats: 5 }) },
              { name: 'Active — Enterprise', statusCode: 200, latency: 75, body: ok({ id: 'sub_001', plan: 'enterprise', status: 'active', seats: 100, billingCycle: 'annual' }) },
              { name: 'Trialing', statusCode: 200, latency: 65, body: ok({ id: 'sub_001', plan: 'pro', status: 'trialing', trialEndsAt: '2025-06-15T00:00:00Z' }) },
              { name: 'Cancelled', statusCode: 200, latency: 70, body: ok({ id: 'sub_001', plan: 'pro', status: 'cancelled', cancelledAt: '2025-04-15T09:00:00Z' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 25, body: err('NOT_FOUND', 'Subscription not found.') },
              { name: 'Forbidden', statusCode: 403, isError: true, latency: 20, body: err('FORBIDDEN', 'Access denied.') },
            ],
          },
          {
            url: '/subscriptions', method: 'POST', description: 'Create subscription',
            requestBody: j({ planId: 'plan_pro', paymentMethodId: 'pm_001', seats: 5 }),
            responses: [
              { name: 'Created', statusCode: 201, isActive: true, latency: 200, body: ok({ id: 'sub_003', plan: 'pro', status: 'active', createdAt: '2025-05-01T00:00:00Z' }) },
              { name: 'Invalid Plan', statusCode: 422, isError: true, latency: 40, body: err('INVALID_PLAN', 'Plan not found.') },
              { name: 'Payment Failed', statusCode: 402, isError: true, latency: 150, body: err('PAYMENT_FAILED', 'Failed to charge payment method.') },
            ],
          },
          {
            url: '/subscriptions/:id', method: 'DELETE', description: 'Cancel subscription',
            responses: [
              { name: 'Cancelled', statusCode: 200, isActive: true, latency: 150, body: ok({ id: 'sub_001', status: 'cancelled', cancelledAt: '2025-05-01T12:00:00Z', refundAmount: 0 }) },
              { name: 'With Refund', statusCode: 200, latency: 180, body: ok({ id: 'sub_001', status: 'cancelled', refundAmount: 2999, refundCurrency: 'USD' }) },
              { name: 'Already Cancelled', statusCode: 409, isError: true, latency: 40, body: err('ALREADY_CANCELLED', 'Subscription is already cancelled.') },
              { name: 'Active Contract', statusCode: 422, isError: true, latency: 60, body: err('ACTIVE_CONTRACT', 'Cannot cancel annual subscription mid-term.') },
            ],
          },
          {
            url: '/subscriptions/:id/upgrade', method: 'POST', description: 'Upgrade plan',
            requestBody: j({ planId: 'plan_enterprise' }),
            responses: [
              { name: 'Upgraded', statusCode: 200, isActive: true, latency: 200, body: ok({ id: 'sub_001', plan: 'enterprise', status: 'active', upgradedAt: '2025-05-01T00:00:00Z' }) },
              { name: 'Already On Plan', statusCode: 409, isError: true, latency: 30, body: err('ALREADY_ON_PLAN', 'Already subscribed to this plan.') },
            ],
          },
          {
            url: '/subscriptions/:id/pause', method: 'POST', description: 'Pause subscription',
            responses: [
              { name: 'Paused', statusCode: 200, isActive: true, latency: 100, body: ok({ id: 'sub_001', status: 'paused', pausedAt: '2025-05-10T08:00:00Z', resumesAt: '2025-07-01T00:00:00Z' }) },
              { name: 'Cannot Pause', statusCode: 422, isError: true, latency: 30, body: err('CANNOT_PAUSE', 'Starter plan cannot be paused.') },
            ],
          },
          {
            url: '/subscriptions/plans', method: 'GET', description: 'List available plans',
            responses: [
              { name: 'All Plans', statusCode: 200, isActive: true, latency: 50, body: list([{ id: 'plan_starter', name: 'Starter', price: 999 }, { id: 'plan_pro', name: 'Pro', price: 2999 }, { id: 'plan_enterprise', name: 'Enterprise', price: 9999 }]) },
            ],
          },
        ],
      },
      {
        name: 'Invoices',
        description: 'Invoice generation and retrieval',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/invoices', method: 'GET', description: 'List invoices',
            responses: [
              { name: 'Recent Invoices', statusCode: 200, isActive: true, latency: 100, body: list([{ id: 'inv_001', amount: 2999, status: 'paid', date: '2025-04-01' }, { id: 'inv_002', amount: 2999, status: 'open', date: '2025-05-01' }]) },
              { name: 'Empty', statusCode: 200, latency: 40, body: list([]) },
            ],
          },
          {
            url: '/invoices/:id', method: 'GET', description: 'Get invoice by ID',
            responses: [
              { name: 'Paid Invoice', statusCode: 200, isActive: true, latency: 60, body: ok({ id: 'inv_001', amount: 2999, status: 'paid', paidAt: '2025-04-02T10:00:00Z', lineItems: [{ description: 'Pro Plan', amount: 2999 }] }) },
              { name: 'Open Invoice', statusCode: 200, latency: 55, body: ok({ id: 'inv_002', amount: 2999, status: 'open', dueDate: '2025-05-15' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Invoice not found.') },
            ],
          },
          {
            url: '/invoices/:id/pay', method: 'POST', description: 'Pay invoice manually',
            responses: [
              { name: 'Paid', statusCode: 200, isActive: true, latency: 400, body: ok({ id: 'inv_002', status: 'paid', paidAt: '2025-05-01T12:00:00Z' }) },
              { name: 'Already Paid', statusCode: 409, isError: true, latency: 30, body: err('ALREADY_PAID', 'Invoice has already been paid.') },
              { name: 'Payment Failed', statusCode: 402, isError: true, latency: 200, body: err('PAYMENT_FAILED', 'Failed to charge default payment method.') },
            ],
          },
          {
            url: '/invoices/:id/void', method: 'POST', description: 'Void an invoice',
            responses: [
              { name: 'Voided', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'inv_002', status: 'void', voidedAt: '2025-05-01T12:00:00Z' }) },
              { name: 'Cannot Void Paid', statusCode: 422, isError: true, latency: 30, body: err('CANNOT_VOID', 'Cannot void a paid invoice.') },
            ],
          },
          {
            url: '/invoices/:id/pdf', method: 'GET', description: 'Download invoice PDF',
            responses: [
              { name: 'PDF URL', statusCode: 200, isActive: true, latency: 200, body: ok({ url: 'https://cdn.payments.internal/invoices/inv_001.pdf', expiresAt: '2025-05-01T13:00:00Z' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Invoice not found.') },
            ],
          },
        ],
      },
      {
        name: 'Payment Methods',
        description: 'Stored cards and bank accounts',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/payment-methods', method: 'GET', description: 'List payment methods',
            responses: [
              { name: 'Cards on File', statusCode: 200, isActive: true, latency: 60, body: list([{ id: 'pm_001', type: 'card', last4: '4242', brand: 'visa', isDefault: true }, { id: 'pm_002', type: 'card', last4: '0002', brand: 'mastercard', isDefault: false }]) },
              { name: 'Empty', statusCode: 200, latency: 30, body: list([]) },
            ],
          },
          {
            url: '/payment-methods', method: 'POST', description: 'Add payment method',
            requestBody: j({ token: 'tok_visa' }),
            responses: [
              { name: 'Added', statusCode: 201, isActive: true, latency: 300, body: ok({ id: 'pm_003', type: 'card', last4: '1234', brand: 'visa', isDefault: false }) },
              { name: 'Invalid Token', statusCode: 422, isError: true, latency: 100, body: err('INVALID_TOKEN', 'Payment token is invalid or expired.') },
            ],
          },
          {
            url: '/payment-methods/:id', method: 'DELETE', description: 'Remove payment method',
            responses: [
              { name: 'Removed', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'pm_002', deleted: true }) },
              { name: 'Cannot Remove Default', statusCode: 422, isError: true, latency: 30, body: err('CANNOT_REMOVE_DEFAULT', 'Set another default before removing this one.') },
            ],
          },
          {
            url: '/payment-methods/:id/default', method: 'POST', description: 'Set as default',
            responses: [
              { name: 'Updated', statusCode: 200, isActive: true, latency: 60, body: ok({ id: 'pm_002', isDefault: true }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Payment method not found.') },
            ],
          },
        ],
      },
      {
        name: 'Refunds',
        description: 'Refund issuance and status',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/refunds', method: 'POST', description: 'Issue a refund',
            requestBody: j({ chargeId: 'ch_001', amount: 2999, reason: 'requested_by_customer' }),
            responses: [
              { name: 'Refund Issued', statusCode: 201, isActive: true, latency: 500, body: ok({ id: 'ref_001', amount: 2999, status: 'pending', estimatedArrival: '2025-05-08T00:00:00Z' }) },
              { name: 'Already Refunded', statusCode: 409, isError: true, latency: 40, body: err('ALREADY_REFUNDED', 'This charge has already been fully refunded.') },
              { name: 'Amount Exceeds Charge', statusCode: 422, isError: true, latency: 30, body: err('AMOUNT_EXCEEDS_CHARGE', 'Refund amount exceeds original charge.') },
            ],
          },
          {
            url: '/refunds/:id', method: 'GET', description: 'Get refund status',
            responses: [
              { name: 'Pending', statusCode: 200, isActive: true, latency: 50, body: ok({ id: 'ref_001', status: 'pending', amount: 2999 }) },
              { name: 'Succeeded', statusCode: 200, latency: 45, body: ok({ id: 'ref_001', status: 'succeeded', arrivedAt: '2025-05-06T00:00:00Z' }) },
              { name: 'Failed', statusCode: 200, latency: 40, body: ok({ id: 'ref_001', status: 'failed', failureReason: 'Bank account closed' }) },
            ],
          },
          {
            url: '/refunds', method: 'GET', description: 'List refunds',
            responses: [
              { name: 'Recent Refunds', statusCode: 200, isActive: true, latency: 80, body: list([{ id: 'ref_001', amount: 2999, status: 'succeeded' }, { id: 'ref_002', amount: 999, status: 'pending' }]) },
            ],
          },
        ],
      },
    ],
  },

  // ── 2. Commerce Platform ──────────────────────────────────────────────────
  {
    name: 'Commerce Platform',
    description: 'Product catalog, inventory and pricing engine',
    baseUrl: 'https://api.commerce.internal',
    ownerName: 'commerce-team',
    isFavorite: true,
    collections: [
      {
        name: 'Products',
        description: 'Product catalog CRUD',
        isActive: true,
        isFavorite: true,
        rules: [
          {
            url: '/products', method: 'GET', description: 'List products', isFavorite: true,
            responses: [
              { name: 'First Page', statusCode: 200, isActive: true, latency: 100, body: list([{ id: 'prod_001', name: 'Widget Pro', price: 2999, stock: 42 }, { id: 'prod_002', name: 'Gadget Lite', price: 999, stock: 120 }, { id: 'prod_003', name: 'Doohickey Max', price: 5499, stock: 7 }], 150) },
              { name: 'Empty Catalog', statusCode: 200, latency: 50, body: list([]) },
              { name: 'Server Error', statusCode: 500, isError: true, latency: 200, body: err('INTERNAL_ERROR', 'Catalog service error.') },
            ],
          },
          {
            url: '/products/:id', method: 'GET', description: 'Get product detail',
            responses: [
              { name: 'Widget Pro', statusCode: 200, isActive: true, latency: 55, body: ok({ id: 'prod_001', name: 'Widget Pro', price: 2999, currency: 'USD', stock: 42, sku: 'WP-001', categoryId: 'cat_01' }) },
              { name: 'Out of Stock', statusCode: 200, latency: 40, body: ok({ id: 'prod_001', name: 'Widget Pro', price: 2999, stock: 0, stockStatus: 'out_of_stock' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Product not found.') },
            ],
          },
          {
            url: '/products', method: 'POST', description: 'Create product',
            requestBody: j({ name: 'Turbo Widget', price: 3499, categoryId: 'cat_01', sku: 'TW-001' }),
            responses: [
              { name: 'Created', statusCode: 201, isActive: true, latency: 130, body: ok({ id: 'prod_004', name: 'Turbo Widget', price: 3499, stock: 0, sku: 'TW-001' }) },
              { name: 'Duplicate SKU', statusCode: 409, isError: true, latency: 40, body: err('DUPLICATE_SKU', 'A product with this SKU already exists.') },
              { name: 'Validation Error', statusCode: 422, isError: true, latency: 30, body: err('VALIDATION_ERROR', 'Price must be positive.') },
            ],
          },
          {
            url: '/products/:id', method: 'PUT', description: 'Update product',
            requestBody: j({ name: 'Widget Pro V2', price: 3299 }),
            responses: [
              { name: 'Updated', statusCode: 200, isActive: true, latency: 100, body: ok({ id: 'prod_001', name: 'Widget Pro V2', price: 3299 }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Product not found.') },
            ],
          },
          {
            url: '/products/:id', method: 'DELETE', description: 'Archive product',
            responses: [
              { name: 'Archived', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'prod_001', archived: true, archivedAt: '2025-05-01T00:00:00Z' }) },
              { name: 'Has Active Orders', statusCode: 422, isError: true, latency: 30, body: err('HAS_ACTIVE_ORDERS', 'Cannot archive a product with active orders.') },
            ],
          },
          {
            url: '/products/:id/images', method: 'POST', description: 'Add product image',
            responses: [
              { name: 'Image Added', statusCode: 201, isActive: true, latency: 600, body: ok({ id: 'img_001', url: 'https://cdn.commerce.internal/products/prod_001/img_001.jpg', position: 1 }) },
              { name: 'Too Many Images', statusCode: 422, isError: true, latency: 30, body: err('TOO_MANY_IMAGES', 'Maximum 10 images per product.') },
            ],
          },
          {
            url: '/products/search', method: 'GET', description: 'Search products',
            responses: [
              { name: 'Results', statusCode: 200, isActive: true, latency: 120, body: list([{ id: 'prod_001', name: 'Widget Pro', score: 0.95 }, { id: 'prod_004', name: 'Turbo Widget', score: 0.87 }]) },
              { name: 'No Results', statusCode: 200, latency: 60, body: list([]) },
            ],
          },
          {
            url: '/products/bulk', method: 'POST', description: 'Bulk import products',
            responses: [
              { name: 'Imported', statusCode: 200, isActive: true, latency: 2000, body: ok({ created: 45, updated: 12, failed: 3, errors: ['Row 5: Invalid SKU format'] }) },
              { name: 'File Invalid', statusCode: 422, isError: true, latency: 100, body: err('INVALID_FORMAT', 'CSV file format is invalid.') },
            ],
          },
        ],
      },
      {
        name: 'Categories',
        description: 'Category tree management',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/categories', method: 'GET', description: 'List all categories',
            responses: [
              { name: 'All Categories', statusCode: 200, isActive: true, latency: 40, body: list([{ id: 'cat_01', name: 'Electronics', productCount: 42 }, { id: 'cat_02', name: 'Home & Garden', productCount: 18 }, { id: 'cat_03', name: 'Sports', productCount: 31 }]) },
              { name: 'Empty', statusCode: 200, latency: 20, body: list([]) },
            ],
          },
          {
            url: '/categories/:id', method: 'GET', description: 'Get category detail',
            responses: [
              { name: 'Electronics', statusCode: 200, isActive: true, latency: 35, body: ok({ id: 'cat_01', name: 'Electronics', slug: 'electronics', description: 'Gadgets and devices.', productCount: 42 }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 15, body: err('NOT_FOUND', 'Category not found.') },
            ],
          },
          {
            url: '/categories', method: 'POST', description: 'Create category',
            requestBody: j({ name: 'Office Supplies', slug: 'office-supplies', parentId: null }),
            responses: [
              { name: 'Created', statusCode: 201, isActive: true, latency: 100, body: ok({ id: 'cat_04', name: 'Office Supplies', slug: 'office-supplies', productCount: 0 }) },
              { name: 'Slug Taken', statusCode: 409, isError: true, latency: 40, body: err('SLUG_TAKEN', 'Category slug already exists.') },
            ],
          },
          {
            url: '/categories/:id/products', method: 'GET', description: 'Get products in category',
            responses: [
              { name: 'Products', statusCode: 200, isActive: true, latency: 80, body: list([{ id: 'prod_001', name: 'Widget Pro', price: 2999 }, { id: 'prod_005', name: 'Smart Device X', price: 7999 }]) },
              { name: 'Empty Category', statusCode: 200, latency: 40, body: list([]) },
            ],
          },
          {
            url: '/categories/:id', method: 'DELETE', description: 'Delete category',
            responses: [
              { name: 'Deleted', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'cat_04', deleted: true }) },
              { name: 'Has Products', statusCode: 422, isError: true, latency: 30, body: err('HAS_PRODUCTS', 'Cannot delete a category with products.') },
            ],
          },
        ],
      },
      {
        name: 'Inventory',
        description: 'Stock levels and warehouse management',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/inventory/:productId', method: 'GET', description: 'Get stock levels',
            responses: [
              { name: 'In Stock', statusCode: 200, isActive: true, latency: 50, body: ok({ productId: 'prod_001', quantity: 42, reserved: 5, available: 37, warehouses: [{ id: 'wh_01', quantity: 30 }, { id: 'wh_02', quantity: 12 }] }) },
              { name: 'Out of Stock', statusCode: 200, latency: 40, body: ok({ productId: 'prod_001', quantity: 0, reserved: 0, available: 0 }) },
            ],
          },
          {
            url: '/inventory/:productId/adjust', method: 'POST', description: 'Adjust stock level',
            requestBody: j({ adjustment: -5, reason: 'damage', warehouseId: 'wh_01' }),
            responses: [
              { name: 'Adjusted', statusCode: 200, isActive: true, latency: 100, body: ok({ productId: 'prod_001', previousQty: 42, newQty: 37, adjustment: -5 }) },
              { name: 'Would Go Negative', statusCode: 422, isError: true, latency: 30, body: err('NEGATIVE_STOCK', 'Adjustment would result in negative stock.') },
            ],
          },
          {
            url: '/inventory/low-stock', method: 'GET', description: 'Get low stock alerts',
            responses: [
              { name: 'Low Stock Items', statusCode: 200, isActive: true, latency: 120, body: list([{ productId: 'prod_003', name: 'Doohickey Max', quantity: 3, threshold: 10 }, { productId: 'prod_007', name: 'Rare Gadget', quantity: 1, threshold: 5 }]) },
              { name: 'All Good', statusCode: 200, latency: 80, body: list([]) },
            ],
          },
          {
            url: '/inventory/transfer', method: 'POST', description: 'Transfer stock between warehouses',
            requestBody: j({ productId: 'prod_001', fromWarehouseId: 'wh_01', toWarehouseId: 'wh_02', quantity: 10 }),
            responses: [
              { name: 'Transfer Initiated', statusCode: 201, isActive: true, latency: 200, body: ok({ transferId: 'tr_001', status: 'pending', estimatedArrival: '2025-05-03T00:00:00Z' }) },
              { name: 'Insufficient Stock', statusCode: 422, isError: true, latency: 30, body: err('INSUFFICIENT_STOCK', 'Not enough stock in source warehouse.') },
            ],
          },
        ],
      },
      {
        name: 'Pricing',
        description: 'Price rules, discounts and promotions',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/pricing/rules', method: 'GET', description: 'List pricing rules',
            responses: [
              { name: 'Active Rules', statusCode: 200, isActive: true, latency: 70, body: list([{ id: 'pr_001', name: 'Summer Sale', discount: '20%', active: true }, { id: 'pr_002', name: 'Bulk 10+', discount: '15%', active: true }]) },
            ],
          },
          {
            url: '/pricing/calculate', method: 'POST', description: 'Calculate final price',
            requestBody: j({ items: [{ productId: 'prod_001', qty: 3 }], couponCode: 'SUMMER20' }),
            responses: [
              { name: 'Discounted Price', statusCode: 200, isActive: true, latency: 80, body: ok({ subtotal: 8997, discount: 1799, total: 7198, appliedRules: ['SUMMER20'] }) },
              { name: 'Invalid Coupon', statusCode: 422, isError: true, latency: 30, body: err('INVALID_COUPON', 'Coupon code is invalid or expired.') },
              { name: 'No Discount', statusCode: 200, latency: 60, body: ok({ subtotal: 8997, discount: 0, total: 8997, appliedRules: [] }) },
            ],
          },
          {
            url: '/pricing/coupons', method: 'POST', description: 'Create coupon',
            requestBody: j({ code: 'LAUNCH50', type: 'percent', value: 50, maxUses: 100, expiresAt: '2025-12-31' }),
            responses: [
              { name: 'Coupon Created', statusCode: 201, isActive: true, latency: 100, body: ok({ id: 'coup_001', code: 'LAUNCH50', type: 'percent', value: 50 }) },
              { name: 'Code Taken', statusCode: 409, isError: true, latency: 40, body: err('CODE_TAKEN', 'Coupon code already exists.') },
            ],
          },
          {
            url: '/pricing/coupons/:code/validate', method: 'GET', description: 'Validate coupon',
            responses: [
              { name: 'Valid', statusCode: 200, isActive: true, latency: 50, body: ok({ code: 'SUMMER20', valid: true, discount: '20%', expiresAt: '2025-08-31' }) },
              { name: 'Expired', statusCode: 200, latency: 40, body: ok({ code: 'OLD10', valid: false, reason: 'expired' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Coupon code not found.') },
            ],
          },
        ],
      },
    ],
  },

  // ── 4. Order Management ──────────────────────────────────────────────────
  {
    name: 'Order Management',
    description: 'Order lifecycle, fulfillment and returns',
    baseUrl: 'https://api.orders.internal',
    ownerName: 'fulfillment-team',
    isFavorite: false,
    collections: [
      {
        name: 'Orders',
        description: 'Customer order CRUD and lifecycle',
        isActive: true,
        isFavorite: true,
        rules: [
          {
            url: '/orders', method: 'GET', description: 'List orders',
            responses: [
              { name: 'Recent Orders', statusCode: 200, isActive: true, latency: 100, body: list([{ id: 'ord_001', status: 'shipped', total: 5998 }, { id: 'ord_002', status: 'pending', total: 2999 }], 1240) },
              { name: 'Empty', statusCode: 200, latency: 40, body: list([]) },
            ],
          },
          {
            url: '/orders/:id', method: 'GET', description: 'Get order detail',
            responses: [
              { name: 'Shipped Order', statusCode: 200, isActive: true, latency: 70, body: ok({ id: 'ord_001', status: 'shipped', total: 5998, items: [{ productId: 'prod_001', qty: 2, price: 2999 }], shippedAt: '2025-04-30T08:00:00Z' }) },
              { name: 'Pending Order', statusCode: 200, latency: 60, body: ok({ id: 'ord_002', status: 'pending', total: 2999, items: [{ productId: 'prod_002', qty: 3, price: 999 }] }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Order not found.') },
            ],
          },
          {
            url: '/orders', method: 'POST', description: 'Create order',
            requestBody: j({ items: [{ productId: 'prod_001', qty: 2 }], shippingAddressId: 'addr_001', paymentMethodId: 'pm_001' }),
            responses: [
              { name: 'Order Created', statusCode: 201, isActive: true, latency: 400, body: ok({ id: 'ord_003', status: 'pending', total: 5998, estimatedDelivery: '2025-05-05T00:00:00Z' }) },
              { name: 'Out of Stock', statusCode: 422, isError: true, latency: 100, body: err('OUT_OF_STOCK', 'One or more items are out of stock.', { items: ['prod_001'] }) },
              { name: 'Payment Failed', statusCode: 402, isError: true, latency: 300, body: err('PAYMENT_FAILED', 'Failed to process payment.') },
            ],
          },
          {
            url: '/orders/:id/cancel', method: 'POST', description: 'Cancel order',
            responses: [
              { name: 'Cancelled', statusCode: 200, isActive: true, latency: 200, body: ok({ id: 'ord_002', status: 'cancelled', cancelledAt: '2025-05-01T12:00:00Z', refundInitiated: true }) },
              { name: 'Already Shipped', statusCode: 422, isError: true, latency: 40, body: err('ALREADY_SHIPPED', 'Cannot cancel an order that has already shipped.') },
            ],
          },
          {
            url: '/orders/:id/status', method: 'GET', description: 'Get order status updates',
            responses: [
              { name: 'Status Timeline', statusCode: 200, isActive: true, latency: 60, body: ok({ id: 'ord_001', currentStatus: 'delivered', timeline: [{ status: 'pending', at: '2025-04-28' }, { status: 'processing', at: '2025-04-29' }, { status: 'shipped', at: '2025-04-30' }, { status: 'delivered', at: '2025-05-02' }] }) },
            ],
          },
        ],
      },
      {
        name: 'Shipments',
        description: 'Shipment tracking and carrier integration',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/shipments/:orderId', method: 'GET', description: 'Get shipment for order',
            responses: [
              { name: 'In Transit', statusCode: 200, isActive: true, latency: 80, body: ok({ orderId: 'ord_001', trackingNumber: 'UPS1234567890', carrier: 'UPS', status: 'in_transit', estimatedDelivery: '2025-05-03T00:00:00Z' }) },
              { name: 'Delivered', statusCode: 200, latency: 70, body: ok({ orderId: 'ord_001', trackingNumber: 'UPS1234567890', carrier: 'UPS', status: 'delivered', deliveredAt: '2025-05-02T14:30:00Z' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Shipment not found for this order.') },
            ],
          },
          {
            url: '/shipments/:id/label', method: 'GET', description: 'Get shipping label URL',
            responses: [
              { name: 'Label URL', statusCode: 200, isActive: true, latency: 300, body: ok({ url: 'https://cdn.orders.internal/labels/shp_001.pdf', expiresAt: '2025-05-02T00:00:00Z' }) },
            ],
          },
          {
            url: '/shipments', method: 'POST', description: 'Create shipment',
            requestBody: j({ orderId: 'ord_003', carrier: 'fedex', serviceLevel: 'ground' }),
            responses: [
              { name: 'Shipment Created', statusCode: 201, isActive: true, latency: 500, body: ok({ id: 'shp_002', orderId: 'ord_003', trackingNumber: 'FDX9876543210', carrier: 'fedex', labelUrl: 'https://cdn.orders.internal/labels/shp_002.pdf' }) },
              { name: 'Carrier Error', statusCode: 502, isError: true, latency: 1000, body: err('CARRIER_ERROR', 'Failed to create shipment with carrier.') },
            ],
          },
          {
            url: '/shipments/:id/tracking', method: 'GET', description: 'Get tracking events',
            responses: [
              { name: 'Tracking Events', statusCode: 200, isActive: true, latency: 400, body: ok({ trackingNumber: 'UPS1234567890', events: [{ status: 'picked_up', location: 'New York, NY', timestamp: '2025-04-30T10:00:00Z' }, { status: 'in_transit', location: 'Chicago, IL', timestamp: '2025-05-01T08:00:00Z' }] }) },
            ],
          },
        ],
      },
      {
        name: 'Returns',
        description: 'Return merchandise authorization (RMA)',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/returns', method: 'POST', description: 'Request return',
            requestBody: j({ orderId: 'ord_001', items: [{ productId: 'prod_001', qty: 1, reason: 'defective' }] }),
            responses: [
              { name: 'RMA Created', statusCode: 201, isActive: true, latency: 200, body: ok({ rmaId: 'rma_001', status: 'pending', returnLabel: 'https://cdn.orders.internal/labels/rma_001.pdf' }) },
              { name: 'Outside Window', statusCode: 422, isError: true, latency: 40, body: err('RETURN_WINDOW_EXPIRED', '30-day return window has expired.') },
              { name: 'Non-Returnable', statusCode: 422, isError: true, latency: 30, body: err('NON_RETURNABLE', 'This item is non-returnable.') },
            ],
          },
          {
            url: '/returns/:id', method: 'GET', description: 'Get return status',
            responses: [
              { name: 'Pending', statusCode: 200, isActive: true, latency: 60, body: ok({ rmaId: 'rma_001', status: 'pending', items: [{ productId: 'prod_001', qty: 1 }] }) },
              { name: 'Approved', statusCode: 200, latency: 55, body: ok({ rmaId: 'rma_001', status: 'approved', refundAmount: 2999, refundEta: '2025-05-08T00:00:00Z' }) },
              { name: 'Rejected', statusCode: 200, latency: 50, body: ok({ rmaId: 'rma_001', status: 'rejected', reason: 'Item shows signs of use beyond normal.' }) },
            ],
          },
          {
            url: '/returns', method: 'GET', description: 'List returns',
            responses: [
              { name: 'Returns List', statusCode: 200, isActive: true, latency: 80, body: list([{ rmaId: 'rma_001', status: 'approved', orderId: 'ord_001' }, { rmaId: 'rma_002', status: 'pending', orderId: 'ord_003' }]) },
            ],
          },
          {
            url: '/returns/:id/approve', method: 'POST', description: 'Approve return (admin)',
            responses: [
              { name: 'Approved', statusCode: 200, isActive: true, latency: 150, body: ok({ rmaId: 'rma_002', status: 'approved', refundAmount: 999 }) },
              { name: 'Already Processed', statusCode: 409, isError: true, latency: 30, body: err('ALREADY_PROCESSED', 'Return has already been processed.') },
            ],
          },
        ],
      },
    ],
  },

  // ── 5. Notification Hub ──────────────────────────────────────────────────
  {
    name: 'Notification Hub',
    description: 'Multi-channel notification delivery service',
    baseUrl: 'https://api.notifications.internal',
    ownerName: 'comms-team',
    isFavorite: false,
    collections: [
      {
        name: 'Email',
        description: 'Transactional email sending',
        isActive: true,
        isFavorite: false,
        rules: [
          {
            url: '/email/send', method: 'POST', description: 'Send transactional email',
            requestBody: j({ to: 'alice@example.com', templateId: 'order_confirmation', variables: { orderId: 'ord_001' } }),
            responses: [
              { name: 'Queued', statusCode: 202, isActive: true, latency: 100, body: ok({ messageId: 'msg_001', status: 'queued', estimatedDelivery: '2025-05-01T12:01:00Z' }) },
              { name: 'Invalid Template', statusCode: 422, isError: true, latency: 30, body: err('INVALID_TEMPLATE', 'Email template not found.') },
              { name: 'Invalid Recipient', statusCode: 422, isError: true, latency: 25, body: err('INVALID_EMAIL', 'Recipient email address is invalid.') },
              { name: 'Rate Limited', statusCode: 429, isError: true, latency: 10, body: err('RATE_LIMITED', 'Email sending rate limit reached.') },
            ],
          },
          {
            url: '/email/status/:messageId', method: 'GET', description: 'Get delivery status',
            responses: [
              { name: 'Delivered', statusCode: 200, isActive: true, latency: 50, body: ok({ messageId: 'msg_001', status: 'delivered', deliveredAt: '2025-05-01T12:01:30Z' }) },
              { name: 'Bounced', statusCode: 200, latency: 45, body: ok({ messageId: 'msg_002', status: 'bounced', bounceType: 'hard', bouncedAt: '2025-05-01T12:01:10Z' }) },
              { name: 'Pending', statusCode: 200, latency: 40, body: ok({ messageId: 'msg_003', status: 'queued' }) },
            ],
          },
          {
            url: '/email/bulk', method: 'POST', description: 'Send bulk email campaign',
            requestBody: j({ templateId: 'monthly_newsletter', segment: 'active_users', scheduleAt: '2025-06-01T09:00:00Z' }),
            responses: [
              { name: 'Campaign Scheduled', statusCode: 201, isActive: true, latency: 300, body: ok({ campaignId: 'camp_001', recipientCount: 8432, scheduledAt: '2025-06-01T09:00:00Z' }) },
              { name: 'Segment Empty', statusCode: 422, isError: true, latency: 100, body: err('EMPTY_SEGMENT', 'Selected segment has no recipients.') },
            ],
          },
          {
            url: '/email/templates', method: 'GET', description: 'List email templates',
            responses: [
              { name: 'Templates', statusCode: 200, isActive: true, latency: 60, body: list([{ id: 'order_confirmation', name: 'Order Confirmation', subject: 'Your order {{orderId}} is confirmed' }, { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to {{appName}}!' }]) },
            ],
          },
        ],
      },
      {
        name: 'Push Notifications',
        description: 'Mobile push via APNs and FCM',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/push/send', method: 'POST', description: 'Send push notification',
            requestBody: j({ userId: 'usr_001', title: 'Order Shipped!', body: 'Your order is on the way.', data: { orderId: 'ord_001' } }),
            responses: [
              { name: 'Sent', statusCode: 200, isActive: true, latency: 80, body: ok({ messageId: 'push_001', status: 'sent', deviceCount: 2 }) },
              { name: 'No Devices', statusCode: 200, latency: 40, body: ok({ messageId: 'push_002', status: 'no_devices', deviceCount: 0 }) },
              { name: 'Invalid Token', statusCode: 422, isError: true, latency: 30, body: err('INVALID_DEVICE_TOKEN', 'One or more device tokens are invalid.') },
            ],
          },
          {
            url: '/push/devices', method: 'POST', description: 'Register device token',
            requestBody: j({ userId: 'usr_001', token: 'apns_token_abc123', platform: 'ios' }),
            responses: [
              { name: 'Registered', statusCode: 201, isActive: true, latency: 100, body: ok({ deviceId: 'dev_001', platform: 'ios', registeredAt: '2025-05-01T00:00:00Z' }) },
              { name: 'Already Registered', statusCode: 200, latency: 50, body: ok({ deviceId: 'dev_001', platform: 'ios', updated: true }) },
            ],
          },
          {
            url: '/push/devices/:userId', method: 'GET', description: 'List user devices',
            responses: [
              { name: 'Devices', statusCode: 200, isActive: true, latency: 60, body: list([{ deviceId: 'dev_001', platform: 'ios', lastSeen: '2025-04-30T10:00:00Z' }, { deviceId: 'dev_002', platform: 'android', lastSeen: '2025-04-28T15:00:00Z' }]) },
              { name: 'No Devices', statusCode: 200, latency: 30, body: list([]) },
            ],
          },
          {
            url: '/push/devices/:deviceId', method: 'DELETE', description: 'Unregister device',
            responses: [
              { name: 'Unregistered', statusCode: 200, isActive: true, latency: 80, body: ok({ deviceId: 'dev_002', unregistered: true }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Device not found.') },
            ],
          },
        ],
      },
      {
        name: 'SMS',
        description: 'SMS via Twilio/SNS',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/sms/send', method: 'POST', description: 'Send SMS',
            requestBody: j({ to: '+15551234567', message: 'Your verification code is: 123456' }),
            responses: [
              { name: 'Sent', statusCode: 200, isActive: true, latency: 200, body: ok({ messageId: 'sms_001', status: 'sent', to: '+15551234567' }) },
              { name: 'Invalid Number', statusCode: 422, isError: true, latency: 50, body: err('INVALID_PHONE', 'Phone number is invalid or not reachable.') },
              { name: 'Carrier Block', statusCode: 400, isError: true, latency: 300, body: err('CARRIER_BLOCK', 'Message was blocked by carrier.') },
            ],
          },
          {
            url: '/sms/otp/send', method: 'POST', description: 'Send OTP via SMS',
            requestBody: j({ phoneNumber: '+15551234567', purpose: 'login' }),
            responses: [
              { name: 'OTP Sent', statusCode: 200, isActive: true, latency: 300, body: ok({ sessionId: 'otp_sess_001', expiresIn: 300 }) },
              { name: 'Rate Limited', statusCode: 429, isError: true, latency: 10, body: err('RATE_LIMITED', 'Too many OTP requests. Try again in 5 minutes.') },
            ],
          },
          {
            url: '/sms/otp/verify', method: 'POST', description: 'Verify OTP code',
            requestBody: j({ sessionId: 'otp_sess_001', code: '123456' }),
            responses: [
              { name: 'Verified', statusCode: 200, isActive: true, latency: 80, body: ok({ verified: true, sessionId: 'otp_sess_001' }) },
              { name: 'Invalid Code', statusCode: 401, isError: true, latency: 40, body: err('INVALID_OTP', 'OTP code is incorrect.') },
              { name: 'Expired', statusCode: 401, isError: true, latency: 30, body: err('OTP_EXPIRED', 'OTP has expired.') },
            ],
          },
        ],
      },
      {
        name: 'Templates',
        description: 'Notification template management',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/templates', method: 'GET', description: 'List all templates',
            responses: [
              { name: 'Templates', statusCode: 200, isActive: true, latency: 60, body: list([{ id: 'tpl_001', name: 'Order Confirmation', channels: ['email', 'push'] }, { id: 'tpl_002', name: 'Password Reset', channels: ['email', 'sms'] }]) },
            ],
          },
          {
            url: '/templates', method: 'POST', description: 'Create template',
            requestBody: j({ name: 'Welcome Email', channel: 'email', subject: 'Welcome!', body: 'Hello {{name}}!' }),
            responses: [
              { name: 'Created', statusCode: 201, isActive: true, latency: 100, body: ok({ id: 'tpl_003', name: 'Welcome Email', createdAt: '2025-05-01T00:00:00Z' }) },
              { name: 'Name Taken', statusCode: 409, isError: true, latency: 40, body: err('NAME_TAKEN', 'A template with this name already exists.') },
            ],
          },
          {
            url: '/templates/:id/preview', method: 'POST', description: 'Preview template with variables',
            requestBody: j({ variables: { name: 'Alice', orderId: 'ord_001' } }),
            responses: [
              { name: 'Rendered Preview', statusCode: 200, isActive: true, latency: 150, body: ok({ html: '<html><body>Hello Alice!</body></html>', text: 'Hello Alice!' }) },
              { name: 'Missing Variable', statusCode: 422, isError: true, latency: 30, body: err('MISSING_VARIABLE', 'Required variable "orderId" not provided.') },
            ],
          },
        ],
      },
    ],
  },

  // ── 6. Analytics Engine ──────────────────────────────────────────────────
  {
    name: 'Analytics Engine',
    description: 'Event tracking, dashboards and reporting',
    baseUrl: 'https://api.analytics.internal',
    ownerName: 'data-team',
    isFavorite: false,
    collections: [
      {
        name: 'Events',
        description: 'Event ingestion and query',
        isActive: true,
        isFavorite: false,
        rules: [
          {
            url: '/events', method: 'POST', description: 'Track event',
            requestBody: j({ name: 'purchase_completed', userId: 'usr_001', properties: { orderId: 'ord_001', amount: 5998 } }),
            responses: [
              { name: 'Tracked', statusCode: 202, isActive: true, latency: 30, body: ok({ eventId: 'evt_001', status: 'queued' }) },
              { name: 'Invalid Event', statusCode: 422, isError: true, latency: 20, body: err('INVALID_EVENT', 'Event name contains invalid characters.') },
            ],
          },
          {
            url: '/events/batch', method: 'POST', description: 'Track batch of events',
            requestBody: j({ events: [{ name: 'page_view', userId: 'usr_001' }, { name: 'button_click', userId: 'usr_002' }] }),
            responses: [
              { name: 'Batch Accepted', statusCode: 202, isActive: true, latency: 50, body: ok({ accepted: 2, failed: 0 }) },
              { name: 'Partial Failure', statusCode: 207, latency: 60, body: ok({ accepted: 1, failed: 1, errors: [{ index: 1, reason: 'Invalid event name.' }] }) },
            ],
          },
          {
            url: '/events/query', method: 'POST', description: 'Query events',
            requestBody: j({ event: 'purchase_completed', from: '2025-04-01', to: '2025-05-01', groupBy: 'day' }),
            responses: [
              { name: 'Query Results', statusCode: 200, isActive: true, latency: 800, body: ok({ event: 'purchase_completed', total: 4821, series: [{ date: '2025-04-01', count: 152 }, { date: '2025-04-02', count: 178 }] }) },
              { name: 'No Data', statusCode: 200, latency: 400, body: ok({ event: 'purchase_completed', total: 0, series: [] }) },
              { name: 'Date Range Too Large', statusCode: 422, isError: true, latency: 30, body: err('DATE_RANGE_TOO_LARGE', 'Date range cannot exceed 90 days.') },
            ],
          },
          {
            url: '/events/funnel', method: 'POST', description: 'Funnel analysis',
            requestBody: j({ steps: ['page_view', 'add_to_cart', 'checkout_started', 'purchase_completed'], from: '2025-04-01', to: '2025-05-01' }),
            responses: [
              { name: 'Funnel Data', statusCode: 200, isActive: true, latency: 1200, body: ok({ steps: [{ name: 'page_view', count: 45231, dropoff: 0 }, { name: 'add_to_cart', count: 12451, dropoff: 72.5 }, { name: 'checkout_started', count: 4821, dropoff: 61.3 }, { name: 'purchase_completed', count: 3102, dropoff: 35.7 }] }) },
            ],
          },
        ],
      },
      {
        name: 'Dashboards',
        description: 'Custom dashboard management',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/dashboards', method: 'GET', description: 'List dashboards',
            responses: [
              { name: 'Dashboards', statusCode: 200, isActive: true, latency: 80, body: list([{ id: 'dash_001', name: 'Revenue Overview', widgetCount: 6 }, { id: 'dash_002', name: 'User Acquisition', widgetCount: 4 }]) },
            ],
          },
          {
            url: '/dashboards/:id', method: 'GET', description: 'Get dashboard with data',
            responses: [
              { name: 'Dashboard Data', statusCode: 200, isActive: true, latency: 2000, body: ok({ id: 'dash_001', name: 'Revenue Overview', widgets: [{ id: 'w_01', type: 'line', title: 'Daily Revenue', data: [] }] }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Dashboard not found.') },
            ],
          },
          {
            url: '/dashboards', method: 'POST', description: 'Create dashboard',
            requestBody: j({ name: 'Sales KPIs', widgets: [] }),
            responses: [
              { name: 'Created', statusCode: 201, isActive: true, latency: 100, body: ok({ id: 'dash_003', name: 'Sales KPIs', createdAt: '2025-05-01T00:00:00Z' }) },
            ],
          },
          {
            url: '/dashboards/:id/export', method: 'GET', description: 'Export dashboard as PDF',
            responses: [
              { name: 'Export URL', statusCode: 200, isActive: true, latency: 3000, body: ok({ url: 'https://cdn.analytics.internal/exports/dash_001_2025-05-01.pdf', expiresAt: '2025-05-02T00:00:00Z' }) },
            ],
          },
        ],
      },
      {
        name: 'Reports',
        description: 'Scheduled and on-demand reports',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/reports', method: 'GET', description: 'List reports',
            responses: [
              { name: 'Reports', statusCode: 200, isActive: true, latency: 70, body: list([{ id: 'rep_001', name: 'Monthly Revenue', schedule: 'monthly', lastRun: '2025-05-01' }, { id: 'rep_002', name: 'User Growth', schedule: 'weekly', lastRun: '2025-04-28' }]) },
            ],
          },
          {
            url: '/reports/:id/run', method: 'POST', description: 'Run report on demand',
            responses: [
              { name: 'Running', statusCode: 202, isActive: true, latency: 200, body: ok({ reportId: 'rep_001', runId: 'run_001', status: 'running', estimatedDuration: 30 }) },
              { name: 'Already Running', statusCode: 409, isError: true, latency: 30, body: err('ALREADY_RUNNING', 'Report is already running.') },
            ],
          },
          {
            url: '/reports/:id/results/:runId', method: 'GET', description: 'Get report results',
            responses: [
              { name: 'Complete', statusCode: 200, isActive: true, latency: 500, body: ok({ runId: 'run_001', status: 'complete', downloadUrl: 'https://cdn.analytics.internal/reports/run_001.csv', rowCount: 1248 }) },
              { name: 'Still Running', statusCode: 200, latency: 100, body: ok({ runId: 'run_001', status: 'running', progress: 65 }) },
              { name: 'Failed', statusCode: 200, latency: 80, body: ok({ runId: 'run_002', status: 'failed', error: 'Query timed out after 120 seconds.' }) },
            ],
          },
          {
            url: '/reports', method: 'POST', description: 'Create scheduled report',
            requestBody: j({ name: 'Daily Active Users', query: { event: 'session_start' }, schedule: 'daily', format: 'csv', recipients: ['team@example.com'] }),
            responses: [
              { name: 'Report Created', statusCode: 201, isActive: true, latency: 150, body: ok({ id: 'rep_003', name: 'Daily Active Users', nextRun: '2025-05-02T08:00:00Z' }) },
            ],
          },
        ],
      },
    ],
  },

  // ── 7. Search Service ────────────────────────────────────────────────────
  {
    name: 'Search Service',
    description: 'Full-text search and autocomplete',
    baseUrl: 'https://api.search.internal',
    ownerName: 'search-team',
    isFavorite: false,
    collections: [
      {
        name: 'Search',
        description: 'Full-text search queries',
        isActive: true,
        isFavorite: false,
        rules: [
          {
            url: '/search', method: 'GET', description: 'Full-text search',
            responses: [
              { name: 'Results', statusCode: 200, isActive: true, latency: 80, body: list([{ id: 'prod_001', type: 'product', title: 'Widget Pro', score: 0.95 }, { id: 'prod_004', type: 'product', title: 'Turbo Widget', score: 0.87 }], 24) },
              { name: 'No Results', statusCode: 200, latency: 40, body: list([]) },
              { name: 'Query Too Short', statusCode: 422, isError: true, latency: 10, body: err('QUERY_TOO_SHORT', 'Search query must be at least 2 characters.') },
            ],
          },
          {
            url: '/search/products', method: 'GET', description: 'Search products only',
            responses: [
              { name: 'Product Results', statusCode: 200, isActive: true, latency: 60, body: list([{ id: 'prod_001', name: 'Widget Pro', price: 2999, score: 0.95 }]) },
              { name: 'No Products Found', statusCode: 200, latency: 35, body: list([]) },
            ],
          },
          {
            url: '/search/suggestions', method: 'GET', description: 'Autocomplete suggestions',
            responses: [
              { name: 'Suggestions', statusCode: 200, isActive: true, latency: 20, body: ok({ suggestions: ['widget pro', 'widget lite', 'widget accessories'] }) },
              { name: 'No Suggestions', statusCode: 200, latency: 15, body: ok({ suggestions: [] }) },
            ],
          },
          {
            url: '/search/index', method: 'POST', description: 'Index a document',
            requestBody: j({ id: 'prod_001', type: 'product', data: { name: 'Widget Pro', description: 'Best widget' } }),
            responses: [
              { name: 'Indexed', statusCode: 200, isActive: true, latency: 300, body: ok({ id: 'prod_001', indexed: true, indexedAt: '2025-05-01T12:00:00Z' }) },
              { name: 'Invalid Document', statusCode: 422, isError: true, latency: 30, body: err('INVALID_DOCUMENT', 'Document missing required fields.') },
            ],
          },
          {
            url: '/search/index/:id', method: 'DELETE', description: 'Remove document from index',
            responses: [
              { name: 'Removed', statusCode: 200, isActive: true, latency: 100, body: ok({ id: 'prod_001', removed: true }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Document not found in index.') },
            ],
          },
          {
            url: '/search/reindex', method: 'POST', description: 'Trigger full reindex',
            responses: [
              { name: 'Reindex Triggered', statusCode: 202, isActive: true, latency: 500, body: ok({ jobId: 'reindex_001', status: 'running', estimatedDuration: 300 }) },
              { name: 'Already Running', statusCode: 409, isError: true, latency: 30, body: err('REINDEX_RUNNING', 'A reindex job is already in progress.') },
            ],
          },
        ],
      },
      {
        name: 'Filters & Facets',
        description: 'Search filter configuration',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/search/facets', method: 'GET', description: 'Get available facets',
            responses: [
              { name: 'Facets', statusCode: 200, isActive: true, latency: 60, body: ok({ facets: [{ field: 'category', values: [{ value: 'Electronics', count: 42 }, { value: 'Home', count: 18 }] }, { field: 'price_range', values: [{ value: '0-100', count: 35 }] }] }) },
            ],
          },
          {
            url: '/search/filters', method: 'POST', description: 'Search with filters',
            requestBody: j({ query: 'widget', filters: { category: 'Electronics', priceMin: 1000, priceMax: 5000 }, sort: 'price_asc' }),
            responses: [
              { name: 'Filtered Results', statusCode: 200, isActive: true, latency: 90, body: list([{ id: 'prod_001', name: 'Widget Pro', price: 2999, category: 'Electronics' }]) },
              { name: 'No Results After Filter', statusCode: 200, latency: 50, body: list([]) },
            ],
          },
          {
            url: '/search/synonyms', method: 'GET', description: 'List search synonyms',
            responses: [
              { name: 'Synonyms', statusCode: 200, isActive: true, latency: 40, body: list([{ id: 'syn_001', terms: ['phone', 'mobile', 'smartphone'] }, { id: 'syn_002', terms: ['laptop', 'notebook', 'computer'] }]) },
            ],
          },
          {
            url: '/search/synonyms', method: 'POST', description: 'Add synonym group',
            requestBody: j({ terms: ['tv', 'television', 'smart tv'] }),
            responses: [
              { name: 'Added', statusCode: 201, isActive: true, latency: 100, body: ok({ id: 'syn_003', terms: ['tv', 'television', 'smart tv'] }) },
              { name: 'Duplicate Terms', statusCode: 409, isError: true, latency: 30, body: err('DUPLICATE_TERMS', 'One or more terms already exist in another synonym group.') },
            ],
          },
        ],
      },
    ],
  },

  // ── 8. Media Manager ────────────────────────────────────────────────────
  {
    name: 'Media Manager',
    description: 'File storage, image processing and CDN',
    baseUrl: 'https://api.media.internal',
    ownerName: 'media-team',
    isFavorite: false,
    collections: [
      {
        name: 'Uploads',
        description: 'File upload and management',
        isActive: true,
        isFavorite: false,
        rules: [
          {
            url: '/uploads/presign', method: 'POST', description: 'Get presigned upload URL',
            requestBody: j({ filename: 'photo.jpg', contentType: 'image/jpeg', size: 2048000 }),
            responses: [
              { name: 'Presigned URL', statusCode: 200, isActive: true, latency: 100, body: ok({ uploadUrl: 'https://s3.amazonaws.com/bucket/...?X-Amz-Signature=...', fileId: 'file_001', expiresIn: 3600 }) },
              { name: 'File Too Large', statusCode: 413, isError: true, latency: 20, body: err('FILE_TOO_LARGE', 'File exceeds maximum size of 50MB.') },
              { name: 'Invalid Type', statusCode: 422, isError: true, latency: 20, body: err('INVALID_FILE_TYPE', 'File type not allowed.') },
            ],
          },
          {
            url: '/uploads/:fileId/complete', method: 'POST', description: 'Mark upload as complete',
            responses: [
              { name: 'Complete', statusCode: 200, isActive: true, latency: 200, body: ok({ fileId: 'file_001', url: 'https://cdn.media.internal/file_001.jpg', size: 2048000, contentType: 'image/jpeg' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Upload session not found.') },
              { name: 'Upload Incomplete', statusCode: 422, isError: true, latency: 30, body: err('UPLOAD_INCOMPLETE', 'File has not been fully uploaded.') },
            ],
          },
          {
            url: '/uploads', method: 'GET', description: 'List uploaded files',
            responses: [
              { name: 'Files', statusCode: 200, isActive: true, latency: 80, body: list([{ fileId: 'file_001', url: 'https://cdn.media.internal/file_001.jpg', size: 2048000 }, { fileId: 'file_002', url: 'https://cdn.media.internal/file_002.png', size: 512000 }]) },
            ],
          },
          {
            url: '/uploads/:fileId', method: 'DELETE', description: 'Delete file',
            responses: [
              { name: 'Deleted', statusCode: 200, isActive: true, latency: 150, body: ok({ fileId: 'file_001', deleted: true }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'File not found.') },
              { name: 'In Use', statusCode: 422, isError: true, latency: 30, body: err('FILE_IN_USE', 'Cannot delete a file that is referenced by other resources.') },
            ],
          },
        ],
      },
      {
        name: 'Image Transforms',
        description: 'On-the-fly image resizing and optimization',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/images/:fileId/transform', method: 'POST', description: 'Transform image',
            requestBody: j({ width: 400, height: 300, format: 'webp', quality: 80 }),
            responses: [
              { name: 'Transformed URL', statusCode: 200, isActive: true, latency: 500, body: ok({ url: 'https://cdn.media.internal/file_001_400x300.webp', width: 400, height: 300, size: 45000 }) },
              { name: 'Not an Image', statusCode: 422, isError: true, latency: 30, body: err('NOT_AN_IMAGE', 'File is not an image.') },
            ],
          },
          {
            url: '/images/:fileId/metadata', method: 'GET', description: 'Get image metadata',
            responses: [
              { name: 'Metadata', statusCode: 200, isActive: true, latency: 100, body: ok({ fileId: 'file_001', width: 3024, height: 4032, format: 'jpeg', colorSpace: 'sRGB', hasAlpha: false }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Image not found.') },
            ],
          },
          {
            url: '/images/optimize', method: 'POST', description: 'Batch optimize images',
            requestBody: j({ fileIds: ['file_001', 'file_002'], targetFormat: 'webp', quality: 75 }),
            responses: [
              { name: 'Optimization Started', statusCode: 202, isActive: true, latency: 300, body: ok({ jobId: 'opt_001', status: 'running', fileCount: 2 }) },
            ],
          },
        ],
      },
    ],
  },

  // ── 9. Admin Console ────────────────────────────────────────────────────
  {
    name: 'Admin Console',
    description: 'Platform administration and operations',
    baseUrl: 'https://api.admin.internal',
    ownerName: 'ops-team',
    isFavorite: false,
    collections: [
      {
        name: 'User Admin',
        description: 'Admin user management operations',
        isActive: true,
        isFavorite: false,
        rules: [
          {
            url: '/admin/users', method: 'GET', description: 'Search all users',
            responses: [
              { name: 'Search Results', statusCode: 200, isActive: true, latency: 200, body: list([{ id: 'usr_001', email: 'alice@example.com', plan: 'pro', createdAt: '2024-01-15' }, { id: 'usr_002', email: 'bob@example.com', plan: 'starter', createdAt: '2024-02-01' }], 45821) },
              { name: 'No Results', statusCode: 200, latency: 100, body: list([]) },
            ],
          },
          {
            url: '/admin/users/:id/ban', method: 'POST', description: 'Ban user account',
            requestBody: j({ reason: 'Violation of terms of service', durationDays: 30 }),
            responses: [
              { name: 'Banned', statusCode: 200, isActive: true, latency: 150, body: ok({ userId: 'usr_003', banned: true, bannedUntil: '2025-06-01T00:00:00Z', reason: 'Violation of terms of service' }) },
              { name: 'Already Banned', statusCode: 409, isError: true, latency: 30, body: err('ALREADY_BANNED', 'User is already banned.') },
              { name: 'Cannot Ban Admin', statusCode: 422, isError: true, latency: 30, body: err('CANNOT_BAN_ADMIN', 'Cannot ban an admin account.') },
            ],
          },
          {
            url: '/admin/users/:id/unban', method: 'POST', description: 'Lift user ban',
            responses: [
              { name: 'Unbanned', statusCode: 200, isActive: true, latency: 100, body: ok({ userId: 'usr_003', banned: false, unbannedAt: '2025-05-01T12:00:00Z' }) },
              { name: 'Not Banned', statusCode: 409, isError: true, latency: 20, body: err('NOT_BANNED', 'User is not currently banned.') },
            ],
          },
          {
            url: '/admin/users/:id/impersonate', method: 'POST', description: 'Generate impersonation token',
            responses: [
              { name: 'Token Generated', statusCode: 200, isActive: true, latency: 100, body: ok({ token: 'imp_tok_abc123', expiresIn: 3600, targetUserId: 'usr_003' }) },
              { name: 'Audit Required', statusCode: 422, isError: true, latency: 30, body: err('AUDIT_REQUIRED', 'Must provide audit reason for impersonation.') },
            ],
          },
          {
            url: '/admin/stats', method: 'GET', description: 'Platform-wide stats',
            responses: [
              { name: 'Platform Stats', statusCode: 200, isActive: true, latency: 500, body: ok({ totalUsers: 48231, activeToday: 8421, newSignupsToday: 342, mrr: 142500, churnRate: 0.023 }) },
            ],
          },
        ],
      },
      {
        name: 'Audit Logs',
        description: 'Platform audit trail',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/admin/audit-logs', method: 'GET', description: 'List audit logs',
            responses: [
              { name: 'Recent Logs', statusCode: 200, isActive: true, latency: 300, body: list([{ id: 'log_001', action: 'user.banned', actorId: 'admin_001', targetId: 'usr_003', timestamp: '2025-05-01T12:00:00Z' }, { id: 'log_002', action: 'subscription.cancelled', actorId: 'usr_001', timestamp: '2025-04-30T10:00:00Z' }], 128421) },
            ],
          },
          {
            url: '/admin/audit-logs/export', method: 'POST', description: 'Export audit logs',
            requestBody: j({ from: '2025-04-01', to: '2025-05-01', format: 'csv' }),
            responses: [
              { name: 'Export Started', statusCode: 202, isActive: true, latency: 500, body: ok({ jobId: 'export_001', status: 'running', estimatedDuration: 120 }) },
              { name: 'Too Large', statusCode: 422, isError: true, latency: 40, body: err('EXPORT_TOO_LARGE', 'Date range contains too many logs. Max 30 days.') },
            ],
          },
          {
            url: '/admin/audit-logs/:id', method: 'GET', description: 'Get audit log detail',
            responses: [
              { name: 'Log Detail', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'log_001', action: 'user.banned', actorId: 'admin_001', targetId: 'usr_003', ip: '192.168.1.1', userAgent: 'Mozilla/5.0', timestamp: '2025-05-01T12:00:00Z', metadata: { reason: 'ToS violation', durationDays: 30 } }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Audit log not found.') },
            ],
          },
        ],
      },
      {
        name: 'Settings',
        description: 'Global platform configuration',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/admin/settings', method: 'GET', description: 'Get platform settings',
            responses: [
              { name: 'Settings', statusCode: 200, isActive: true, latency: 60, body: ok({ maintenanceMode: false, signupsEnabled: true, maxUsersPerOrg: 100, featureFlags: { newDashboard: true, aiAssistant: false } }) },
            ],
          },
          {
            url: '/admin/settings', method: 'PATCH', description: 'Update platform settings',
            requestBody: j({ maintenanceMode: true }),
            responses: [
              { name: 'Updated', statusCode: 200, isActive: true, latency: 100, body: ok({ maintenanceMode: true, updatedAt: '2025-05-01T12:00:00Z' }) },
              { name: 'Validation Error', statusCode: 422, isError: true, latency: 30, body: err('VALIDATION_ERROR', 'Invalid setting value.') },
            ],
          },
          {
            url: '/admin/feature-flags/:flag', method: 'POST', description: 'Toggle feature flag',
            requestBody: j({ enabled: true, rolloutPercent: 50 }),
            responses: [
              { name: 'Flag Updated', statusCode: 200, isActive: true, latency: 80, body: ok({ flag: 'aiAssistant', enabled: true, rolloutPercent: 50, updatedAt: '2025-05-01T12:00:00Z' }) },
              { name: 'Unknown Flag', statusCode: 404, isError: true, latency: 20, body: err('UNKNOWN_FLAG', 'Feature flag does not exist.') },
            ],
          },
        ],
      },
    ],
  },

  // ── 10. Zoo Management API ───────────────────────────────────────────────
  {
    name: 'Zoo Management API',
    description: 'Animal registry, staff scheduling, and veterinary health records',
    baseUrl: 'https://api.zoo.internal',
    ownerName: 'zoo-ops-team',
    isFavorite: true,
    collections: [
      {
        name: 'Animals',
        description: 'Zoo animal registry and profile management',
        isActive: true,
        isFavorite: true,
        rules: [
          {
            url: '/animals', method: 'GET', description: 'List all zoo animals', isFavorite: true,
            responses: [
              { name: 'Full Roster', statusCode: 200, isActive: true, latency: 80, body: list([{ id: 'ani_001', name: 'Leo', species: 'Lion', habitat: 'African Savanna', status: 'healthy', age: 6 }, { id: 'ani_002', name: 'Nemo', species: 'Clownfish', habitat: 'Tropical Reef', status: 'healthy', age: 2 }, { id: 'ani_003', name: 'Koko', species: 'Gorilla', habitat: 'Rainforest', status: 'under_observation', age: 12 }], 147) },
              { name: 'Empty Registry', statusCode: 200, latency: 30, body: list([]) },
              { name: 'Filter by Habitat', statusCode: 200, latency: 70, body: list([{ id: 'ani_001', name: 'Leo', species: 'Lion', habitat: 'African Savanna', status: 'healthy' }, { id: 'ani_004', name: 'Zara', species: 'Zebra', habitat: 'African Savanna', status: 'healthy' }]) },
            ],
          },
          {
            url: '/animals/:id', method: 'GET', description: 'Get animal profile',
            responses: [
              { name: 'Lion Profile', statusCode: 200, isActive: true, latency: 45, body: ok({ id: 'ani_001', name: 'Leo', species: 'Lion', subspecies: 'African Lion', sex: 'male', age: 6, weightKg: 190, habitat: 'African Savanna', enclosure: 'ENC-04', status: 'healthy', acquisitionDate: '2019-03-15', origin: 'Nairobi Wildlife Sanctuary', diet: 'carnivore', feedingSchedule: '08:00,17:00' }) },
              { name: 'Under Observation', statusCode: 200, latency: 40, body: ok({ id: 'ani_003', name: 'Koko', species: 'Gorilla', sex: 'female', age: 12, weightKg: 72, habitat: 'Rainforest', enclosure: 'ENC-09', status: 'under_observation', observationReason: 'Post-surgery recovery', lastVetCheckAt: '2025-05-29T09:00:00Z' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Animal not found.') },
            ],
          },
          {
            url: '/animals', method: 'POST', description: 'Register new animal',
            requestBody: j({ name: 'Simba', species: 'Lion', sex: 'male', age: 2, weightKg: 120, habitat: 'African Savanna', enclosure: 'ENC-04', origin: 'Born in captivity' }),
            responses: [
              { name: 'Registered', statusCode: 201, isActive: true, latency: 120, body: ok({ id: 'ani_148', name: 'Simba', species: 'Lion', enclosure: 'ENC-04', status: 'healthy', registeredAt: '2025-05-31T10:00:00Z' }) },
              { name: 'Enclosure Full', statusCode: 422, isError: true, latency: 40, body: err('ENCLOSURE_FULL', 'Enclosure ENC-04 has reached its capacity limit.') },
              { name: 'Validation Error', statusCode: 422, isError: true, latency: 30, body: err('VALIDATION_ERROR', 'Animal weight must be a positive number.') },
            ],
          },
          {
            url: '/animals/:id', method: 'PUT', description: 'Update animal record',
            requestBody: j({ weightKg: 195, enclosure: 'ENC-05', feedingSchedule: '07:30,16:30' }),
            responses: [
              { name: 'Updated', statusCode: 200, isActive: true, latency: 90, body: ok({ id: 'ani_001', name: 'Leo', weightKg: 195, enclosure: 'ENC-05', updatedAt: '2025-05-31T11:00:00Z' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Animal not found.') },
              { name: 'Invalid Enclosure', statusCode: 422, isError: true, latency: 30, body: err('INVALID_ENCLOSURE', 'Enclosure ENC-05 does not exist.') },
            ],
          },
          {
            url: '/animals/:id', method: 'DELETE', description: 'Deregister or transfer animal',
            responses: [
              { name: 'Transferred Out', statusCode: 200, isActive: true, latency: 100, body: ok({ id: 'ani_001', status: 'transferred', transferredTo: 'Savanna Wildlife Park', transferredAt: '2025-05-31T12:00:00Z' }) },
              { name: 'Deceased', statusCode: 200, latency: 80, body: ok({ id: 'ani_001', status: 'deceased', deceasedAt: '2025-05-31T06:00:00Z', causeOfDeath: 'Natural causes' }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Animal not found.') },
              { name: 'Active Health Case', statusCode: 422, isError: true, latency: 30, body: err('ACTIVE_HEALTH_CASE', 'Cannot deregister an animal with an open health record.') },
            ],
          },
        ],
      },
      {
        name: 'Staff & Shifts',
        description: 'Zookeeper staff profiles and shift scheduling',
        isActive: false,
        isFavorite: true,
        rules: [
          {
            url: '/staff', method: 'GET', description: 'List all zoo staff',
            responses: [
              { name: 'All Staff', statusCode: 200, isActive: true, latency: 70, body: list([{ id: 'stf_001', name: 'Sarah Mitchell', role: 'Senior Zookeeper', department: 'African Savanna', status: 'active' }, { id: 'stf_002', name: 'David Chen', role: 'Veterinarian', department: 'Animal Health', status: 'active' }, { id: 'stf_003', name: 'Maria Lopez', role: 'Zookeeper', department: 'Aquarium', status: 'on_leave' }], 42) },
              { name: 'No Staff', statusCode: 200, latency: 30, body: list([]) },
            ],
          },
          {
            url: '/staff/:id', method: 'GET', description: 'Get staff member profile',
            responses: [
              { name: 'Zookeeper Profile', statusCode: 200, isActive: true, latency: 55, body: ok({ id: 'stf_001', name: 'Sarah Mitchell', role: 'Senior Zookeeper', department: 'African Savanna', email: 'sarah.mitchell@zoo.internal', phone: '+1-555-0101', hireDate: '2018-06-01', certifications: ['Animal First Aid', 'Large Carnivore Handling'], assignedAnimals: ['ani_001', 'ani_004', 'ani_007'] }) },
              { name: 'Vet Profile', statusCode: 200, latency: 50, body: ok({ id: 'stf_002', name: 'David Chen', role: 'Veterinarian', department: 'Animal Health', specializations: ['Exotic Animals', 'Surgery'], licenseNumber: 'VET-2024-08821', currentCaseload: 3 }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Staff member not found.') },
            ],
          },
          {
            url: '/shifts', method: 'GET', description: 'List upcoming shifts',
            responses: [
              { name: 'This Week', statusCode: 200, isActive: true, latency: 85, body: list([{ id: 'shf_001', date: '2025-06-01', startTime: '06:00', endTime: '14:00', department: 'African Savanna', staffCount: 3, status: 'scheduled' }, { id: 'shf_002', date: '2025-06-01', startTime: '14:00', endTime: '22:00', department: 'African Savanna', staffCount: 2, status: 'understaffed' }, { id: 'shf_003', date: '2025-06-02', startTime: '06:00', endTime: '14:00', department: 'Aquarium', staffCount: 4, status: 'scheduled' }]) },
              { name: 'No Upcoming Shifts', statusCode: 200, latency: 40, body: list([]) },
            ],
          },
          {
            url: '/shifts', method: 'POST', description: 'Create a new shift',
            requestBody: j({ date: '2025-06-05', startTime: '06:00', endTime: '14:00', department: 'Rainforest', requiredStaff: 2 }),
            responses: [
              { name: 'Shift Created', statusCode: 201, isActive: true, latency: 100, body: ok({ id: 'shf_012', date: '2025-06-05', startTime: '06:00', endTime: '14:00', department: 'Rainforest', requiredStaff: 2, assignedStaff: [], status: 'understaffed', createdAt: '2025-05-31T10:00:00Z' }) },
              { name: 'Conflict Exists', statusCode: 409, isError: true, latency: 40, body: err('SHIFT_CONFLICT', 'A shift already exists for this department at the given time.') },
              { name: 'Invalid Time Range', statusCode: 422, isError: true, latency: 30, body: err('INVALID_TIME_RANGE', 'Shift end time must be after start time.') },
            ],
          },
          {
            url: '/shifts/:id/assign', method: 'PUT', description: 'Assign staff to a shift',
            requestBody: j({ staffIds: ['stf_001', 'stf_005'] }),
            responses: [
              { name: 'Staff Assigned', statusCode: 200, isActive: true, latency: 90, body: ok({ shiftId: 'shf_002', assignedStaff: [{ id: 'stf_001', name: 'Sarah Mitchell' }, { id: 'stf_005', name: 'Tom Baker' }], status: 'fully_staffed', updatedAt: '2025-05-31T10:30:00Z' }) },
              { name: 'Staff On Leave', statusCode: 422, isError: true, latency: 40, body: err('STAFF_UNAVAILABLE', 'Staff member stf_003 is on leave during this shift.') },
              { name: 'Shift Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Shift not found.') },
              { name: 'Double Booking', statusCode: 409, isError: true, latency: 35, body: err('DOUBLE_BOOKING', 'Staff member stf_001 is already assigned to an overlapping shift.') },
            ],
          },
        ],
      },
      {
        name: 'Health Records',
        description: 'Veterinary health records and sick animal case management',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/health-records/sick', method: 'GET', description: 'List currently sick animals',
            responses: [
              { name: 'Active Cases', statusCode: 200, isActive: true, latency: 75, body: list([{ id: 'hr_001', animalId: 'ani_003', animalName: 'Koko', species: 'Gorilla', condition: 'Post-operative recovery', severity: 'moderate', admittedAt: '2025-05-28T08:00:00Z', assignedVet: 'Dr. David Chen', status: 'under_treatment' }, { id: 'hr_004', animalId: 'ani_019', animalName: 'Penny', species: 'Elephant', condition: 'Respiratory infection', severity: 'mild', admittedAt: '2025-05-30T14:00:00Z', assignedVet: 'Dr. Laura Nguyen', status: 'monitoring' }]) },
              { name: 'All Clear', statusCode: 200, latency: 40, body: list([]) },
            ],
          },
          {
            url: '/health-records', method: 'POST', description: 'File a new health record',
            requestBody: j({ animalId: 'ani_012', symptoms: ['lethargy', 'reduced appetite', 'nasal discharge'], severity: 'mild', reportedBy: 'stf_001', notes: 'Animal has not eaten for 2 days' }),
            responses: [
              { name: 'Record Created', statusCode: 201, isActive: true, latency: 110, body: ok({ id: 'hr_009', animalId: 'ani_012', status: 'open', severity: 'mild', openedAt: '2025-05-31T09:00:00Z', assignedVet: 'Dr. David Chen', isolationRequired: false }) },
              { name: 'Isolation Required', statusCode: 201, latency: 120, body: ok({ id: 'hr_010', animalId: 'ani_012', status: 'open', severity: 'severe', openedAt: '2025-05-31T09:00:00Z', assignedVet: 'Dr. David Chen', isolationRequired: true, isolationEnclosure: 'ISO-02' }) },
              { name: 'Animal Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Animal not found in registry.') },
              { name: 'Record Already Open', statusCode: 409, isError: true, latency: 30, body: err('RECORD_ALREADY_OPEN', 'This animal already has an open health record.') },
            ],
          },
          {
            url: '/health-records/:animalId', method: 'GET', description: 'Get health history for an animal',
            responses: [
              { name: 'Full History', statusCode: 200, isActive: true, latency: 90, body: ok({ animalId: 'ani_003', animalName: 'Koko', totalRecords: 4, records: [{ id: 'hr_001', condition: 'Post-operative recovery', openedAt: '2025-05-28T08:00:00Z', status: 'under_treatment' }, { id: 'hr_006', condition: 'Dental abscess', openedAt: '2024-11-10T10:00:00Z', closedAt: '2024-11-18T15:00:00Z', status: 'resolved' }, { id: 'hr_008', condition: 'Minor laceration', openedAt: '2024-08-02T13:00:00Z', closedAt: '2024-08-05T09:00:00Z', status: 'resolved' }] }) },
              { name: 'No Records', statusCode: 200, latency: 40, body: ok({ animalId: 'ani_001', animalName: 'Leo', totalRecords: 0, records: [] }) },
              { name: 'Animal Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Animal not found.') },
            ],
          },
          {
            url: '/health-records/:id/treatment', method: 'PUT', description: 'Update treatment status',
            requestBody: j({ treatmentNotes: 'Administered antibiotics 500mg. Appetite improving.', medicationsGiven: ['Amoxicillin 500mg'], nextCheckAt: '2025-06-02T09:00:00Z', status: 'improving' }),
            responses: [
              { name: 'Treatment Updated', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'hr_001', status: 'improving', lastTreatmentAt: '2025-05-31T10:00:00Z', nextCheckAt: '2025-06-02T09:00:00Z', updatedBy: 'stf_002' }) },
              { name: 'Condition Worsened', statusCode: 200, latency: 75, body: ok({ id: 'hr_001', status: 'critical', severity: 'severe', alert: 'CRITICAL_ALERT_SENT', escalatedTo: 'Chief Vet', updatedBy: 'stf_002' }) },
              { name: 'Record Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Health record not found.') },
              { name: 'Record Already Closed', statusCode: 409, isError: true, latency: 25, body: err('RECORD_CLOSED', 'Cannot update a closed health record.') },
            ],
          },
          {
            url: '/health-records/:id/discharge', method: 'POST', description: 'Discharge animal and close health record',
            responses: [
              { name: 'Discharged — Recovered', statusCode: 200, isActive: true, latency: 100, body: ok({ id: 'hr_001', status: 'resolved', outcome: 'full_recovery', dischargedAt: '2025-05-31T12:00:00Z', dischargedBy: 'stf_002', durationDays: 3, returnedToEnclosure: 'ENC-09' }) },
              { name: 'Discharged — Ongoing Care', statusCode: 200, latency: 95, body: ok({ id: 'hr_001', status: 'closed_ongoing_care', outcome: 'managed_condition', dischargedAt: '2025-05-31T12:00:00Z', followUpScheduled: '2025-06-14T10:00:00Z', medicationContinued: ['Vitamin D supplement'] }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Health record not found.') },
              { name: 'Too Soon to Discharge', statusCode: 422, isError: true, latency: 30, body: err('PREMATURE_DISCHARGE', 'Minimum observation period of 24 hours has not been met.') },
            ],
          },
        ],
      },
    ],
  },

  // ── 11. Partner API ──────────────────────────────────────────────────────
  {
    name: 'Partner API',
    description: 'External partner and integration management',
    baseUrl: 'https://api.partners.internal',
    ownerName: 'partnerships-team',
    isFavorite: false,
    collections: [
      {
        name: 'Partners',
        description: 'Partner account management',
        isActive: true,
        isFavorite: false,
        rules: [
          {
            url: '/partners', method: 'GET', description: 'List partners',
            responses: [
              { name: 'Partners List', statusCode: 200, isActive: true, latency: 100, body: list([{ id: 'par_001', name: 'Acme Integrations', tier: 'gold', status: 'active' }, { id: 'par_002', name: 'Beta Tools', tier: 'silver', status: 'active' }]) },
            ],
          },
          {
            url: '/partners/:id', method: 'GET', description: 'Get partner details',
            responses: [
              { name: 'Partner Detail', statusCode: 200, isActive: true, latency: 70, body: ok({ id: 'par_001', name: 'Acme Integrations', tier: 'gold', monthlyApiCalls: 482310, revenueShare: 0.15 }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Partner not found.') },
            ],
          },
          {
            url: '/partners', method: 'POST', description: 'Register partner',
            requestBody: j({ name: 'New Partner Inc.', email: 'tech@newpartner.com', website: 'https://newpartner.com', tier: 'bronze' }),
            responses: [
              { name: 'Registered', statusCode: 201, isActive: true, latency: 200, body: ok({ id: 'par_003', name: 'New Partner Inc.', tier: 'bronze', status: 'pending_approval', apiKey: 'pk_par_abc123' }) },
              { name: 'Email Taken', statusCode: 409, isError: true, latency: 40, body: err('EMAIL_TAKEN', 'A partner account with this email already exists.') },
            ],
          },
          {
            url: '/partners/:id/usage', method: 'GET', description: 'Get partner API usage',
            responses: [
              { name: 'Usage Stats', statusCode: 200, isActive: true, latency: 200, body: ok({ partnerId: 'par_001', period: '2025-04', totalRequests: 482310, successRate: 0.998, topEndpoints: [{ path: '/products', count: 182000 }, { path: '/orders', count: 95000 }] }) },
            ],
          },
          {
            url: '/partners/:id/approve', method: 'POST', description: 'Approve partner application',
            responses: [
              { name: 'Approved', statusCode: 200, isActive: true, latency: 150, body: ok({ id: 'par_003', status: 'active', approvedAt: '2025-05-01T12:00:00Z' }) },
              { name: 'Already Active', statusCode: 409, isError: true, latency: 30, body: err('ALREADY_ACTIVE', 'Partner is already active.') },
            ],
          },
        ],
      },
      {
        name: 'Webhooks',
        description: 'Partner webhook configuration',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/webhooks', method: 'GET', description: 'List webhooks',
            responses: [
              { name: 'Webhooks', statusCode: 200, isActive: true, latency: 70, body: list([{ id: 'wh_001', url: 'https://partner.example.com/webhook', events: ['order.created', 'order.shipped'], active: true }]) },
            ],
          },
          {
            url: '/webhooks', method: 'POST', description: 'Register webhook',
            requestBody: j({ url: 'https://partner.example.com/webhook', events: ['order.created', 'order.shipped'], secret: 'whsec_abc123' }),
            responses: [
              { name: 'Registered', statusCode: 201, isActive: true, latency: 100, body: ok({ id: 'wh_002', url: 'https://partner.example.com/webhook', events: ['order.created'], secret: 'whsec_abc123' }) },
              { name: 'Invalid URL', statusCode: 422, isError: true, latency: 30, body: err('INVALID_URL', 'Webhook URL must be a valid HTTPS endpoint.') },
              { name: 'Limit Reached', statusCode: 422, isError: true, latency: 25, body: err('WEBHOOK_LIMIT', 'Maximum of 20 webhooks per partner.') },
            ],
          },
          {
            url: '/webhooks/:id/test', method: 'POST', description: 'Send test event',
            responses: [
              { name: 'Test Delivered', statusCode: 200, isActive: true, latency: 500, body: ok({ webhookId: 'wh_001', testEventId: 'evt_test_001', responseStatus: 200, duration: 145 }) },
              { name: 'Endpoint Unreachable', statusCode: 200, latency: 10000, body: ok({ webhookId: 'wh_001', testEventId: 'evt_test_001', responseStatus: null, error: 'Connection timed out after 10 seconds.' }) },
            ],
          },
          {
            url: '/webhooks/:id/deliveries', method: 'GET', description: 'Get delivery history',
            responses: [
              { name: 'Delivery History', statusCode: 200, isActive: true, latency: 150, body: list([{ deliveryId: 'del_001', eventType: 'order.created', status: 'success', responseStatus: 200, timestamp: '2025-05-01T10:00:00Z' }, { deliveryId: 'del_002', eventType: 'order.shipped', status: 'failed', error: 'Connection refused', timestamp: '2025-04-30T15:00:00Z' }]) },
            ],
          },
          {
            url: '/webhooks/:id', method: 'DELETE', description: 'Delete webhook',
            responses: [
              { name: 'Deleted', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'wh_002', deleted: true }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'Webhook not found.') },
            ],
          },
        ],
      },
      {
        name: 'API Keys',
        description: 'Partner API key lifecycle',
        isActive: false,
        isFavorite: false,
        rules: [
          {
            url: '/partner-keys', method: 'GET', description: 'List partner API keys',
            responses: [
              { name: 'Keys', statusCode: 200, isActive: true, latency: 60, body: list([{ id: 'pk_001', name: 'Production Key', prefix: 'pk_par_', lastUsedAt: '2025-05-01T09:00:00Z', active: true }]) },
            ],
          },
          {
            url: '/partner-keys', method: 'POST', description: 'Generate new key',
            requestBody: j({ name: 'New Integration Key', permissions: ['orders:read', 'products:read'] }),
            responses: [
              { name: 'Key Created', statusCode: 201, isActive: true, latency: 100, body: ok({ id: 'pk_002', name: 'New Integration Key', key: 'pk_par_newkey_full_value_shown_once', createdAt: '2025-05-01T00:00:00Z' }) },
            ],
          },
          {
            url: '/partner-keys/:id', method: 'DELETE', description: 'Revoke key',
            responses: [
              { name: 'Revoked', statusCode: 200, isActive: true, latency: 80, body: ok({ id: 'pk_002', revoked: true }) },
              { name: 'Not Found', statusCode: 404, isError: true, latency: 20, body: err('NOT_FOUND', 'API key not found.') },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Build DB rows from definitions ──────────────────────────────────────────

const projectRows: (typeof projects.$inferInsert)[] = [];
const collectionRows: (typeof collections.$inferInsert)[] = [];
const ruleRows: (typeof rules.$inferInsert)[] = [];
const responseRows: (typeof ruleResponses.$inferInsert)[] = [];

for (const proj of DEFS) {
  const projectId = randomUUID();
  projectRows.push({
    id: projectId,
    name: proj.name,
    description: proj.description,
    baseUrl: proj.baseUrl,
    ownerName: proj.ownerName,
    isFavorite: proj.isFavorite ?? false,
    createdAt: ts(),
    updatedAt: ts(),
  });

  for (const col of proj.collections) {
    const collectionId = randomUUID();
    collectionRows.push({
      id: collectionId,
      projectId,
      name: col.name,
      description: col.description,
      mode: 'local' as const,
      recordingStrategy: 'none' as const,
      source: 'manual' as const,
      isActive: col.isActive ?? false,
      isFavorite: col.isFavorite ?? false,
      ownerName: proj.ownerName,
      createdAt: ts(),
      updatedAt: ts(),
    });

    for (const rule of col.rules) {
      const ruleId = randomUUID();
      ruleRows.push({
        id: ruleId,
        projectId,
        collectionId,
        url: rule.url,
        requestMethod: rule.method,
        description: rule.description,
        requestBody: rule.requestBody,
        lookupHash: ruleLookupHash(rule.url, rule.method, rule.requestBody),
        passthrough: rule.passthrough ?? false,
        type: 'manual' as const,
        isFavorite: rule.isFavorite ?? false,
        isEnabled: rule.isEnabled ?? true,
        createdAt: ts(),
        updatedAt: ts(),
      });

      for (const resp of rule.responses) {
        responseRows.push({
          id: randomUUID(),
          ruleId,
          name: resp.name,
          statusCode: resp.statusCode,
          isActive: resp.isActive ?? false,
          isError: resp.isError ?? false,
          latency: resp.latency ?? 50,
          isFavorite: false,
          headers: resp.headers ? j(resp.headers) : null,
          body: resp.body,
          createdAt: ts(),
          updatedAt: ts(),
        });
      }
    }
  }
}

// ─── Mondial 2026 projects (fixed UUIDs so demo app can hard-code them) ───────

const MONDIAL_REAL_ID  = '11111111-2026-4000-8000-000000000001';
const MONDIAL_PROXY_ID = '22222222-2026-4000-8000-000000000002';

const MUNDIAL_GAMES = [
  // ── Group A: Mexico · South Africa · South Korea · Czech Republic ──────────
  { id:'g001', date:'2026-06-11', time:'19:00', group:'Group A', homeTeam:'Mexico',       awayTeam:'South Africa',  homeScore:2,    awayScore:0,    stadium:'Estadio Azteca',          city:'Mexico City'   },
  { id:'g002', date:'2026-06-11', time:'22:00', group:'Group A', homeTeam:'South Korea',  awayTeam:'Czech Republic',homeScore:2,    awayScore:1,    stadium:'Estadio Akron',           city:'Guadalajara'   },
  { id:'g003', date:'2026-06-15', time:'19:00', group:'Group A', homeTeam:'Mexico',       awayTeam:'South Korea',   homeScore:null, awayScore:null, stadium:'NRG Stadium',             city:'Houston'       },
  { id:'g004', date:'2026-06-15', time:'22:00', group:'Group A', homeTeam:'Czech Republic',awayTeam:'South Africa', homeScore:null, awayScore:null, stadium:'Mercedes-Benz Stadium',   city:'Atlanta'       },
  { id:'g005', date:'2026-06-21', time:'22:00', group:'Group A', homeTeam:'Mexico',       awayTeam:'Czech Republic',homeScore:null, awayScore:null, stadium:'AT&T Stadium',            city:'Dallas'        },
  { id:'g006', date:'2026-06-21', time:'22:00', group:'Group A', homeTeam:'South Africa', awayTeam:'South Korea',   homeScore:null, awayScore:null, stadium:'Arrowhead Stadium',       city:'Kansas City'   },
  // ── Group B: Canada · Bosnia and Herzegovina · Qatar · Switzerland ──────────
  { id:'g007', date:'2026-06-12', time:'16:00', group:'Group B', homeTeam:'Canada',       awayTeam:'Bosnia and Herzegovina', homeScore:1, awayScore:1, stadium:'BMO Field',            city:'Toronto'       },
  { id:'g008', date:'2026-06-12', time:'22:00', group:'Group B', homeTeam:'Qatar',        awayTeam:'Switzerland',   homeScore:null, awayScore:null, stadium:'Lumen Field',             city:'Seattle'       },
  { id:'g009', date:'2026-06-17', time:'16:00', group:'Group B', homeTeam:'Canada',       awayTeam:'Qatar',         homeScore:null, awayScore:null, stadium:'BC Place',                city:'Vancouver'     },
  { id:'g010', date:'2026-06-17', time:'22:00', group:'Group B', homeTeam:'Switzerland',  awayTeam:'Bosnia and Herzegovina', homeScore:null, awayScore:null, stadium:'Gillette Stadium', city:'Boston'       },
  { id:'g011', date:'2026-06-22', time:'22:00', group:'Group B', homeTeam:'Canada',       awayTeam:'Switzerland',   homeScore:null, awayScore:null, stadium:'Lincoln Financial Field', city:'Philadelphia'  },
  { id:'g012', date:'2026-06-22', time:'22:00', group:'Group B', homeTeam:'Bosnia and Herzegovina', awayTeam:'Qatar', homeScore:null, awayScore:null, stadium:'Hard Rock Stadium',    city:'Miami'         },
  // ── Group C: Brazil · Morocco · Haiti · Scotland ─────────────────────────────
  { id:'g013', date:'2026-06-13', time:'16:00', group:'Group C', homeTeam:'Brazil',       awayTeam:'Morocco',       homeScore:null, awayScore:null, stadium:'MetLife Stadium',         city:'New Jersey'    },
  { id:'g014', date:'2026-06-13', time:'22:00', group:'Group C', homeTeam:'Haiti',        awayTeam:'Scotland',      homeScore:null, awayScore:null, stadium:'Estadio Azteca',          city:'Mexico City'   },
  { id:'g015', date:'2026-06-18', time:'16:00', group:'Group C', homeTeam:'Brazil',       awayTeam:'Haiti',         homeScore:null, awayScore:null, stadium:'AT&T Stadium',            city:'Dallas'        },
  { id:'g016', date:'2026-06-18', time:'22:00', group:'Group C', homeTeam:'Scotland',     awayTeam:'Morocco',       homeScore:null, awayScore:null, stadium:'NRG Stadium',             city:'Houston'       },
  { id:'g017', date:'2026-06-23', time:'22:00', group:'Group C', homeTeam:'Brazil',       awayTeam:'Scotland',      homeScore:null, awayScore:null, stadium:"Levi's Stadium",          city:'San Francisco' },
  { id:'g018', date:'2026-06-23', time:'22:00', group:'Group C', homeTeam:'Morocco',      awayTeam:'Haiti',         homeScore:null, awayScore:null, stadium:'BC Place',                city:'Vancouver'     },
  // ── Group D: USA · Paraguay · Australia · Turkey ──────────────────────────────
  { id:'g019', date:'2026-06-12', time:'19:00', group:'Group D', homeTeam:'USA',          awayTeam:'Paraguay',      homeScore:null, awayScore:null, stadium:'SoFi Stadium',            city:'Los Angeles'   },
  { id:'g020', date:'2026-06-13', time:'19:00', group:'Group D', homeTeam:'Australia',    awayTeam:'Turkey',        homeScore:null, awayScore:null, stadium:'Arrowhead Stadium',       city:'Kansas City'   },
  { id:'g021', date:'2026-06-17', time:'19:00', group:'Group D', homeTeam:'USA',          awayTeam:'Australia',     homeScore:null, awayScore:null, stadium:'Gillette Stadium',        city:'Boston'        },
  { id:'g022', date:'2026-06-18', time:'19:00', group:'Group D', homeTeam:'Turkey',       awayTeam:'Paraguay',      homeScore:null, awayScore:null, stadium:'Estadio Akron',           city:'Guadalajara'   },
  { id:'g023', date:'2026-06-22', time:'19:00', group:'Group D', homeTeam:'USA',          awayTeam:'Turkey',        homeScore:null, awayScore:null, stadium:'MetLife Stadium',         city:'New Jersey'    },
  { id:'g024', date:'2026-06-22', time:'19:00', group:'Group D', homeTeam:'Paraguay',     awayTeam:'Australia',     homeScore:null, awayScore:null, stadium:'AT&T Stadium',            city:'Dallas'        },
  // ── Group E: Germany · Curaçao · Côte d'Ivoire · Ecuador ─────────────────────
  { id:'g025', date:'2026-06-14', time:'16:00', group:'Group E', homeTeam:'Germany',      awayTeam:'Curaçao',       homeScore:null, awayScore:null, stadium:'Lincoln Financial Field', city:'Philadelphia'  },
  { id:'g026', date:'2026-06-14', time:'22:00', group:'Group E', homeTeam:"Côte d'Ivoire",awayTeam:'Ecuador',       homeScore:null, awayScore:null, stadium:'Hard Rock Stadium',       city:'Miami'         },
  { id:'g027', date:'2026-06-19', time:'16:00', group:'Group E', homeTeam:'Germany',      awayTeam:"Côte d'Ivoire", homeScore:null, awayScore:null, stadium:'Lumen Field',             city:'Seattle'       },
  { id:'g028', date:'2026-06-19', time:'22:00', group:'Group E', homeTeam:'Ecuador',      awayTeam:'Curaçao',       homeScore:null, awayScore:null, stadium:'Estadio Azteca',          city:'Mexico City'   },
  { id:'g029', date:'2026-06-24', time:'19:00', group:'Group E', homeTeam:'Germany',      awayTeam:'Ecuador',       homeScore:null, awayScore:null, stadium:'BC Place',                city:'Vancouver'     },
  { id:'g030', date:'2026-06-24', time:'19:00', group:'Group E', homeTeam:'Curaçao',      awayTeam:"Côte d'Ivoire", homeScore:null, awayScore:null, stadium:'NRG Stadium',             city:'Houston'       },
  // ── Group F: Netherlands · Japan · Sweden · Tunisia ──────────────────────────
  { id:'g031', date:'2026-06-14', time:'19:00', group:'Group F', homeTeam:'Netherlands',  awayTeam:'Tunisia',       homeScore:null, awayScore:null, stadium:'SoFi Stadium',            city:'Los Angeles'   },
  { id:'g032', date:'2026-06-15', time:'16:00', group:'Group F', homeTeam:'Japan',        awayTeam:'Sweden',        homeScore:null, awayScore:null, stadium:'Mercedes-Benz Stadium',   city:'Atlanta'       },
  { id:'g033', date:'2026-06-20', time:'16:00', group:'Group F', homeTeam:'Netherlands',  awayTeam:'Japan',         homeScore:null, awayScore:null, stadium:'Gillette Stadium',        city:'Boston'        },
  { id:'g034', date:'2026-06-20', time:'22:00', group:'Group F', homeTeam:'Sweden',       awayTeam:'Tunisia',       homeScore:null, awayScore:null, stadium:'Estadio Akron',           city:'Guadalajara'   },
  { id:'g035', date:'2026-06-25', time:'19:00', group:'Group F', homeTeam:'Netherlands',  awayTeam:'Sweden',        homeScore:null, awayScore:null, stadium:'AT&T Stadium',            city:'Dallas'        },
  { id:'g036', date:'2026-06-25', time:'19:00', group:'Group F', homeTeam:'Tunisia',      awayTeam:'Japan',         homeScore:null, awayScore:null, stadium:'Hard Rock Stadium',       city:'Miami'         },
  // ── Group G: Belgium · Egypt · Iran · New Zealand ────────────────────────────
  { id:'g037', date:'2026-06-15', time:'19:00', group:'Group G', homeTeam:'Belgium',      awayTeam:'Egypt',         homeScore:null, awayScore:null, stadium:'MetLife Stadium',         city:'New Jersey'    },
  { id:'g038', date:'2026-06-15', time:'22:00', group:'Group G', homeTeam:'Iran',         awayTeam:'New Zealand',   homeScore:null, awayScore:null, stadium:'Arrowhead Stadium',       city:'Kansas City'   },
  { id:'g039', date:'2026-06-20', time:'19:00', group:'Group G', homeTeam:'Belgium',      awayTeam:'Iran',          homeScore:null, awayScore:null, stadium:'Estadio Azteca',          city:'Mexico City'   },
  { id:'g040', date:'2026-06-20', time:'22:00', group:'Group G', homeTeam:'New Zealand',  awayTeam:'Egypt',         homeScore:null, awayScore:null, stadium:'Lumen Field',             city:'Seattle'       },
  { id:'g041', date:'2026-06-25', time:'22:00', group:'Group G', homeTeam:'Belgium',      awayTeam:'New Zealand',   homeScore:null, awayScore:null, stadium:'Lincoln Financial Field', city:'Philadelphia'  },
  { id:'g042', date:'2026-06-25', time:'22:00', group:'Group G', homeTeam:'Egypt',        awayTeam:'Iran',          homeScore:null, awayScore:null, stadium:"Levi's Stadium",          city:'San Francisco' },
  // ── Group H: Spain · Cabo Verde · Saudi Arabia · Uruguay ─────────────────────
  { id:'g043', date:'2026-06-16', time:'16:00', group:'Group H', homeTeam:'Spain',        awayTeam:'Cabo Verde',    homeScore:null, awayScore:null, stadium:'BC Place',                city:'Vancouver'     },
  { id:'g044', date:'2026-06-16', time:'22:00', group:'Group H', homeTeam:'Saudi Arabia', awayTeam:'Uruguay',       homeScore:null, awayScore:null, stadium:'NRG Stadium',             city:'Houston'       },
  { id:'g045', date:'2026-06-21', time:'16:00', group:'Group H', homeTeam:'Spain',        awayTeam:'Saudi Arabia',  homeScore:null, awayScore:null, stadium:'SoFi Stadium',            city:'Los Angeles'   },
  { id:'g046', date:'2026-06-21', time:'22:00', group:'Group H', homeTeam:'Uruguay',      awayTeam:'Cabo Verde',    homeScore:null, awayScore:null, stadium:'Mercedes-Benz Stadium',   city:'Atlanta'       },
  { id:'g047', date:'2026-06-26', time:'19:00', group:'Group H', homeTeam:'Spain',        awayTeam:'Uruguay',       homeScore:null, awayScore:null, stadium:'Gillette Stadium',        city:'Boston'        },
  { id:'g048', date:'2026-06-26', time:'19:00', group:'Group H', homeTeam:'Cabo Verde',   awayTeam:'Saudi Arabia',  homeScore:null, awayScore:null, stadium:'Estadio Akron',           city:'Guadalajara'   },
  // ── Group I: France · Senegal · Iraq · Norway ────────────────────────────────
  { id:'g049', date:'2026-06-16', time:'19:00', group:'Group I', homeTeam:'France',       awayTeam:'Iraq',          homeScore:null, awayScore:null, stadium:'AT&T Stadium',            city:'Dallas'        },
  { id:'g050', date:'2026-06-17', time:'16:00', group:'Group I', homeTeam:'Senegal',      awayTeam:'Norway',        homeScore:null, awayScore:null, stadium:'MetLife Stadium',         city:'New Jersey'    },
  { id:'g051', date:'2026-06-21', time:'19:00', group:'Group I', homeTeam:'France',       awayTeam:'Senegal',       homeScore:null, awayScore:null, stadium:'Lumen Field',             city:'Seattle'       },
  { id:'g052', date:'2026-06-22', time:'16:00', group:'Group I', homeTeam:'Norway',       awayTeam:'Iraq',          homeScore:null, awayScore:null, stadium:'Hard Rock Stadium',       city:'Miami'         },
  { id:'g053', date:'2026-06-26', time:'22:00', group:'Group I', homeTeam:'France',       awayTeam:'Norway',        homeScore:null, awayScore:null, stadium:'Arrowhead Stadium',       city:'Kansas City'   },
  { id:'g054', date:'2026-06-26', time:'22:00', group:'Group I', homeTeam:'Iraq',         awayTeam:'Senegal',       homeScore:null, awayScore:null, stadium:"Levi's Stadium",          city:'San Francisco' },
  // ── Group J: Argentina · Algeria · Austria · Jordan ──────────────────────────
  { id:'g055', date:'2026-06-17', time:'22:00', group:'Group J', homeTeam:'Argentina',    awayTeam:'Algeria',       homeScore:null, awayScore:null, stadium:'MetLife Stadium',         city:'New Jersey'    },
  { id:'g056', date:'2026-06-18', time:'16:00', group:'Group J', homeTeam:'Austria',      awayTeam:'Jordan',        homeScore:null, awayScore:null, stadium:'SoFi Stadium',            city:'Los Angeles'   },
  { id:'g057', date:'2026-06-22', time:'22:00', group:'Group J', homeTeam:'Argentina',    awayTeam:'Austria',       homeScore:null, awayScore:null, stadium:'AT&T Stadium',            city:'Dallas'        },
  { id:'g058', date:'2026-06-23', time:'16:00', group:'Group J', homeTeam:'Jordan',       awayTeam:'Algeria',       homeScore:null, awayScore:null, stadium:'NRG Stadium',             city:'Houston'       },
  { id:'g059', date:'2026-06-26', time:'19:00', group:'Group J', homeTeam:'Argentina',    awayTeam:'Jordan',        homeScore:null, awayScore:null, stadium:'Lincoln Financial Field', city:'Philadelphia'  },
  { id:'g060', date:'2026-06-26', time:'19:00', group:'Group J', homeTeam:'Algeria',      awayTeam:'Austria',       homeScore:null, awayScore:null, stadium:'BC Place',                city:'Vancouver'     },
  // ── Group K: Portugal · DR Congo · Uzbekistan · Colombia ─────────────────────
  { id:'g061', date:'2026-06-17', time:'19:00', group:'Group K', homeTeam:'Portugal',     awayTeam:'DR Congo',      homeScore:null, awayScore:null, stadium:'Estadio Azteca',          city:'Mexico City'   },
  { id:'g062', date:'2026-06-18', time:'22:00', group:'Group K', homeTeam:'Uzbekistan',   awayTeam:'Colombia',      homeScore:null, awayScore:null, stadium:'Estadio Akron',           city:'Guadalajara'   },
  { id:'g063', date:'2026-06-22', time:'16:00', group:'Group K', homeTeam:'Portugal',     awayTeam:'Uzbekistan',    homeScore:null, awayScore:null, stadium:'Hard Rock Stadium',       city:'Miami'         },
  { id:'g064', date:'2026-06-23', time:'22:00', group:'Group K', homeTeam:'Colombia',     awayTeam:'DR Congo',      homeScore:null, awayScore:null, stadium:'Mercedes-Benz Stadium',   city:'Atlanta'       },
  { id:'g065', date:'2026-06-27', time:'19:00', group:'Group K', homeTeam:'Portugal',     awayTeam:'Colombia',      homeScore:null, awayScore:null, stadium:'SoFi Stadium',            city:'Los Angeles'   },
  { id:'g066', date:'2026-06-27', time:'19:00', group:'Group K', homeTeam:'DR Congo',     awayTeam:'Uzbekistan',    homeScore:null, awayScore:null, stadium:'Lumen Field',             city:'Seattle'       },
  // ── Group L: England · Croatia · Ghana · Panama ───────────────────────────────
  { id:'g067', date:'2026-06-18', time:'19:00', group:'Group L', homeTeam:'England',      awayTeam:'Croatia',       homeScore:null, awayScore:null, stadium:'Gillette Stadium',        city:'Boston'        },
  { id:'g068', date:'2026-06-19', time:'16:00', group:'Group L', homeTeam:'Ghana',        awayTeam:'Panama',        homeScore:null, awayScore:null, stadium:'Arrowhead Stadium',       city:'Kansas City'   },
  { id:'g069', date:'2026-06-23', time:'19:00', group:'Group L', homeTeam:'England',      awayTeam:'Ghana',         homeScore:null, awayScore:null, stadium:'BC Place',                city:'Vancouver'     },
  { id:'g070', date:'2026-06-24', time:'22:00', group:'Group L', homeTeam:'Panama',       awayTeam:'Croatia',       homeScore:null, awayScore:null, stadium:'NRG Stadium',             city:'Houston'       },
  { id:'g071', date:'2026-06-27', time:'22:00', group:'Group L', homeTeam:'England',      awayTeam:'Panama',        homeScore:null, awayScore:null, stadium:'MetLife Stadium',         city:'New Jersey'    },
  { id:'g072', date:'2026-06-27', time:'22:00', group:'Group L', homeTeam:'Croatia',      awayTeam:'Ghana',         homeScore:null, awayScore:null, stadium:'AT&T Stadium',            city:'Dallas'        },
  // ── Round of 32 (placeholders) ───────────────────────────────────────────────
  { id:'g073', date:'2026-06-29', time:'15:00', group:'Round of 32', homeTeam:'1A', awayTeam:'3E/F/G', homeScore:null, awayScore:null, stadium:'MetLife Stadium',  city:'New Jersey'    },
  { id:'g074', date:'2026-06-29', time:'19:00', group:'Round of 32', homeTeam:'1C', awayTeam:'3A/B/D', homeScore:null, awayScore:null, stadium:'AT&T Stadium',     city:'Dallas'        },
  { id:'g075', date:'2026-06-29', time:'23:00', group:'Round of 32', homeTeam:'1B', awayTeam:'3G/H/I', homeScore:null, awayScore:null, stadium:'SoFi Stadium',     city:'Los Angeles'   },
  { id:'g076', date:'2026-06-30', time:'15:00', group:'Round of 32', homeTeam:'1D', awayTeam:'2D',     homeScore:null, awayScore:null, stadium:'Estadio Azteca',   city:'Mexico City'   },
];

const MUNDIAL_GROUPS = [
  { name:'Group A', teams:[
    { name:'South Korea',    played:1, won:1, drawn:0, lost:0, goalsFor:2, goalsAgainst:1, points:3 },
    { name:'Mexico',         played:1, won:1, drawn:0, lost:0, goalsFor:2, goalsAgainst:0, points:3 },
    { name:'Czech Republic', played:1, won:0, drawn:0, lost:1, goalsFor:1, goalsAgainst:2, points:0 },
    { name:'South Africa',   played:1, won:0, drawn:0, lost:1, goalsFor:0, goalsAgainst:2, points:0 },
  ]},
  { name:'Group B', teams:[
    { name:'Canada',                  played:1, won:0, drawn:1, lost:0, goalsFor:1, goalsAgainst:1, points:1 },
    { name:'Bosnia and Herzegovina',  played:1, won:0, drawn:1, lost:0, goalsFor:1, goalsAgainst:1, points:1 },
    { name:'Qatar',                   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Switzerland',             played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group C', teams:[
    { name:'Brazil',    played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Morocco',   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Haiti',     played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Scotland',  played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group D', teams:[
    { name:'USA',       played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Paraguay',  played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Australia', played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Turkey',    played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group E', teams:[
    { name:'Germany',       played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:"Côte d'Ivoire", played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Ecuador',       played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Curaçao',       played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group F', teams:[
    { name:'Netherlands', played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Japan',       played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Sweden',      played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Tunisia',     played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group G', teams:[
    { name:'Belgium',     played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Egypt',       played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Iran',        played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'New Zealand', played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group H', teams:[
    { name:'Spain',        played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Uruguay',      played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Saudi Arabia', played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Cabo Verde',   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group I', teams:[
    { name:'France',  played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Senegal', played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Norway',  played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Iraq',    played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group J', teams:[
    { name:'Argentina', played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Algeria',   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Austria',   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Jordan',    played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group K', teams:[
    { name:'Portugal',   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Colombia',   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'DR Congo',   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Uzbekistan', played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
  { name:'Group L', teams:[
    { name:'England',  played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Croatia',  played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Ghana',    played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
    { name:'Panama',   played:0, won:0, drawn:0, lost:0, goalsFor:0, goalsAgainst:0, points:0 },
  ]},
];

const MUNDIAL_TEAMS = [
  // Group A
  { id:'t001', name:'Mexico',                  code:'MEX', group:'Group A', confederation:'CONCACAF', rank:15 },
  { id:'t002', name:'South Africa',            code:'RSA', group:'Group A', confederation:'CAF',      rank:67 },
  { id:'t003', name:'South Korea',             code:'KOR', group:'Group A', confederation:'AFC',      rank:22 },
  { id:'t004', name:'Czech Republic',          code:'CZE', group:'Group A', confederation:'UEFA',     rank:40 },
  // Group B
  { id:'t005', name:'Canada',                  code:'CAN', group:'Group B', confederation:'CONCACAF', rank:47 },
  { id:'t006', name:'Bosnia and Herzegovina',  code:'BIH', group:'Group B', confederation:'UEFA',     rank:65 },
  { id:'t007', name:'Qatar',                   code:'QAT', group:'Group B', confederation:'AFC',      rank:37 },
  { id:'t008', name:'Switzerland',             code:'SUI', group:'Group B', confederation:'UEFA',     rank:19 },
  // Group C
  { id:'t009', name:'Brazil',                  code:'BRA', group:'Group C', confederation:'CONMEBOL', rank:5  },
  { id:'t010', name:'Morocco',                 code:'MAR', group:'Group C', confederation:'CAF',      rank:14 },
  { id:'t011', name:'Haiti',                   code:'HAI', group:'Group C', confederation:'CONCACAF', rank:83 },
  { id:'t012', name:'Scotland',                code:'SCO', group:'Group C', confederation:'UEFA',     rank:29 },
  // Group D
  { id:'t013', name:'USA',                     code:'USA', group:'Group D', confederation:'CONCACAF', rank:16 },
  { id:'t014', name:'Paraguay',                code:'PAR', group:'Group D', confederation:'CONMEBOL', rank:62 },
  { id:'t015', name:'Australia',               code:'AUS', group:'Group D', confederation:'AFC',      rank:24 },
  { id:'t016', name:'Turkey',                  code:'TUR', group:'Group D', confederation:'UEFA',     rank:26 },
  // Group E
  { id:'t017', name:'Germany',                 code:'GER', group:'Group E', confederation:'UEFA',     rank:12 },
  { id:'t018', name:'Curaçao',                 code:'CUW', group:'Group E', confederation:'CONCACAF', rank:93 },
  { id:'t019', name:"Côte d'Ivoire",           code:'CIV', group:'Group E', confederation:'CAF',      rank:44 },
  { id:'t020', name:'Ecuador',                 code:'ECU', group:'Group E', confederation:'CONMEBOL', rank:35 },
  // Group F
  { id:'t021', name:'Netherlands',             code:'NED', group:'Group F', confederation:'UEFA',     rank:8  },
  { id:'t022', name:'Japan',                   code:'JPN', group:'Group F', confederation:'AFC',      rank:18 },
  { id:'t023', name:'Sweden',                  code:'SWE', group:'Group F', confederation:'UEFA',     rank:27 },
  { id:'t024', name:'Tunisia',                 code:'TUN', group:'Group F', confederation:'CAF',      rank:55 },
  // Group G
  { id:'t025', name:'Belgium',                 code:'BEL', group:'Group G', confederation:'UEFA',     rank:3  },
  { id:'t026', name:'Egypt',                   code:'EGY', group:'Group G', confederation:'CAF',      rank:45 },
  { id:'t027', name:'Iran',                    code:'IRN', group:'Group G', confederation:'AFC',      rank:21 },
  { id:'t028', name:'New Zealand',             code:'NZL', group:'Group G', confederation:'OFC',      rank:98 },
  // Group H
  { id:'t029', name:'Spain',                   code:'ESP', group:'Group H', confederation:'UEFA',     rank:1  },
  { id:'t030', name:'Cabo Verde',              code:'CPV', group:'Group H', confederation:'CAF',      rank:89 },
  { id:'t031', name:'Saudi Arabia',            code:'KSA', group:'Group H', confederation:'AFC',      rank:56 },
  { id:'t032', name:'Uruguay',                 code:'URU', group:'Group H', confederation:'CONMEBOL', rank:17 },
  // Group I
  { id:'t033', name:'France',                  code:'FRA', group:'Group I', confederation:'UEFA',     rank:2  },
  { id:'t034', name:'Senegal',                 code:'SEN', group:'Group I', confederation:'CAF',      rank:20 },
  { id:'t035', name:'Iraq',                    code:'IRQ', group:'Group I', confederation:'AFC',      rank:58 },
  { id:'t036', name:'Norway',                  code:'NOR', group:'Group I', confederation:'UEFA',     rank:30 },
  // Group J
  { id:'t037', name:'Argentina',               code:'ARG', group:'Group J', confederation:'CONMEBOL', rank:1  },
  { id:'t038', name:'Algeria',                 code:'ALG', group:'Group J', confederation:'CAF',      rank:49 },
  { id:'t039', name:'Austria',                 code:'AUT', group:'Group J', confederation:'UEFA',     rank:25 },
  { id:'t040', name:'Jordan',                  code:'JOR', group:'Group J', confederation:'AFC',      rank:87 },
  // Group K
  { id:'t041', name:'Portugal',                code:'POR', group:'Group K', confederation:'UEFA',     rank:6  },
  { id:'t042', name:'DR Congo',                code:'COD', group:'Group K', confederation:'CAF',      rank:60 },
  { id:'t043', name:'Uzbekistan',              code:'UZB', group:'Group K', confederation:'AFC',      rank:77 },
  { id:'t044', name:'Colombia',                code:'COL', group:'Group K', confederation:'CONMEBOL', rank:30 },
  // Group L
  { id:'t045', name:'England',                 code:'ENG', group:'Group L', confederation:'UEFA',     rank:4  },
  { id:'t046', name:'Croatia',                 code:'CRO', group:'Group L', confederation:'UEFA',     rank:14 },
  { id:'t047', name:'Ghana',                   code:'GHA', group:'Group L', confederation:'CAF',      rank:66 },
  { id:'t048', name:'Panama',                  code:'PAN', group:'Group L', confederation:'CONCACAF', rank:59 },
];

// ── Project 1: Real Data (local mocks — actual game data) ─────────────────────
projectRows.push({
  id: MONDIAL_REAL_ID,
  name: 'Mondial 2026 – Real Data',
  description: 'Live World Cup 2026 data — acts as the upstream real server',
  baseUrl: 'https://api.fifa.int',
  ownerName: 'demo',
  isFavorite: true,
  createdAt: ts(),
  updatedAt: ts(),
});

const realCollId = randomUUID();
collectionRows.push({
  id: realCollId,
  projectId: MONDIAL_REAL_ID,
  name: 'Live Data',
  description: 'Full game schedule, group standings and team roster',
  mode: 'local' as const,
  recordingStrategy: 'none' as const,
  source: 'manual' as const,
  isActive: true,
  isFavorite: true,
  ownerName: 'demo',
  createdAt: ts(),
  updatedAt: ts(),
});

const gamesRuleId = randomUUID();
ruleRows.push({
  id: gamesRuleId,
  projectId: MONDIAL_REAL_ID,
  collectionId: realCollId,
  url: '/mundial/games',
  requestMethod: 'GET' as const,
  description: 'Full match schedule',
  lookupHash: ruleLookupHash('/mundial/games', 'GET', undefined),
  passthrough: false,
  type: 'manual' as const,
  isFavorite: true,
  isEnabled: true,
  createdAt: ts(),
  updatedAt: ts(),
});
responseRows.push({
  id: randomUUID(),
  ruleId: gamesRuleId,
  name: 'All Games',
  statusCode: 200,
  isActive: true,
  isError: false,
  isFavorite: false,
  latency: 60,
  body: JSON.stringify(MUNDIAL_GAMES),
  createdAt: ts(),
  updatedAt: ts(),
});

const groupsRuleId = randomUUID();
ruleRows.push({
  id: groupsRuleId,
  projectId: MONDIAL_REAL_ID,
  collectionId: realCollId,
  url: '/mundial/groups',
  requestMethod: 'GET' as const,
  description: 'Group standings',
  lookupHash: ruleLookupHash('/mundial/groups', 'GET', undefined),
  passthrough: false,
  type: 'manual' as const,
  isFavorite: false,
  isEnabled: true,
  createdAt: ts(),
  updatedAt: ts(),
});
responseRows.push({
  id: randomUUID(),
  ruleId: groupsRuleId,
  name: 'Groups & Standings',
  statusCode: 200,
  isActive: true,
  isError: false,
  isFavorite: false,
  latency: 40,
  body: JSON.stringify(MUNDIAL_GROUPS),
  createdAt: ts(),
  updatedAt: ts(),
});

const teamsRuleId = randomUUID();
ruleRows.push({
  id: teamsRuleId,
  projectId: MONDIAL_REAL_ID,
  collectionId: realCollId,
  url: '/mundial/teams',
  requestMethod: 'GET' as const,
  description: 'All participating teams',
  lookupHash: ruleLookupHash('/mundial/teams', 'GET', undefined),
  passthrough: false,
  type: 'manual' as const,
  isFavorite: false,
  isEnabled: true,
  createdAt: ts(),
  updatedAt: ts(),
});
responseRows.push({
  id: randomUUID(),
  ruleId: teamsRuleId,
  name: 'All Teams',
  statusCode: 200,
  isActive: true,
  isError: false,
  isFavorite: false,
  latency: 30,
  body: JSON.stringify(MUNDIAL_TEAMS),
  createdAt: ts(),
  updatedAt: ts(),
});

// ── Project 2: Proxy (captures responses from Project 1 at runtime) ───────────
projectRows.push({
  id: MONDIAL_PROXY_ID,
  name: 'Mondial 2026 – Proxy',
  description: 'Proxy project — forwards unknown requests to the Real Data project and records them as new rules',
  baseUrl: `http://localhost:3001/${MONDIAL_REAL_ID}`,
  ownerName: 'demo',
  isFavorite: true,
  createdAt: ts(),
  updatedAt: ts(),
});

const proxyCollId = randomUUID();
collectionRows.push({
  id: proxyCollId,
  projectId: MONDIAL_PROXY_ID,
  name: 'Proxy Recording',
  description: 'proxy mode with full recording — captured rules accumulate here over time',
  mode: 'proxy' as const,
  recordingStrategy: 'all' as const,
  source: 'recording' as const,
  isActive: true,
  isFavorite: false,
  ownerName: 'demo',
  createdAt: ts(),
  updatedAt: ts(),
});
// No initial rules — they will be created automatically when the demo app calls
// http://localhost:3001/22222222-2026-4000-8000-000000000002/mundial/games
// and the proxy forwards to the Real Data project and records the response.

// ─── Insert ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding database...');
  await db.delete(projects);

  await db.insert(projects).values(projectRows);
  console.log(`  ✓ ${projectRows.length} projects`);

  await db.insert(collections).values(collectionRows);
  console.log(`  ✓ ${collectionRows.length} collections`);

  await db.insert(rules).values(ruleRows);
  console.log(`  ✓ ${ruleRows.length} rules`);

  await db.insert(ruleResponses).values(responseRows);
  console.log(`  ✓ ${responseRows.length} responses`);

  const total = projectRows.length + collectionRows.length + ruleRows.length + responseRows.length;
  console.log(`\nTotal: ${total} items seeded.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
