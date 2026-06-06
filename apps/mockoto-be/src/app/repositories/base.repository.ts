import { sql } from 'drizzle-orm';
import { DB } from '../db';
import { projects, collections, rules, ruleResponses } from '../db/schema';

export interface DataCounts {
  projects: number;
  collections: number;
  rules: number;
  responses: number;
}

export abstract class BaseRepository {
  constructor(protected readonly db: DB) {}

  protected async getTableCounts(): Promise<DataCounts> {
    const [p] = await this.db.select({ n: sql<number>`count(*)` }).from(projects);
    const [c] = await this.db.select({ n: sql<number>`count(*)` }).from(collections);
    const [r] = await this.db.select({ n: sql<number>`count(*)` }).from(rules);
    const [rr] = await this.db.select({ n: sql<number>`count(*)` }).from(ruleResponses);
    return { projects: p.n, collections: c.n, rules: r.n, responses: rr.n };
  }
}
