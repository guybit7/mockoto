import { Injectable } from '@angular/core';
import { ResourceService } from '@mockoto-ui/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import type { Rule, CreateRuleDto, UpdateRuleDto } from '@mockoto/shared';

const RULES_KEY = ['rules'] as const;

@Injectable({ providedIn: 'root' })
export class RulesService extends ResourceService {
  rulesQuery(collectionId: () => string | null, enabled: () => boolean = () => true) {
    return injectQuery<Rule[]>(() => ({
      queryKey: [...RULES_KEY, 'by-collection', collectionId()],
      queryFn:  () => this.fetch<Rule[]>(`/rules/collection/${collectionId()}`),
      enabled:  !!collectionId() && enabled(),
    }));
  }

  ruleQuery(id: () => string | null) {
    return injectQuery<Rule>(() => ({
      queryKey: [...RULES_KEY, id()],
      queryFn:  () => this.fetch<Rule>(`/rules/${id()}`),
      enabled:  !!id(),
    }));
  }

  createMutation() {
    const client = injectQueryClient();
    return injectMutation<Rule, Error, CreateRuleDto>(() => ({
      mutationFn: (dto) => this.create<Rule>('/rules', dto),
      onSuccess:  () => client.invalidateQueries({ queryKey: [...RULES_KEY] }),
    }));
  }

  updateMutation() {
    const client = injectQueryClient();
    return injectMutation<Rule, Error, { id: string; dto: UpdateRuleDto }>(() => ({
      mutationFn: ({ id, dto }) => this.modify<Rule>(`/rules/${id}`, dto),
      onSuccess: (updated) => {
        client.setQueryData([...RULES_KEY, updated.id], updated);
        client.setQueryData<Rule[]>(
          [...RULES_KEY, 'by-collection', updated.collectionId],
          (prev) => prev?.map(r => r.id === updated.id ? updated : r) ?? [updated],
        );
      },
    }));
  }

  deleteMutation() {
    const client = injectQueryClient();
    return injectMutation<void, Error, string>(() => ({
      mutationFn: (id) => this.remove(`/rules/${id}`),
      onSuccess:  () => client.invalidateQueries({ queryKey: [...RULES_KEY] }),
    }));
  }
}
