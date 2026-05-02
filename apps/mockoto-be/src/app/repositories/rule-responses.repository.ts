import { Column, eq } from 'drizzle-orm';
import { DB } from '../db';
import { ruleResponses } from '../db/schema';
import { BaseRepository } from './base.repository';

export type RuleResponseRow = typeof ruleResponses.$inferSelect;
export type RuleResponseInsert = typeof ruleResponses.$inferInsert;

export class RuleResponsesRepository extends BaseRepository<
  RuleResponseRow,
  RuleResponseInsert
> {
  protected readonly table = ruleResponses;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly idColumn: Column<any> = ruleResponses.id;

  constructor(db: DB) {
    super(db);
  }

  async findByRuleId(ruleId: string): Promise<RuleResponseRow[]> {
    return this.db
      .select()
      .from(ruleResponses)
      .where(eq(ruleResponses.ruleId, ruleId));
  }

  async deactivateAllByRuleId(ruleId: string): Promise<void> {
    await this.db
      .update(ruleResponses)
      .set({ isActive: false })
      .where(eq(ruleResponses.ruleId, ruleId));
  }
}
