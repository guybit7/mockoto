import { randomUUID } from 'crypto';
import { Project, CreateProjectDto, UpdateProjectDto } from '@mockoto/shared';
import { ProjectsRepository, ProjectRow } from '../repositories/projects.repository';
import { CollectionsRepository } from '../repositories/collections.repository';
import { RulesRepository } from '../repositories/rules.repository';
import { RuleResponsesRepository } from '../repositories/rule-responses.repository';
import { safeParseJson } from '../utils/json';
import { NotFoundError, ConflictError } from '../errors';

export interface ManifestRuleEntry {
  id: string;
  url: string;
  requestMethod: string;
  isEnabled: boolean;
  responseCount: number;
  activeResponse: { statusCode: number; headers: unknown; body: unknown } | null;
}

export interface ProjectManifest {
  project: Project;
  activeCollection: { id: string; name: string; mode: string } | null;
  rules: ManifestRuleEntry[];
  readinessWarnings: string[];
}

export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly collectionsRepo: CollectionsRepository,
    private readonly rulesRepo: RulesRepository,
    private readonly ruleResponsesRepo: RuleResponsesRepository,
  ) {}

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
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new ConflictError(
        `A project named "${data.name}" already exists`,
        this.toEntity(existing),
      );
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

  async getManifest(id: string): Promise<ProjectManifest> {
    const projectRow = await this.repository.findById(id);
    if (!projectRow) throw new NotFoundError('Project', id);
    const project = this.toEntity(projectRow);

    const activeCol = await this.collectionsRepo.findActiveByProject(id);
    const readinessWarnings: string[] = [];

    if (!activeCol) {
      readinessWarnings.push('No active collection — proxy will return 503');
      return { project, activeCollection: null, rules: [], readinessWarnings };
    }

    const ruleRows = await this.rulesRepo.findByCollection(activeCol.id);
    const allResponses = await this.ruleResponsesRepo.findByRuleIds(ruleRows.map((r) => r.id));
    const responsesByRuleId = new Map<string, typeof allResponses>();
    for (const resp of allResponses) {
      const list = responsesByRuleId.get(resp.ruleId) ?? [];
      list.push(resp);
      responsesByRuleId.set(resp.ruleId, list);
    }

    const rules: ManifestRuleEntry[] = ruleRows.map((rule) => {
      const responses = responsesByRuleId.get(rule.id) ?? [];
      const active = responses.find((r) => r.isActive) ?? null;

      if (rule.isEnabled && !active) {
        readinessWarnings.push(`Rule ${rule.requestMethod} ${rule.url} has no active response — proxy will return 404`);
      }

      return {
        id: rule.id,
        url: rule.url,
        requestMethod: rule.requestMethod,
        isEnabled: rule.isEnabled,
        responseCount: responses.length,
        activeResponse: active
          ? {
              statusCode: active.statusCode,
              headers: safeParseJson(active.headers ?? undefined),
              body: safeParseJson(active.body ?? undefined),
            }
          : null,
      };
    });

    return {
      project,
      activeCollection: { id: activeCol.id, name: activeCol.name, mode: activeCol.mode },
      rules,
      readinessWarnings,
    };
  }
}
