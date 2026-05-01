import { sqliteDb } from './index';

export function runMigrations() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      base_url TEXT,
      logo_base64 TEXT,
      logo_url TEXT,
      owner_name TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      mode TEXT NOT NULL DEFAULT 'local',
      source TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      owner_name TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      CHECK(mode IN ('local','proxy','proxy_record','proxy_record_errors','proxy_no_record')),
      CHECK(source IN ('manual','recording','har','agent'))
    );

    CREATE INDEX IF NOT EXISTS idx_collections_project ON collections(project_id);
    CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(project_id, is_active);

    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      description TEXT,
      request_body TEXT,
      response TEXT,
      error TEXT,
      latency INTEGER,
      passthrough INTEGER NOT NULL DEFAULT 0,
      type TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      CHECK(method IN ('GET','POST','PUT','DELETE','PATCH')),
      CHECK(type IN ('manual','recorded'))
    );

    CREATE INDEX IF NOT EXISTS idx_rules_collection ON rules(collection_id);
    CREATE INDEX IF NOT EXISTS idx_rules_project ON rules(project_id);
    CREATE INDEX IF NOT EXISTS idx_rules_lookup ON rules(collection_id, url, method, is_enabled);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_rules_unique
      ON rules(collection_id, url, method, IFNULL(request_body, ''));
  `);
}
