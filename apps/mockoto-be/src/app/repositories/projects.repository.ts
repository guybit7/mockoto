import { Column } from 'drizzle-orm';
import { DB } from '../db';
import { projects } from '../db/schema';
import { BaseRepository } from './base.repository';

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;

export class ProjectsRepository extends BaseRepository<ProjectRow, ProjectInsert> {
  protected readonly table = projects;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly idColumn: Column<any> = projects.id;

  constructor(db: DB) {
    super(db);
  }
}
