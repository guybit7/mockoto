import { randomUUID } from 'crypto';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  RuleResponse,
  CreateRuleResponseDto,
  UpdateRuleResponseDto,
} from '@mockoto/shared';
import {
  RuleResponsesRepository,
  RuleResponseRow,
} from '../repositories/rule-responses.repository';
import { BaseService, NotFoundError } from './base.service';
import { safeParseJson, normalizeJson } from '../utils/json';

export class RuleResponsesService extends BaseService<
  RuleResponse,
  RuleResponseRow,
  CreateRuleResponseDto,
  UpdateRuleResponseDto,
  RuleResponsesRepository
> {
  protected readonly entityName = 'RuleResponse';

  constructor(repository: RuleResponsesRepository) {
    super(repository);
  }

  protected toEntity(row: RuleResponseRow): RuleResponse {
    return {
      id: row.id,
      ruleId: row.ruleId,
      name: row.name ?? undefined,
      isActive: row.isActive,
      statusCode: row.statusCode,
      headers: safeParseJson(row.headers ?? undefined),
      body: safeParseJson(row.body ?? undefined),
      isError: row.isError,
      latency: row.latency ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(data: CreateRuleResponseDto): Promise<RuleResponse> {
    const now = Math.floor(Date.now() / 1000);
    const row = await this.repository.create({
      id: randomUUID(),
      ruleId: data.ruleId,
      name: data.name ?? null,
      isActive: data.isActive ?? false,
      statusCode: data.statusCode,
      headers: data.headers != null ? normalizeJson(data.headers) : null,
      body: data.body != null ? normalizeJson(data.body) : null,
      isError: data.isError ?? false,
      latency: data.latency ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateRuleResponseDto): Promise<RuleResponse> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError(this.entityName, id);

    if (data.isActive === true) {
      await this.repository.deactivateAllByRuleId(current.ruleId);
    }

    const { headers, body, isActive, ...rest } = data;

    const updatedRow = await this.repository.update(id, {
      ...rest,
      ...(isActive !== undefined && { isActive }),
      headers: headers !== undefined ? normalizeJson(headers) : undefined,
      body: body !== undefined ? normalizeJson(body) : undefined,
      updatedAt: Math.floor(Date.now() / 1000),
    });

    if (!updatedRow) throw new NotFoundError(this.entityName, id);

    return this.toEntity(updatedRow);
  }

  async findByRuleId(ruleId: string): Promise<RuleResponse[]> {
    const rows = await this.repository.findByRuleId(ruleId);
    return rows.map((r) => this.toEntity(r));
  }
}
