import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ---------- projects ----------
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),

  name: text('name').notNull(),
  description: text('description'),

  baseUrl: text('base_url'),

  logoBase64: text('logo_base64'),
  logoUrl: text('logo_url'),

  ownerName: text('owner_name'),

  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s','now'))`),

  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(strftime('%s','now'))`),
})

// ---------- collections ----------
export const collections = sqliteTable(
  'collections',
  {
    id: text('id').primaryKey(),

    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),

    mode: text('mode').notNull().default('local'),

    source: text('source'),

    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

    ownerName: text('owner_name'),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),

    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),
  },
  (t) => ({
    modeCheck: check(
      'chk_collections_mode',
      sql`${t.mode} IN ('local','proxy','proxy_record','proxy_record_errors','proxy_no_record')`
    ),
    sourceCheck: check(
      'chk_collections_source',
      sql`${t.source} IN ('manual','recording','har','agent')`
    ),
    idxProject: index('idx_collections_project').on(t.projectId),
    idxActive: index('idx_collections_active').on(t.projectId, t.isActive),
  })
)

// ---------- rules ----------
export const rules = sqliteTable(
  'rules',
  {
    id: text('id').primaryKey(),

    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),

    url: text('url').notNull(),

    method: text('method').notNull(),

    description: text('description'),

    requestBody: text('request_body'),
    response: text('response'),
    error: text('error'),

    latency: integer('latency'),

    passthrough: integer('passthrough', { mode: 'boolean' })
      .notNull()
      .default(false),

    type: text('type'),

    isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),

    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(strftime('%s','now'))`),
  },
  (t) => ({
    methodCheck: check(
      'chk_rules_method',
      sql`${t.method} IN ('GET','POST','PUT','DELETE','PATCH')`
    ),
    typeCheck: check('chk_rules_type', sql`${t.type} IN ('manual','recorded')`),
    idxCollection: index('idx_rules_collection').on(t.collectionId),
    idxProject: index('idx_rules_project').on(t.projectId),
    idxLookup: index('idx_rules_lookup').on(
      t.collectionId,
      t.url,
      t.method,
      t.isEnabled
    ),
    uniqueRule: uniqueIndex('idx_rules_unique').on(
      t.collectionId,
      t.url,
      t.method,
      sql`IFNULL(${t.requestBody}, '')`
    ),
  })
)
