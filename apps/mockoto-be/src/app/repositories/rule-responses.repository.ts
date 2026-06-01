import { eq, and, ne, desc } from 'drizzle-orm';
import { DB } from '../db';
import { ruleResponses } from '../db/schema';

export type RuleResponseRow = typeof ruleResponses.$inferSelect;
export type RuleResponseInsert = typeof ruleResponses.$inferInsert;

export class RuleResponsesRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<RuleResponseRow[]> {
    return this.db.select().from(ruleResponses);
  }

  async findById(id: string): Promise<RuleResponseRow | null> {
    const rows = await this.db.select().from(ruleResponses).where(eq(ruleResponses.id, id));
    return rows[0] ?? null;
  }

  async create(data: RuleResponseInsert): Promise<RuleResponseRow> {
    const rows = await this.db.insert(ruleResponses).values(data).returning();
    return rows[0];
  }

  async update(id: string, data: Partial<Omit<RuleResponseInsert, 'id'>>): Promise<RuleResponseRow | null> {
    const rows = await this.db.update(ruleResponses).set(data).where(eq(ruleResponses.id, id)).returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(ruleResponses).where(eq(ruleResponses.id, id)).returning();
    return rows.length > 0;
  }

  async findByRuleId(ruleId: string): Promise<RuleResponseRow[]> {
    return this.db.select().from(ruleResponses).where(eq(ruleResponses.ruleId, ruleId));
  }

  async findActiveByRuleId(ruleId: string): Promise<RuleResponseRow | null> {
    const rows = await this.db
      .select()
      .from(ruleResponses)
      .where(and(eq(ruleResponses.ruleId, ruleId), eq(ruleResponses.isActive, true)));
    return rows[0] ?? null;
  }

  // Deactivates all rule responses then inserts the new one as active.
  // Uses the sync transaction API (better-sqlite3); wrapped in Promise for a
  // consistent public interface.
  async exclusiveCreate(data: RuleResponseInsert): Promise<RuleResponseRow> {
    return Promise.resolve(
      this.db.transaction((tx) => {
        tx.update(ruleResponses).set({ isActive: false }).where(eq(ruleResponses.ruleId, data.ruleId)).run();
        const rows = tx.insert(ruleResponses).values(data).returning().all() as RuleResponseRow[];
        return rows[0];
      }),
    );
  }

  // Deactivates all rule responses then marks the target as active.
  async exclusiveActivate(
    id: string,
    ruleId: string,
    data: Partial<RuleResponseInsert>,
  ): Promise<RuleResponseRow | null> {
    return Promise.resolve(
      this.db.transaction((tx) => {
        tx.update(ruleResponses).set({ isActive: false }).where(eq(ruleResponses.ruleId, ruleId)).run();
        const rows = tx
          .update(ruleResponses)
          .set({ ...data, isActive: true })
          .where(eq(ruleResponses.id, id))
          .returning()
          .all() as RuleResponseRow[];
        return rows[0] ?? null;
      }),
    );
  }

  // Deletes a response and, if it was active, promotes the most-recently
  // updated sibling to active within the same transaction.
  async deleteAndPromote(id: string, ruleId: string, wasActive: boolean, now: number): Promise<void> {
    return Promise.resolve(
      this.db.transaction((tx) => {
        tx.delete(ruleResponses).where(eq(ruleResponses.id, id)).run();
        if (wasActive) {
          const next = tx
            .select()
            .from(ruleResponses)
            .where(and(eq(ruleResponses.ruleId, ruleId), ne(ruleResponses.id, id)))
            .orderBy(desc(ruleResponses.updatedAt))
            .limit(1)
            .all() as RuleResponseRow[];
          if (next[0]) {
            tx.update(ruleResponses)
              .set({ isActive: true, updatedAt: now })
              .where(eq(ruleResponses.id, next[0].id))
              .run();
          }
        }
      }),
    );
  }
}
