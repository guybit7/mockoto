import { randomUUID } from 'crypto';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Project, CreateProjectDto, UpdateProjectDto } from '@mockoto/shared';
import { ProjectsRepository, ProjectRow } from '../repositories/projects.repository';
import { BaseService, NotFoundError } from './base.service';

export class ProjectsService extends BaseService<
  Project,
  ProjectRow,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectsRepository
> {
  protected readonly entityName = 'Project';

  constructor(repository: ProjectsRepository) {
    super(repository);
  }

  protected toEntity(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      description: row.description ?? undefined,
      baseUrl: row.baseUrl,
      logoBase64: row.logoBase64 ?? undefined,
      logoUrl: row.logoUrl ?? undefined,
      ownerName: row.ownerName ?? undefined,
    };
  }

  async create(data: CreateProjectDto): Promise<Project> {
    const now = Math.floor(Date.now() / 1000);
    const row = await this.repository.create({
      id: randomUUID(),
      name: data.name,
      description: data.description ?? null,
      baseUrl: data.baseUrl,
      logoBase64: data.logoBase64 ?? null,
      logoUrl: data.logoUrl ?? null,
      ownerName: data.ownerName ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateProjectDto): Promise<Project> {
    const updatedRow = await this.repository.update(id, {
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
    });
    if (!updatedRow) throw new NotFoundError(this.entityName, id);
    return this.toEntity(updatedRow);
  }
}
