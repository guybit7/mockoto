import { Injectable } from '@angular/core';
import { ResourceService } from '@mockoto-ui/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import type { Project, CreateProjectDto, UpdateProjectDto } from '@mockoto/shared';

const PROJECTS_KEY = ['projects'] as const;

@Injectable({ providedIn: 'root' })
export class ProjectsService extends ResourceService {
  projectsQuery() {
    return injectQuery<Project[]>(() => ({
      queryKey: [...PROJECTS_KEY],
      queryFn:  () => this.fetch<Project[]>('/projects'),
    }));
  }

  projectQuery(id: () => string | null) {
    return injectQuery<Project>(() => ({
      queryKey: [...PROJECTS_KEY, id()],
      queryFn:  () => this.fetch<Project>(`/projects/${id()}`),
      enabled:  !!id(),
    }));
  }

  createMutation() {
    const client = injectQueryClient();
    return injectMutation<Project, Error, CreateProjectDto>(() => ({
      mutationFn: (dto) => this.create<Project>('/projects', dto),
      onSuccess:  () => client.invalidateQueries({ queryKey: [...PROJECTS_KEY] }),
    }));
  }

  updateMutation() {
    const client = injectQueryClient();
    return injectMutation<Project, Error, { id: string; dto: UpdateProjectDto }>(() => ({
      mutationFn: ({ id, dto }) => this.modify<Project>(`/projects/${id}`, dto),
      onSuccess:  () => client.invalidateQueries({ queryKey: [...PROJECTS_KEY] }),
    }));
  }

  deleteMutation() {
    const client = injectQueryClient();
    return injectMutation<void, Error, string>(() => ({
      mutationFn: (id) => this.remove(`/projects/${id}`),
      onSuccess:  () => client.invalidateQueries({ queryKey: [...PROJECTS_KEY] }),
    }));
  }
}
