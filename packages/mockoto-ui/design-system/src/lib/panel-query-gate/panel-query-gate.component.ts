import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { LoadingSkeletonComponent } from '../loading-skeleton/loading-skeleton.component';
import { NotFoundStateComponent } from '../not-found-state/not-found-state.component';

export type PanelGateStatus = 'loading' | 'error' | 'not-found' | 'ready';

/** Renders loading / not-found / error for edit-mode panels; projects form content otherwise. */
@Component({
  selector: 'mk-panel-query-gate',
  standalone: true,
  imports: [LoadingSkeletonComponent, NotFoundStateComponent, ErrorStateComponent, ButtonComponent],
  template: `
    @switch (status()) {
      @case ('loading') {
        <div class="flex flex-col gap-4 py-2">
          <mk-loading-skeleton [count]="4" rowHeight="h-8" gap="gap-3" [bordered]="false" />
        </div>
      }
      @case ('not-found') {
        <mk-not-found-state [title]="notFoundTitle()" [subtitle]="notFoundSubtitle()">
          <mk-button size="sm" (click)="closed.emit()">Close</mk-button>
        </mk-not-found-state>
      }
      @case ('error') {
        <mk-error-state variant="page" [message]="errorMessage()">
          <mk-button size="sm" (click)="retry.emit()">Try again</mk-button>
          <mk-button size="sm" variant="secondary" (click)="closed.emit()">Close</mk-button>
        </mk-error-state>
      }
      @default {
        <ng-content />
      }
    }
  `,
})
export class PanelQueryGateComponent {
  readonly status           = input.required<PanelGateStatus>();
  readonly notFoundTitle    = input('Not found');
  readonly notFoundSubtitle = input('This item may have been deleted.');
  readonly errorMessage     = input('Failed to load.');

  readonly retry  = output<void>();
  readonly closed = output<void>();
}
