import { randomUUID } from 'crypto';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Rule, CreateRuleDto, UpdateRuleDto } from '@mockoto/shared';
import { RulesRepository, RuleRow } from '../repositories/rules.repository';
import { BaseService, NotFoundError } from './base.service';
import { safeParseJson, normalizeJson } from '../utils/json';
import { ruleLookupHash } from '../utils/rule-hash';

export class RulesService extends BaseService<
  Rule,
  RuleRow,
  CreateRuleDto,
  UpdateRuleDto,
  RulesRepository
> {
  protected readonly entityName = 'Rule';

  constructor(repository: RulesRepository) {
    super(repository);
  }

  // --------------------
  // Helpers
  // --------------------
  private now() {
    return Math.floor(Date.now() / 1000);
  }

  // --------------------
  // Mapping (DB → Entity)
  // --------------------
  protected toEntity(row: RuleRow): Rule {
    return {
      id: row.id,
      projectId: row.projectId,
      collectionId: row.collectionId,
      url: row.url,
      urlPatternType: row.urlPatternType as Rule['urlPatternType'],
      requestMethod: row.requestMethod as Rule['requestMethod'],
      description: row.description ?? undefined,
      requestBody: safeParseJson(row.requestBody ?? undefined),
      lookupHash: row.lookupHash,
      passthrough: !!row.passthrough,
      type: (row.type as Rule['type']) ?? undefined,
      isEnabled: !!row.isEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // --------------------
  // Create
  // --------------------
  async create(data: CreateRuleDto): Promise<Rule> {
    const normalizedBody =
      data.requestBody != null ? normalizeJson(data.requestBody) : null;

    try {
      const row = await this.repository.create({
        id: randomUUID(),
        projectId: data.projectId,
        collectionId: data.collectionId,
        url: data.url,
        urlPatternType: data.urlPatternType,
        requestMethod: data.requestMethod,
        description: data.description ?? null,
        requestBody: normalizedBody,
        lookupHash: ruleLookupHash(
          data.url,
          data.requestMethod,
          normalizedBody,
        ),
        passthrough: data.passthrough,
        type: data.type ?? null,
        isEnabled: data.isEnabled,
        createdAt: this.now(),
        updatedAt: this.now(),
      });

      return this.toEntity(row);
    } catch (err: any) {
      // 🔥 handle unique constraint (duplicate rule)
      if (err?.message?.includes('UNIQUE')) {
        throw new Error('Rule already exists for this request');
      }
      throw err;
    }
  }

  // --------------------
  // Update
  // --------------------

  async update(id: string, data: UpdateRuleDto): Promise<Rule> {
    const hashFieldsChanged =
      data.url !== undefined ||
      data.requestMethod !== undefined ||
      data.requestBody !== undefined;

    let lookupHash: string | undefined;
    let normalizedBody: string | null | undefined;

    if (hashFieldsChanged) {
      const current = await this.repository.findById(id);
      if (!current) throw new NotFoundError(this.entityName, id);

      const url = data.url ?? current.url;
      const requestMethod = data.requestMethod ?? current.requestMethod;

      normalizedBody =
        data.requestBody !== undefined
          ? normalizeJson(data.requestBody)
          : current.requestBody;

      lookupHash = ruleLookupHash(url, requestMethod, normalizedBody);
    } else {
      // אם לא משנים body — לא נוגעים בו
      if (data.requestBody !== undefined) {
        normalizedBody = normalizeJson(data.requestBody);
      }
    }

    try {
      const updatedRow = await this.repository.update(id, {
        ...data,
        ...(normalizedBody !== undefined && { requestBody: normalizedBody }),
        ...(lookupHash && { lookupHash }),
        updatedAt: this.now(),
      });

      if (!updatedRow) throw new NotFoundError(this.entityName, id);

      return this.toEntity(updatedRow);
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE')) {
        throw new Error('Rule update conflicts with existing rule');
      }
      throw err;
    }
  }
}
