import { ValidateRepository } from '../../repositories/system/validate.repository';

export interface ValidationResult {
  issues: string[];
  counts: { projects: number; collections: number; rules: number; responses: number };
}

export class ValidateService {
  constructor(private readonly repository: ValidateRepository) {}

  async validate(): Promise<ValidationResult> {
    const { counts, orphanedCollections, orphanedRules, orphanedResponses, rulesWithNoResponses } =
      await this.repository.getValidationData();

    const issues: string[] = [];
    if (orphanedCollections > 0) issues.push(`${orphanedCollections} collection(s) reference a missing project`);
    if (orphanedRules > 0) issues.push(`${orphanedRules} rule(s) reference a missing collection`);
    if (orphanedResponses > 0) issues.push(`${orphanedResponses} response(s) reference a missing rule`);
    if (rulesWithNoResponses > 0) issues.push(`${rulesWithNoResponses} rule(s) have no responses configured`);

    return { issues, counts };
  }
}
