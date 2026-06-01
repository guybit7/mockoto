import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ---------- projects ----------
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),

  name: text('name').notNull(),
  description: text('description'),

  baseUrl: text('base_url').notNull().unique(),

  logoBase64: text('logo_base64'),
  logoUrl: text('logo_url'),

  isFavorite: integer('is_favorite', { mode: 'boolean' })
    .notNull()
    .default(false),

  ownerName: text('owner_name'),

  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s','now'))`),

  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(strftime('%s','now'))`),
});

// ---------- collections ----------
export const collections = sqliteTable(
  'collections',
  {
    id: text('id').primaryKey(),

    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),

    name: text('name').notNull(),
    description: text('description'),

    mode: text('mode').notNull().default('local'),
    recordingStrategy: text('recording_strategy').notNull().default('none'),

    source: text('source'),

    isActive: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(false),

    isFavorite: integer('is_favorite', { mode: 'boolean' })
      .notNull()
      .default(false),

    ownerName: text('owner_name'),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),

    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),
  },
  (t) => [
    check('chk_collections_mode', sql`${t.mode} IN ('local','proxy')`),
    check(
      'chk_collections_recording_strategy',
      sql`${t.recordingStrategy} IN ('none','all','success','error')`,
    ),
    check(
      'chk_collections_source',
      sql`${t.source} IN ('manual','recording','har','agent')`,
    ),
    index('idx_collections_project').on(t.projectId),
    index('idx_collections_active').on(t.projectId, t.isActive),
  ],
);

// ---------- rules ----------
export const rules = sqliteTable(
  'rules',
  {
    id: text('id').primaryKey(),

    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),

    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),

    url: text('url').notNull(),

    requestMethod: text('request_method').notNull(),

    description: text('description'),

    // optional body filter stored for display/edit; normalised in lookup_hash
    requestBody: text('request_body'),

    // SHA-256 of "<url>:<requestMethod>:<canonicalJson(requestBody)>"
    // replaces the fragile IFNULL-based unique index
    lookupHash: text('lookup_hash').notNull(),

    passthrough: integer('passthrough', { mode: 'boolean' })
      .notNull()
      .default(false),

    type: text('type'),

    isFavorite: integer('is_favorite', { mode: 'boolean' })
      .notNull()
      .default(false),

    isEnabled: integer('is_enabled', { mode: 'boolean' })
      .notNull()
      .default(true),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),

    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),
  },
  (t) => [
    check(
      'chk_rules_request_method',
      sql`${t.requestMethod} IN ('GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS')`,
    ),
    check('chk_rules_type', sql`${t.type} IN ('manual','recorded')`),
    index('idx_rules_collection').on(t.collectionId),
    index('idx_rules_project').on(t.projectId),
    index('idx_rules_lookup').on(t.collectionId, t.requestMethod, t.isEnabled),
    uniqueIndex('idx_rules_unique').on(t.collectionId, t.lookupHash),
  ],
);

// ---------- rule_responses ----------
// Each rule can have multiple named responses; exactly one should have is_active = true.
export const ruleResponses = sqliteTable(
  'rule_responses',
  {
    id: text('id').primaryKey(),

    ruleId: text('rule_id')
      .notNull()
      .references(() => rules.id, { onDelete: 'cascade', onUpdate: 'cascade' }),

    name: text('name'),

    isActive: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(false),

    isFavorite: integer('is_favorite', { mode: 'boolean' })
      .notNull()
      .default(false),

    statusCode: integer('status_code').notNull().default(200),

    headers: text('headers'),
    body: text('body'),

    isError: integer('is_error', { mode: 'boolean' }).notNull().default(false),

    latency: integer('latency'),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),

    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),
  },
  (t) => [
    index('idx_rule_responses_rule').on(t.ruleId),
    index('idx_rule_responses_active').on(t.ruleId, t.isActive),
    uniqueIndex('idx_rule_active_unique')
      .on(t.ruleId)
      .where(sql`${t.isActive} = 1`),
  ],
);
