import { Column } from 'drizzle-orm';
import { DB } from '../db';
import { collections } from '../db/schema';
import { BaseRepository } from './base.repository';
import { eq, and } from 'drizzle-orm';

export type CollectionRow = typeof collections.$inferSelect;
export type CollectionInsert = typeof collections.$inferInsert;

export class CollectionsRepository extends BaseRepository<
  CollectionRow,
  CollectionInsert
> {
  protected readonly table = collections;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly idColumn: Column<any> = collections.id;

  constructor(db: DB) {
    super(db);
  }

  async findActiveByProject(projectId: string): Promise<CollectionRow | null> {
    const rows = await this.db
      .select()
      .from(this.table)
      .where(
        and(eq(this.table.projectId, projectId), eq(this.table.isActive, true)),
      );

    return rows[0] ?? null;
  }
}
