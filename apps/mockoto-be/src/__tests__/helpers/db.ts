import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../app/db/schema';
import { migrateDb } from '../../app/db/migrate';
import type { DB } from '../../app/db';

export function createTestDb(): DB {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  migrateDb(sqlite);
  return drizzle(sqlite, { schema });
}
