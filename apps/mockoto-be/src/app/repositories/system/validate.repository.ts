import { sql, eq, isNull } from 'drizzle-orm';
import { BaseRepository, DataCounts } from '../base.repository';
import { projects, collections, rules, ruleResponses } from '../../db/schema';

export interface ValidationData {
  counts: DataCounts;
  orphanedCollections: number;
  orphanedRules: number;
  orphanedResponses: number;
  rulesWithNoResponses: number;
}

export class ValidateRepository extends BaseRepository {
  async getValidationData(): Promise<ValidationData> {
    const counts = await this.getTableCounts();

    const [oc] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(collections)
      .leftJoin(projects, eq(projects.id, collections.projectId))
      .where(isNull(projects.id));

    const [or_] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(rules)
      .leftJoin(collections, eq(collections.id, rules.collectionId))
      .where(isNull(collections.id));

    const [orp] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(ruleResponses)
      .leftJoin(rules, eq(rules.id, ruleResponses.ruleId))
      .where(isNull(rules.id));

    const [rnr] = await this.db
      .select({ n: sql<number>`count(*)` })
      .from(rules)
      .leftJoin(ruleResponses, eq(ruleResponses.ruleId, rules.id))
      .where(isNull(ruleResponses.id));

    return {
      counts,
      orphanedCollections: oc.n,
      orphanedRules: or_.n,
      orphanedResponses: orp.n,
      rulesWithNoResponses: rnr.n,
    };
  }
}
