import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import {
  ButtonComponent,
  ErrorStateComponent,
  LoadingSkeletonComponent,
  NotFoundStateComponent,
} from '@mockoto-ui/design-system';
import { queryViewStatus } from '@mockoto-ui/core';
import { ProjectsService } from '../projects.service';

/**
 * Resolves the project entity before rendering child routes.
 * Project not-found replaces the entire workspace (per context-preservation rules).
 */
@Component({
  selector: 'mk-project-workspace',
  standalone: true,
  imports: [RouterOutlet, LoadingSkeletonComponent, ErrorStateComponent, NotFoundStateComponent, ButtonComponent],
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    @switch (status()) {
      @case ('loading') {
        <div class="flex flex-1 flex-col gap-4 p-6">
          <mk-loading-skeleton [count]="1" rowHeight="h-6" [bordered]="false" />
          <mk-loading-skeleton [count]="4" rowHeight="h-10" gap="gap-2" [bordered]="false" />
        </div>
      }
      @case ('not-found') {
        <mk-not-found-state
          title="Project not found"
          subtitle="This project may have been deleted or the link is incorrect."
        >
          <mk-button size="sm" (click)="goToProjects()">Back to Projects</mk-button>
          <mk-button size="sm" variant="secondary" (click)="goHome()">Home</mk-button>
        </mk-not-found-state>
      }
      @case ('error') {
        <mk-error-state variant="page" message="Failed to load project.">
          <mk-button size="sm" (click)="projectQuery.refetch()">Try again</mk-button>
        </mk-error-state>
      }
      @default {
        <router-outlet />
      }
    }
  `,
})
export class ProjectWorkspaceComponent {
  readonly projectId = input.required<string>();

  private readonly router = inject(Router);
  private readonly projSvc = inject(ProjectsService);

  protected readonly projectQuery = this.projSvc.projectQuery(() => this.projectId());

  protected readonly status = computed(() =>
    queryViewStatus(this.projectQuery),
  );

  protected goToProjects(): void {
    this.router.navigate(['/projects']);
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
