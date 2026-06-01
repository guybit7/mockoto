import { randomUUID } from 'crypto';
import { Project, CreateProjectDto, UpdateProjectDto } from '@mockoto/shared';
import { ProjectsRepository, ProjectRow } from '../repositories/projects.repository';
import { NotFoundError, ConflictError } from '../errors';

export class ProjectsService {
  constructor(private readonly repository: ProjectsRepository) {}

  private toEntity(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      description: row.description ?? undefined,
      baseUrl: row.baseUrl,
      logoBase64: row.logoBase64 ?? undefined,
      logoUrl: row.logoUrl ?? undefined,
      isFavorite: row.isFavorite,
      ownerName: row.ownerName ?? undefined,
    };
  }

  async findAll(): Promise<Project[]> {
    const rows = await this.repository.findAll();
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<Project> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Project', id);
    return this.toEntity(row);
  }

  async create(data: CreateProjectDto): Promise<Project> {
    if (await this.repository.findByName(data.name)) {
      throw new ConflictError(`A project named "${data.name}" already exists`);
    }
    const now = Math.floor(Date.now() / 1000);
    const row = await this.repository.create({
      id: randomUUID(),
      name: data.name,
      description: data.description ?? null,
      baseUrl: data.baseUrl,
      logoBase64: data.logoBase64 ?? null,
      logoUrl: data.logoUrl ?? null,
      isFavorite: data.isFavorite ?? false,
      ownerName: data.ownerName ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateProjectDto): Promise<Project> {
    if (data.name && (await this.repository.findByName(data.name, id))) {
      throw new ConflictError(`A project named "${data.name}" already exists`);
    }
    const row = await this.repository.update(id, {
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
    });
    if (!row) throw new NotFoundError('Project', id);
    return this.toEntity(row);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError('Project', id);
  }
}
