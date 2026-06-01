import { Injectable } from '@angular/core';
import { ResourceService } from '@mockoto-ui/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import type { Collection, CreateCollectionDto, UpdateCollectionDto } from '@mockoto/shared';

const COLLECTIONS_KEY = ['collections'] as const;

@Injectable({ providedIn: 'root' })
export class CollectionsService extends ResourceService {
  collectionsQuery(projectId: () => string) {
    return injectQuery<Collection[], Error, Collection[]>(() => ({
      queryKey: [...COLLECTIONS_KEY, 'by-project', projectId()],
      queryFn:  () => this.fetch<Collection[]>(`/collections/project/${projectId()}`),
      enabled:  !!projectId(),
      select:   (data) => [...data].sort((a, b) => b.createdAt - a.createdAt),
    }));
  }

  collectionQuery(id: () => string | null) {
    return injectQuery<Collection>(() => ({
      queryKey: [...COLLECTIONS_KEY, id()],
      queryFn:  () => this.fetch<Collection>(`/collections/${id()}`),
      enabled:  !!id(),
    }));
  }

  createMutation() {
    const client = injectQueryClient();
    return injectMutation<Collection, Error, CreateCollectionDto>(() => ({
      mutationFn: (dto) => this.create<Collection>('/collections', dto),
      onSuccess: (created) => {
        client.setQueryData([...COLLECTIONS_KEY, created.id], created);
        client.setQueriesData<Collection[]>(
          { queryKey: [...COLLECTIONS_KEY, 'by-project'] },
          (prev) => prev ? [created, ...prev] : [created],
        );
      },
    }));
  }

  updateMutation() {
    const client = injectQueryClient();
    return injectMutation<Collection, Error, { id: string; dto: UpdateCollectionDto }>(() => ({
      mutationFn: ({ id, dto }) => this.modify<Collection>(`/collections/${id}`, dto),
      onSuccess: (updated, { dto }) => {
        client.setQueryData([...COLLECTIONS_KEY, updated.id], updated);
        client.setQueriesData<Collection[]>(
          { queryKey: [...COLLECTIONS_KEY, 'by-project'] },
          (prev) => prev?.map(c =>
            c.id === updated.id ? updated : dto.isActive ? { ...c, isActive: false } : c,
          ),
        );
      },
    }));
  }

  deleteMutation() {
    const client = injectQueryClient();
    return injectMutation<void, Error, string>(() => ({
      mutationFn: (id) => this.remove(`/collections/${id}`),
      onSuccess: (_data, id) => {
        client.setQueriesData<Collection[]>(
          { queryKey: [...COLLECTIONS_KEY, 'by-project'] },
          (prev) => prev?.filter(c => c.id !== id),
        );
        client.removeQueries({ queryKey: [...COLLECTIONS_KEY, id] });
      },
    }));
  }
}
