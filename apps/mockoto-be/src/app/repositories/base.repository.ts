import { eq, Column } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { DB } from '../db';

export abstract class BaseRepository<
  TRow extends { id: string },
  TInsert extends object,
> {
  constructor(protected readonly db: DB) {}

  protected abstract readonly table: SQLiteTable;

  // Typed as Column (drizzle-orm base) — concrete subclasses assign the real column.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract readonly idColumn: Column<any>;

  async findAll(): Promise<TRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (this.db.select().from(this.table as any) as any);
    return rows as TRow[];
  }

  async findById(id: string): Promise<TRow | null> {
    const rows = await (
      this.db
        .select()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(this.table as any)
        .where(eq(this.idColumn, id)) as unknown as Promise<TRow[]>
    );
    return rows[0] ?? null;
  }

  async create(data: TInsert): Promise<TRow> {
    const rows = await (
      this.db
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(this.table as any)
        .values(data as Record<string, unknown>)
        .returning() as unknown as Promise<TRow[]>
    );
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<Omit<TInsert, 'id'>>,
  ): Promise<TRow | null> {
    const rows = await (
      this.db
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(this.table as any)
        .set(data as Record<string, unknown>)
        .where(eq(this.idColumn, id))
        .returning() as unknown as Promise<TRow[]>
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await (
      this.db
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .delete(this.table as any)
        .where(eq(this.idColumn, id))
        .returning() as unknown as Promise<TRow[]>
    );
    return rows.length > 0;
  }
}
