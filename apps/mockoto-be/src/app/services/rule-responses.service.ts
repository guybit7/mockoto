import { randomUUID } from 'crypto';
import { RuleResponse, CreateRuleResponseDto, UpdateRuleResponseDto, contentTypeMime } from '@mockoto/shared';
import { RuleResponsesRepository, RuleResponseRow } from '../repositories/rule-responses.repository';
import { NotFoundError, ValidationError } from '../errors';
import { safeParseJson, normalizeJson, serializeResponseBody, parseResponseBody } from '../utils/json';

export class RuleResponsesService {
  constructor(private readonly repository: RuleResponsesRepository) {}

  private toEntity(row: RuleResponseRow): RuleResponse {
    const headers = safeParseJson(row.headers ?? undefined);
    return {
      id: row.id,
      ruleId: row.ruleId,
      name: row.name ?? undefined,
      isActive: row.isActive,
      isFavorite: row.isFavorite,
      statusCode: row.statusCode,
      headers,
      body: parseResponseBody(row.body, headers),
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
      body: data.body != null ? serializeResponseBody(data.body, data.headers) : null,
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
    const currentHeaders = safeParseJson(current.headers);
    // The content type decides how the body is stored, so it is fixed at creation.
    if (headers !== undefined && contentTypeMime(headers) !== contentTypeMime(currentHeaders)) {
      throw new ValidationError(
        `The content type of a response cannot be changed after creation (it is "${contentTypeMime(currentHeaders)}"). ` +
          'Keep the same content-type header, or create a new response.',
      );
    }
    const effectiveHeaders = headers !== undefined ? headers : currentHeaders;
    // body: null clears the stored body.
    let nextBody: string | null | undefined;
    if (body !== undefined) {
      nextBody = body === null ? null : serializeResponseBody(body, effectiveHeaders);
    }
    const patch = {
      ...rest,
      ...(isActive !== undefined && { isActive }),
      ...(headers !== undefined && { headers: normalizeJson(headers) }),
      ...(nextBody !== undefined && { body: nextBody }),
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
