import { randomUUID } from 'crypto';
import { Rule, CreateRuleDto, UpdateRuleDto } from '@mockoto/shared';
import { RulesRepository, RuleRow } from '../repositories/rules.repository';
import { NotFoundError, DuplicateRuleError } from '../errors';
import { safeParseJson, normalizeJson } from '../utils/json';
import { ruleLookupHash } from '../utils/rule-hash';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('UNIQUE constraint failed');
}

export class RulesService {
  constructor(private readonly repository: RulesRepository) {}

  private toEntity(row: RuleRow): Rule {
    return {
      id: row.id,
      projectId: row.projectId,
      collectionId: row.collectionId,
      url: row.url,
      requestMethod: row.requestMethod as Rule['requestMethod'],
      description: row.description ?? undefined,
      requestBody: safeParseJson(row.requestBody ?? undefined),
      lookupHash: row.lookupHash,
      passthrough: row.passthrough,
      type: (row.type as Rule['type']) ?? undefined,
      isFavorite: row.isFavorite,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(): Promise<Rule[]> {
    const rows = await this.repository.findAll();
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<Rule> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Rule', id);
    return this.toEntity(row);
  }

  async findByCollection(collectionId: string): Promise<Rule[]> {
    const rows = await this.repository.findByCollection(collectionId);
    return rows.map((r) => this.toEntity(r));
  }

  async create(data: CreateRuleDto): Promise<Rule> {
    const normalizedBody = data.requestBody != null ? normalizeJson(data.requestBody) : null;
    try {
      const row = await this.repository.create({
        id: randomUUID(),
        projectId: data.projectId,
        collectionId: data.collectionId,
        url: data.url,
        requestMethod: data.requestMethod,
        description: data.description ?? null,
        requestBody: normalizedBody,
        lookupHash: ruleLookupHash(data.url, data.requestMethod, normalizedBody),
        passthrough: data.passthrough,
        type: data.type ?? null,
        isFavorite: data.isFavorite ?? false,
        isEnabled: data.isEnabled,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });
      return this.toEntity(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new DuplicateRuleError();
      throw err;
    }
  }

  async update(id: string, data: UpdateRuleDto): Promise<Rule> {
    const hashFieldsChanged =
      data.url !== undefined || data.requestMethod !== undefined || data.requestBody !== undefined;

    let lookupHash: string | undefined;
    let normalizedBody: string | null | undefined;

    if (hashFieldsChanged) {
      const current = await this.repository.findById(id);
      if (!current) throw new NotFoundError('Rule', id);

      const url = data.url ?? current.url;
      const requestMethod = data.requestMethod ?? current.requestMethod;
      normalizedBody =
        data.requestBody !== undefined ? normalizeJson(data.requestBody) : current.requestBody;
      lookupHash = ruleLookupHash(url, requestMethod, normalizedBody);
    }

    try {
      const row = await this.repository.update(id, {
        ...data,
        ...(normalizedBody !== undefined && { requestBody: normalizedBody }),
        ...(lookupHash && { lookupHash }),
        updatedAt: Math.floor(Date.now() / 1000),
      });
      if (!row) throw new NotFoundError('Rule', id);
      return this.toEntity(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new DuplicateRuleError();
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError('Rule', id);
  }
}
