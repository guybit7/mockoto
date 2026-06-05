import { CollectionsRepository, CollectionRow } from '../repositories/collections.repository';
import { RulesRepository, RuleRow } from '../repositories/rules.repository';
import { RuleResponsesRepository, RuleResponseRow } from '../repositories/rule-responses.repository';
import { ruleLookupHash, urlMatchesPattern, patternSpecificity, canonicalJson } from '../utils/rule-hash';

// Discriminated union — every branch carries only what the caller needs.
// Business state is explicit: callers switch on `status`, no null-checking.
export type MockResolution =
  | { status: 'found'; collection: CollectionRow; rule: RuleRow; response: RuleResponseRow }
  | { status: 'no_active_collection' }
  | { status: 'no_matching_rule'; collection: CollectionRow }
  | { status: 'no_active_response'; collection: CollectionRow; rule: RuleRow }
  | { status: 'passthrough'; collection: CollectionRow; rule: RuleRow };

export class MockResolver {
  constructor(
    private readonly collectionsRepo: CollectionsRepository,
    private readonly rulesRepo: RulesRepository,
    private readonly ruleResponsesRepo: RuleResponsesRepository,
  ) {}

  async resolve(
    projectId: string,
    path: string,
    method: string,
    body: string | null,
  ): Promise<MockResolution> {
    const collection = await this.collectionsRepo.findActiveByProject(projectId);
    if (!collection) return { status: 'no_active_collection' };

    const hash = ruleLookupHash(path, method, body);
    let rule: RuleRow | null = await this.rulesRepo.findByLookup(collection.id, method, hash);

    // If the exact hash missed and the request has a body, also try the null-body hash.
    // Rules created with no requestBody filter store their hash with null body — they are
    // intended to match any incoming body, but the hash won't match unless we retry with null.
    if (!rule && body) {
      const nullBodyHash = ruleLookupHash(path, method, null);
      rule = await this.rulesRepo.findByLookup(collection.id, method, nullBodyHash);
    }

    // Fallback: try pattern matching for rules whose URL contains :param or * segments.
    // Candidates are sorted by specificity so /users/:id beats /* when both match.
    // Body filter is respected: a rule with requestBody only matches when the incoming body matches.
    if (!rule) {
      const normalizedBody = body !== null ? canonicalJson(body) : null;

      const candidates = await this.rulesRepo.findByMethodAndCollection(collection.id, method);
      const withParams = candidates
        .filter((r) => r.url.includes(':') || r.url.includes('*'))
        .sort((a, b) => patternSpecificity(b.url) - patternSpecificity(a.url));
      rule = withParams.find((r) =>
        urlMatchesPattern(r.url, path) &&
        (r.requestBody === null || r.requestBody === normalizedBody)
      ) ?? null;
    }

    if (!rule) return { status: 'no_matching_rule', collection };

    // Passthrough rules always forward to the real server regardless of stored responses.
    if (rule.passthrough) return { status: 'passthrough', collection, rule };

    const response = await this.ruleResponsesRepo.findActiveByRuleId(rule.id);
    if (!response) return { status: 'no_active_response', collection, rule };

    return { status: 'found', collection, rule, response };
  }
}
