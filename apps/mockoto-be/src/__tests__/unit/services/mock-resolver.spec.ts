import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockResolver } from '../../../app/services/mock-resolver';
import type { CollectionsRepository, CollectionRow } from '../../../app/repositories/collections.repository';
import type { RulesRepository, RuleRow } from '../../../app/repositories/rules.repository';
import type { RuleResponsesRepository, RuleResponseRow } from '../../../app/repositories/rule-responses.repository';
import { ruleLookupHash } from '../../../app/utils/rule-hash';

// ── Minimal row stubs ────────────────────────────────────────────────────────

function makeCollection(overrides: Partial<CollectionRow> = {}): CollectionRow {
  return {
    id: 'col-1',
    projectId: 'proj-1',
    name: 'Test Collection',
    description: null,
    mode: 'local',
    recordingStrategy: 'none',
    source: null,
    isActive: true,
    isFavorite: false,
    ownerName: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeRule(overrides: Partial<RuleRow> = {}): RuleRow {
  const url = overrides.url ?? '/api/users';
  const method = overrides.requestMethod ?? 'GET';
  const body = overrides.requestBody ?? null;
  return {
    id: 'rule-1',
    projectId: 'proj-1',
    collectionId: 'col-1',
    url,
    requestMethod: method,
    description: null,
    requestBody: body,
    lookupHash: overrides.lookupHash ?? ruleLookupHash(url, method, body),
    passthrough: false,
    type: null,
    isFavorite: false,
    isEnabled: true,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeResponse(overrides: Partial<RuleResponseRow> = {}): RuleResponseRow {
  return {
    id: 'resp-1',
    ruleId: 'rule-1',
    name: null,
    statusCode: 200,
    headers: null,
    body: '{"ok":true}',
    isActive: true,
    isFavorite: false,
    isError: false,
    latency: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeRepos(overrides: {
  collection?: CollectionRow | null;
  rule?: RuleRow | null;
  response?: RuleResponseRow | null;
  methodCandidates?: RuleRow[];
}) {
  const collectionsRepo = {
    findActiveByProject: vi.fn().mockResolvedValue(
      overrides.collection !== undefined ? overrides.collection : makeCollection(),
    ),
  } as unknown as CollectionsRepository;

  const rulesRepo = {
    findByLookup: vi.fn().mockResolvedValue(overrides.rule !== undefined ? overrides.rule : null),
    findByMethodAndCollection: vi.fn().mockResolvedValue(overrides.methodCandidates ?? []),
  } as unknown as RulesRepository;

  const ruleResponsesRepo = {
    findActiveByRuleId: vi.fn().mockResolvedValue(
      overrides.response !== undefined ? overrides.response : makeResponse(),
    ),
  } as unknown as RuleResponsesRepository;

  return { collectionsRepo, rulesRepo, ruleResponsesRepo };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MockResolver', () => {
  describe('when there is no active collection', () => {
    it('returns no_active_collection status', async () => {
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({ collection: null });
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/users', 'GET', null);

      expect(result.status).toBe('no_active_collection');
    });
  });

  describe('when an exact rule match is found', () => {
    it('returns found status with the active response', async () => {
      const rule = makeRule();
      const response = makeResponse();
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({ rule, response });
      rulesRepo.findByLookup = vi.fn().mockResolvedValue(rule);
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/users', 'GET', null);

      expect(result.status).toBe('found');
      if (result.status === 'found') {
        expect(result.rule.id).toBe(rule.id);
        expect(result.response.id).toBe(response.id);
      }
    });

    it('returns no_active_response when the rule has no active response', async () => {
      const rule = makeRule();
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({ rule, response: null });
      rulesRepo.findByLookup = vi.fn().mockResolvedValue(rule);
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/users', 'GET', null);

      expect(result.status).toBe('no_active_response');
    });
  });

  describe('when the rule is a passthrough', () => {
    it('returns passthrough status', async () => {
      const rule = makeRule({ passthrough: true });
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({ rule });
      rulesRepo.findByLookup = vi.fn().mockResolvedValue(rule);
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/users', 'GET', null);

      expect(result.status).toBe('passthrough');
    });
  });

  describe('when no rule matches', () => {
    it('returns no_matching_rule status', async () => {
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({ rule: null });
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/nonexistent', 'GET', null);

      expect(result.status).toBe('no_matching_rule');
    });
  });

  describe('null-body fallback', () => {
    it('falls back to null-body hash when exact hash misses and request has a body', async () => {
      const rule = makeRule({ requestBody: null });
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({});
      // First call (exact hash) returns null; second call (null-body hash) returns the rule
      rulesRepo.findByLookup = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(rule);
      ruleResponsesRepo.findActiveByRuleId = vi.fn().mockResolvedValue(makeResponse());
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/users', 'GET', '{"id":1}');

      expect(rulesRepo.findByLookup).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('found');
    });
  });

  describe('pattern matching fallback', () => {
    it('matches a :param pattern when exact hash misses', async () => {
      const rule = makeRule({ url: '/api/users/:id' });
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({});
      rulesRepo.findByLookup = vi.fn().mockResolvedValue(null);
      rulesRepo.findByMethodAndCollection = vi.fn().mockResolvedValue([rule]);
      ruleResponsesRepo.findActiveByRuleId = vi.fn().mockResolvedValue(makeResponse());
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/users/42', 'GET', null);

      expect(result.status).toBe('found');
    });

    it('prefers the more specific pattern when multiple patterns match', async () => {
      const specificRule = makeRule({ id: 'specific', url: '/api/users/:id' });
      const genericRule = makeRule({ id: 'generic', url: '/api/*' });
      const response = makeResponse();
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({});
      rulesRepo.findByLookup = vi.fn().mockResolvedValue(null);
      rulesRepo.findByMethodAndCollection = vi.fn().mockResolvedValue([genericRule, specificRule]);
      ruleResponsesRepo.findActiveByRuleId = vi.fn().mockResolvedValue(response);
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/users/42', 'GET', null);

      expect(result.status).toBe('found');
      if (result.status === 'found') {
        expect(result.rule.id).toBe('specific');
      }
    });

    it('respects body filter during pattern matching — rule with body does not match when body differs', async () => {
      const rule = makeRule({ url: '/api/users/:id', requestBody: '{"type":"admin"}' });
      const { collectionsRepo, rulesRepo, ruleResponsesRepo } = makeRepos({});
      rulesRepo.findByLookup = vi.fn().mockResolvedValue(null);
      rulesRepo.findByMethodAndCollection = vi.fn().mockResolvedValue([rule]);
      const resolver = new MockResolver(collectionsRepo, rulesRepo, ruleResponsesRepo);

      const result = await resolver.resolve('proj-1', '/api/users/42', 'GET', '{"type":"user"}');

      expect(result.status).toBe('no_matching_rule');
    });
  });
});
