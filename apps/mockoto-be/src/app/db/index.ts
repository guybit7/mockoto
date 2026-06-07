import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import * as schema from './schema';

const defaultDbDir =
  process.env.NODE_ENV === 'production'
    ? path.join(os.homedir(), '.mockoto', 'data')
    : path.join(process.cwd(), 'apps', 'mockoto-be', 'data');

const dbDir = process.env.MOCKOTO_DATA_DIR ?? defaultDbDir;
fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(path.join(dbDir, 'mockoto.db'));

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle(sqlite, { schema });

export const sqliteDb = sqlite;

export type DB = typeof db;
export type SQLiteDB = typeof sqlite;
