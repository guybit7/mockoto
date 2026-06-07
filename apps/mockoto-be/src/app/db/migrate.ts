import type { Database } from 'better-sqlite3';

export function migrateDb(db: Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    -- =========================
    -- PROJECTS
    -- =========================
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      base_url TEXT NOT NULL UNIQUE,
      logo_base64 TEXT,
      logo_url TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      owner_name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_projects_base_url ON projects(base_url);

    -- =========================
    -- COLLECTIONS
    -- =========================
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      mode TEXT NOT NULL DEFAULT 'local',
      recording_strategy TEXT NOT NULL DEFAULT 'none',
      source TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      owner_name TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),

      CHECK(mode IN ('local','proxy')),
      CHECK(recording_strategy IN ('none','all','success','error')),
      CHECK(source IN ('manual','recording','har','agent')),
      CHECK(is_active IN (0,1))
    );

    CREATE INDEX IF NOT EXISTS idx_collections_project ON collections(project_id);
    CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(project_id, is_active);

    -- =========================
    -- RULES
    -- =========================
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE ON UPDATE CASCADE,
      url TEXT NOT NULL,
      request_method TEXT NOT NULL,
      description TEXT,
      request_body TEXT,
      lookup_hash TEXT NOT NULL,
      passthrough INTEGER NOT NULL DEFAULT 0,
      type TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),

      CHECK(request_method IN ('GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS')),
      CHECK(type IN ('manual','recorded')),
      CHECK(passthrough IN (0,1)),
      CHECK(is_enabled IN (0,1))
    );

    CREATE INDEX IF NOT EXISTS idx_rules_collection ON rules(collection_id);
    CREATE INDEX IF NOT EXISTS idx_rules_project ON rules(project_id);

    CREATE INDEX IF NOT EXISTS idx_rules_lookup 
      ON rules(collection_id, request_method, lookup_hash, is_enabled);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_unique 
      ON rules(collection_id, lookup_hash);

    -- =========================
    -- RULE RESPONSES
    -- =========================
    CREATE TABLE IF NOT EXISTS rule_responses (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL REFERENCES rules(id) ON DELETE CASCADE ON UPDATE CASCADE,
      name TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      status_code INTEGER NOT NULL DEFAULT 200,
      headers TEXT,
      body TEXT,
      is_error INTEGER NOT NULL DEFAULT 0,
      latency INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),

      CHECK(is_active IN (0,1)),
      CHECK(is_error IN (0,1)),
      CHECK(status_code >= 100 AND status_code <= 599)
    );

    CREATE INDEX IF NOT EXISTS idx_rule_responses_rule
      ON rule_responses(rule_id);

    CREATE INDEX IF NOT EXISTS idx_rule_responses_active
      ON rule_responses(rule_id, is_active);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_rule_active_unique
      ON rule_responses(rule_id)
      WHERE is_active = 1;
  `);
}

export function runMigrations() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { sqliteDb } = require('./index') as typeof import('./index');
  migrateDb(sqliteDb);
}
