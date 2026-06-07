import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import {
  ButtonComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  LoadingSkeletonComponent,
} from '@mockoto-ui/design-system';
import { DefaultPageService } from '@mockoto-ui/core';
import { ProjectsService } from '../projects.service';
import { ProjectCardComponent } from '../project-card/project-card.component';

@Component({
  selector: 'mk-projects-page',
  standalone: true,
  imports: [
    RouterOutlet,
    ButtonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingSkeletonComponent,
    ProjectCardComponent,
  ],
  template: `
    <div class="mx-auto max-w-[1440px] px-6 py-4">
      <div class="mb-4 flex justify-end">
        <mk-button size="sm" (click)="openNew()">New Project</mk-button>
      </div>

      @if (query.isPending()) {
        <mk-loading-skeleton
          [count]="8"
          rowHeight="h-[180px]"
          gap="gap-4"
          [bordered]="false"
        />
      } @else if (query.isError()) {
        <mk-error-state message="Failed to load projects." />
      } @else if (query.data()?.length === 0) {
        <mk-empty-state
          title="No projects yet"
          subtitle="Create your first project to start mocking APIs."
        >
          <svg
            slot="icon"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <mk-button class="mt-4" size="sm" (click)="openNew()">New Project</mk-button>
        </mk-empty-state>
      } @else {
        <div class="grid auto-rows-[180px] grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          @for (project of query.data(); track project.id) {
            <mk-project-card
              [project]="project"
              [updating]="updateMut.isPending()"
              [deleting]="deleteMut.isPending()"
              [isDefault]="defaultProjectId() === project.id"
              (cardClicked)="goToCollections(project.id)"
              (editClicked)="openEdit(project.id)"
              (deleteClicked)="confirmDelete(project.id)"
              (toggleFavoriteClicked)="toggleFavorite(project.id, project.isFavorite)"
            />
          }
        </div>
      }
    </div>

    <router-outlet name="panel" />
  `,
})
export class ProjectsPageComponent {
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly svc        = inject(ProjectsService);
  private readonly defaultSvc = inject(DefaultPageService);

  protected readonly query      = this.svc.projectsQuery();
  protected readonly updateMut  = this.svc.updateMutation();
  protected readonly deleteMut  = this.svc.deleteMutation();

  protected readonly defaultProjectId = computed(() => {
    const url = this.defaultSvc.pinnedUrl();
    const m = url?.match(/\/projects\/([^/?#/]+)/);
    return m?.[1] ?? null;
  });

  protected openNew(): void {
    this.router.navigate([{ outlets: { panel: ['new'] } }], {
      relativeTo: this.route,
    });
  }

  protected openEdit(id: string): void {
    this.router.navigate([{ outlets: { panel: [id] } }], {
      relativeTo: this.route,
    });
  }

  protected goToCollections(id: string): void {
    this.router.navigate(['/projects', id, 'collections']);
  }

  protected toggleFavorite(id: string, current: boolean): void {
    this.updateMut.mutate({ id, dto: { isFavorite: !current } });
  }

  protected confirmDelete(id: string): void {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    this.deleteMut.mutate(id);
  }
}
