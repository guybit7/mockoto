import { eq, and, ne } from 'drizzle-orm';
import { DB } from '../db';
import { projects } from '../db/schema';

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;

export class ProjectsRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<ProjectRow[]> {
    return this.db.select().from(projects);
  }

  async findById(id: string): Promise<ProjectRow | null> {
    const rows = await this.db.select().from(projects).where(eq(projects.id, id));
    return rows[0] ?? null;
  }

  async create(data: ProjectInsert): Promise<ProjectRow> {
    const rows = await this.db.insert(projects).values(data).returning();
    return rows[0];
  }

  async update(id: string, data: Partial<Omit<ProjectInsert, 'id'>>): Promise<ProjectRow | null> {
    const rows = await this.db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(projects).where(eq(projects.id, id)).returning();
    return rows.length > 0;
  }

  async findByBaseUrl(baseUrl: string): Promise<ProjectRow | null> {
    const rows = await this.db.select().from(projects).where(eq(projects.baseUrl, baseUrl));
    return rows[0] ?? null;
  }

  async findByName(name: string, excludeId?: string): Promise<ProjectRow | null> {
    const condition = excludeId
      ? and(eq(projects.name, name), ne(projects.id, excludeId))
      : eq(projects.name, name);
    const rows = await this.db.select().from(projects).where(condition);
    return rows[0] ?? null;
  }
}
