import { randomUUID } from 'crypto';
import { RecordingStrategy } from '@mockoto/shared';
import { RulesRepository, RuleInsert } from '../repositories/rules.repository';
import { RuleResponsesRepository } from '../repositories/rule-responses.repository';
import { normalizeJson } from '../utils/json';
import { ruleLookupHash } from '../utils/rule-hash';
import { ForwardResult } from './request-forwarder';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('UNIQUE constraint failed');
}

export type RecordContext = {
  projectId: string;
  collectionId: string;
  path: string;
  method: string;
  body: string | null;
  result: ForwardResult;
};

export class ResponseRecorder {
  constructor(
    private readonly rulesRepo: RulesRepository,
    private readonly ruleResponsesRepo: RuleResponsesRepository,
  ) {}

  shouldRecord(strategy: RecordingStrategy, statusCode: number): boolean {
    switch (strategy) {
      case 'none':    return false;
      case 'all':     return true;
      case 'success': return statusCode < 400;
      case 'error':   return statusCode >= 400;
    }
  }

  async record(ctx: RecordContext): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const normalizedBody = ctx.body ? normalizeJson(ctx.body) : null;
    const hash = ruleLookupHash(ctx.path, ctx.method, normalizedBody);

    let ruleId: string;
    try {
      const newRuleId = randomUUID();
      await this.rulesRepo.create({
        id: newRuleId,
        projectId: ctx.projectId,
        collectionId: ctx.collectionId,
        url: ctx.path,
        requestMethod: ctx.method as RuleInsert['requestMethod'],
        description: null,
        requestBody: normalizedBody,
        lookupHash: hash,
        passthrough: false,
        type: 'recorded',
        isFavorite: false,
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      });
      ruleId = newRuleId;
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      // Rule already recorded; resolve its id to attach the new response.
      const existing = await this.rulesRepo.findByLookup(ctx.collectionId, ctx.method, hash);
      if (!existing) return;
      ruleId = existing.id;
    }

    const existingResponses = await this.ruleResponsesRepo.findByRuleId(ruleId);
    const isFirst = existingResponses.length === 0;

    await this.ruleResponsesRepo.create({
      id: randomUUID(),
      ruleId,
      name: 'recorded',
      isActive: isFirst,
      isFavorite: false,
      statusCode: ctx.result.statusCode,
      headers:
        Object.keys(ctx.result.headers).length > 0
          ? JSON.stringify(ctx.result.headers)
          : null,
      body: ctx.result.body || null,
      isError: ctx.result.statusCode >= 400,
      latency: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}
