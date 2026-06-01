import { randomUUID } from 'crypto';
import { RuleResponse, CreateRuleResponseDto, UpdateRuleResponseDto } from '@mockoto/shared';
import { RuleResponsesRepository, RuleResponseRow } from '../repositories/rule-responses.repository';
import { NotFoundError } from '../errors';
import { safeParseJson, normalizeJson } from '../utils/json';

export class RuleResponsesService {
  constructor(private readonly repository: RuleResponsesRepository) {}

  private toEntity(row: RuleResponseRow): RuleResponse {
    return {
      id: row.id,
      ruleId: row.ruleId,
      name: row.name ?? undefined,
      isActive: row.isActive,
      isFavorite: row.isFavorite,
      statusCode: row.statusCode,
      headers: safeParseJson(row.headers ?? undefined),
      body: safeParseJson(row.body ?? undefined),
      isError: row.isError,
      latency: row.latency ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(): Promise<RuleResponse[]> {
    const rows = await this.repository.findAll();
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<RuleResponse> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('RuleResponse', id);
    return this.toEntity(row);
  }

  async findByRuleId(ruleId: string): Promise<RuleResponse[]> {
    const rows = await this.repository.findByRuleId(ruleId);
    return rows.map((r) => this.toEntity(r));
  }

  async create(data: CreateRuleResponseDto): Promise<RuleResponse> {
    const now = Math.floor(Date.now() / 1000);
    const insertData = {
      id: randomUUID(),
      ruleId: data.ruleId,
      name: data.name ?? null,
      isActive: data.isActive ?? false,
      isFavorite: data.isFavorite ?? false,
      statusCode: data.statusCode,
      headers: data.headers != null ? normalizeJson(data.headers) : null,
      body: data.body != null ? normalizeJson(data.body) : null,
      isError: data.isError ?? false,
      latency: data.latency ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const row = data.isActive
      ? await this.repository.exclusiveCreate(insertData)
      : await this.repository.create(insertData);
    return this.toEntity(row);
  }

  async update(id: string, data: UpdateRuleResponseDto): Promise<RuleResponse> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError('RuleResponse', id);

    const now = Math.floor(Date.now() / 1000);
    const { headers, body, isActive, ...rest } = data;
    const patch = {
      ...rest,
      ...(isActive !== undefined && { isActive }),
      ...(headers !== undefined && { headers: normalizeJson(headers) }),
      ...(body !== undefined && { body: normalizeJson(body) }),
      updatedAt: now,
    };

    if (isActive === true) {
      const row = await this.repository.exclusiveActivate(id, current.ruleId, patch);
      if (!row) throw new NotFoundError('RuleResponse', id);
      return this.toEntity(row);
    }

    const row = await this.repository.update(id, patch);
    if (!row) throw new NotFoundError('RuleResponse', id);
    return this.toEntity(row);
  }

  async delete(id: string): Promise<void> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError('RuleResponse', id);
    await this.repository.deleteAndPromote(
      id,
      current.ruleId,
      current.isActive,
      Math.floor(Date.now() / 1000),
    );
  }
}
