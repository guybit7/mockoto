import { CollectionsRepository, CollectionRow } from '../repositories/collections.repository';
import { RulesRepository, RuleRow } from '../repositories/rules.repository';
import { RuleResponsesRepository, RuleResponseRow } from '../repositories/rule-responses.repository';
import { ruleLookupHash } from '../utils/rule-hash';

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
    const rule = await this.rulesRepo.findByLookup(collection.id, method, hash);
    if (!rule) return { status: 'no_matching_rule', collection };

    // Passthrough rules always forward to the real server regardless of stored responses.
    if (rule.passthrough) return { status: 'passthrough', collection, rule };

    const response = await this.ruleResponsesRepo.findActiveByRuleId(rule.id);
    if (!response) return { status: 'no_active_response', collection, rule };

    return { status: 'found', collection, rule, response };
  }
}
