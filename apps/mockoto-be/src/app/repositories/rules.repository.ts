import { Column, eq, and } from 'drizzle-orm';
import { DB } from '../db';
import { rules } from '../db/schema';
import { BaseRepository } from './base.repository';

export type RuleRow = typeof rules.$inferSelect;
export type RuleInsert = typeof rules.$inferInsert;

export class RulesRepository extends BaseRepository<RuleRow, RuleInsert> {
  protected readonly table = rules;
  protected readonly idColumn: Column<any> = rules.id;

  constructor(db: DB) {
    super(db);
  }

  async findByLookup(
    collectionId: string,
    method: string,
    lookupHash: string,
  ): Promise<RuleRow | null> {
    const rows = await this.db
      .select()
      .from(this.table)
      .where(
        and(
          eq(this.table.collectionId, collectionId),
          eq(this.table.requestMethod, method),
          eq(this.table.lookupHash, lookupHash),
          eq(this.table.isEnabled, true),
        ),
      );

    return rows[0] ?? null;
  }
}
