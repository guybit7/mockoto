import { Injectable } from '@angular/core';
import { ResourceService } from '@mockoto-ui/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import type { RuleResponse, CreateRuleResponseDto, UpdateRuleResponseDto } from '@mockoto/shared';

const RESPONSES_KEY = ['responses'] as const;

@Injectable({ providedIn: 'root' })
export class ResponsesService extends ResourceService {
  responsesQuery(ruleId: () => string | null) {
    return injectQuery<RuleResponse[]>(() => ({
      queryKey: [...RESPONSES_KEY, 'by-rule', ruleId()],
      queryFn:  () => this.fetch<RuleResponse[]>(`/rule-responses/rule/${ruleId()}`),
      enabled:  !!ruleId(),
    }));
  }

  responseQuery(id: () => string | null) {
    return injectQuery<RuleResponse>(() => ({
      queryKey: [...RESPONSES_KEY, id()],
      queryFn:  () => this.fetch<RuleResponse>(`/rule-responses/${id()}`),
      enabled:  !!id(),
      staleTime: 30_000,
    }));
  }

  createMutation() {
    const client = injectQueryClient();
    return injectMutation<RuleResponse, Error, CreateRuleResponseDto>(() => ({
      mutationFn: (dto) => this.create<RuleResponse>('/rule-responses', dto),
      onSuccess: (created) => {
        client.setQueryData([...RESPONSES_KEY, created.id], created);
        client.setQueryData<RuleResponse[]>(
          [...RESPONSES_KEY, 'by-rule', created.ruleId],
          (prev) => prev ? [...prev, created] : [created],
        );
      },
    }));
  }

  updateMutation() {
    const client = injectQueryClient();
    return injectMutation<RuleResponse, Error, { id: string; dto: UpdateRuleResponseDto }>(() => ({
      mutationFn: ({ id, dto }) => this.modify<RuleResponse>(`/rule-responses/${id}`, dto),
      onSuccess: (updated) => {
        client.setQueryData([...RESPONSES_KEY, updated.id], updated);
        client.setQueryData<RuleResponse[]>(
          [...RESPONSES_KEY, 'by-rule', updated.ruleId],
          (prev) => prev?.map(r => r.id === updated.id ? updated : r) ?? [updated],
        );
      },
    }));
  }

  deleteMutation() {
    const client = injectQueryClient();
    return injectMutation<void, Error, string>(() => ({
      mutationFn: (id) => this.remove(`/rule-responses/${id}`),
      onSuccess: (_data, id) => {
        client.setQueriesData<RuleResponse[]>(
          { queryKey: [...RESPONSES_KEY, 'by-rule'] },
          (prev) => prev?.filter(r => r.id !== id),
        );
        client.removeQueries({ queryKey: [...RESPONSES_KEY, id] });
      },
    }));
  }

  setActiveMutation() {
    const client = injectQueryClient();
    return injectMutation<RuleResponse, Error, string>(() => ({
      mutationFn: (id) => this.modify<RuleResponse>(`/rule-responses/${id}`, { isActive: true }),
      onSuccess: (updated) => {
        client.setQueryData([...RESPONSES_KEY, updated.id], updated);
        client.setQueryData<RuleResponse[]>(
          [...RESPONSES_KEY, 'by-rule', updated.ruleId],
          (prev) => prev?.map(r => ({ ...r, isActive: r.id === updated.id })) ?? [updated],
        );
      },
    }));
  }
}
