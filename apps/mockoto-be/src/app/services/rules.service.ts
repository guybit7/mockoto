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
    const hash = ruleLookupHash(data.url, data.requestMethod, normalizedBody);

    // Pre-check so the 409 can carry the existing rule — avoids relying on the DB error alone.
    const existing = await this.repository.findByLookup(data.collectionId, data.requestMethod, hash);
    if (existing) throw new DuplicateRuleError(this.toEntity(existing));

    try {
      const row = await this.repository.create({
        id: randomUUID(),
        projectId: data.projectId,
        collectionId: data.collectionId,
        url: data.url,
        requestMethod: data.requestMethod,
        description: data.description ?? null,
        requestBody: normalizedBody,
        lookupHash: hash,
        passthrough: data.passthrough,
        type: data.type ?? null,
        isFavorite: data.isFavorite ?? false,
        isEnabled: data.isEnabled,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      });
      return this.toEntity(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        try {
          const conflict = await this.repository.findByLookup(data.collectionId, data.requestMethod, hash);
          throw new DuplicateRuleError(conflict ? this.toEntity(conflict) : undefined);
        } catch (lookupErr) {
          if (lookupErr instanceof DuplicateRuleError) throw lookupErr;
          throw new DuplicateRuleError();
        }
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateRuleDto): Promise<Rule> {
    const hashFieldsChanged =
      data.url !== undefined || data.requestMethod !== undefined || data.requestBody !== undefined;

    let lookupHash: string | undefined;
    let normalizedBody: string | null | undefined;
    let currentRow: RuleRow | null = null;

    if (hashFieldsChanged) {
      currentRow = await this.repository.findById(id);
      if (!currentRow) throw new NotFoundError('Rule', id);

      const url = data.url ?? currentRow.url;
      const requestMethod = data.requestMethod ?? currentRow.requestMethod;
      normalizedBody =
        data.requestBody !== undefined ? normalizeJson(data.requestBody) : currentRow.requestBody;
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
      if (isUniqueConstraintError(err) && lookupHash && currentRow) {
        try {
          const requestMethod = data.requestMethod ?? currentRow.requestMethod;
          const conflict = await this.repository.findByLookup(currentRow.collectionId, requestMethod, lookupHash);
          throw new DuplicateRuleError(conflict ? this.toEntity(conflict) : undefined);
        } catch (lookupErr) {
          if (lookupErr instanceof DuplicateRuleError) throw lookupErr;
          throw new DuplicateRuleError();
        }
      }
      if (isUniqueConstraintError(err)) throw new DuplicateRuleError();
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError('Rule', id);
  }
}
