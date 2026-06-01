import { eq, and, desc } from 'drizzle-orm';
import { DB } from '../db';
import { rules } from '../db/schema';

export type RuleRow = typeof rules.$inferSelect;
export type RuleInsert = typeof rules.$inferInsert;

export class RulesRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<RuleRow[]> {
    return this.db.select().from(rules);
  }

  async findById(id: string): Promise<RuleRow | null> {
    const rows = await this.db.select().from(rules).where(eq(rules.id, id));
    return rows[0] ?? null;
  }

  async create(data: RuleInsert): Promise<RuleRow> {
    const rows = await this.db.insert(rules).values(data).returning();
    return rows[0];
  }

  async update(id: string, data: Partial<Omit<RuleInsert, 'id'>>): Promise<RuleRow | null> {
    const rows = await this.db.update(rules).set(data).where(eq(rules.id, id)).returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(rules).where(eq(rules.id, id)).returning();
    return rows.length > 0;
  }

  async findByCollection(collectionId: string): Promise<RuleRow[]> {
    return this.db
      .select()
      .from(rules)
      .where(eq(rules.collectionId, collectionId))
      .orderBy(desc(rules.createdAt), desc(rules.id));
  }

  async findByLookup(
    collectionId: string,
    method: string,
    lookupHash: string,
  ): Promise<RuleRow | null> {
    const rows = await this.db
      .select()
      .from(rules)
      .where(
        and(
          eq(rules.collectionId, collectionId),
          eq(rules.requestMethod, method),
          eq(rules.lookupHash, lookupHash),
          eq(rules.isEnabled, true),
        ),
      );
    return rows[0] ?? null;
  }
}
