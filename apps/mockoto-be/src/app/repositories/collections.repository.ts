import { asc, eq, and, ne } from 'drizzle-orm';
import { DB } from '../db';
import { collections } from '../db/schema';

export type CollectionRow = typeof collections.$inferSelect;
export type CollectionInsert = typeof collections.$inferInsert;

export class CollectionsRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<CollectionRow[]> {
    return this.db.select().from(collections);
  }

  async findById(id: string): Promise<CollectionRow | null> {
    const rows = await this.db.select().from(collections).where(eq(collections.id, id));
    return rows[0] ?? null;
  }

  async create(data: CollectionInsert): Promise<CollectionRow> {
    const rows = await this.db.insert(collections).values(data).returning();
    return rows[0];
  }

  async update(id: string, data: Partial<Omit<CollectionInsert, 'id'>>): Promise<CollectionRow | null> {
    const rows = await this.db.update(collections).set(data).where(eq(collections.id, id)).returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(collections).where(eq(collections.id, id)).returning();
    return rows.length > 0;
  }

  async findByProject(projectId: string): Promise<CollectionRow[]> {
    return this.db
      .select()
      .from(collections)
      .where(eq(collections.projectId, projectId))
      .orderBy(asc(collections.createdAt), asc(collections.id));
  }

  async findActiveByProject(projectId: string): Promise<CollectionRow | null> {
    const rows = await this.db
      .select()
      .from(collections)
      .where(and(eq(collections.projectId, projectId), eq(collections.isActive, true)));
    return rows[0] ?? null;
  }

  async findByNameInProject(
    projectId: string,
    name: string,
    excludeId?: string,
  ): Promise<CollectionRow | null> {
    const condition = excludeId
      ? and(eq(collections.projectId, projectId), eq(collections.name, name), ne(collections.id, excludeId))
      : and(eq(collections.projectId, projectId), eq(collections.name, name));
    const rows = await this.db.select().from(collections).where(condition);
    return rows[0] ?? null;
  }

  // Deactivates all project collections then inserts the new one as active.
  // Uses the sync transaction API (better-sqlite3); wrapped in Promise for a
  // consistent public interface.
  async exclusiveCreate(data: CollectionInsert): Promise<CollectionRow> {
    return Promise.resolve(
      this.db.transaction((tx) => {
        tx.update(collections).set({ isActive: false }).where(eq(collections.projectId, data.projectId)).run();
        const rows = tx.insert(collections).values(data).returning().all() as CollectionRow[];
        return rows[0];
      }),
    );
  }

  // Deactivates all project collections then marks the target as active.
  async exclusiveActivate(
    id: string,
    projectId: string,
    data: Partial<CollectionInsert>,
  ): Promise<CollectionRow | null> {
    return Promise.resolve(
      this.db.transaction((tx) => {
        tx.update(collections).set({ isActive: false }).where(eq(collections.projectId, projectId)).run();
        const rows = tx
          .update(collections)
          .set({ ...data, isActive: true })
          .where(eq(collections.id, id))
          .returning()
          .all() as CollectionRow[];
        return rows[0] ?? null;
      }),
    );
  }
}
