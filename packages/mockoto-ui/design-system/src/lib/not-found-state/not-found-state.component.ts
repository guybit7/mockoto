import { Component, input } from '@angular/core';

/**
 * Communicates that a requested entity does not exist.
 * Distinct from ErrorStateComponent (server failure) and EmptyStateComponent (valid empty list).
 *
 * Usage:
 *   <mk-not-found-state title="Project not found" subtitle="It may have been deleted.">
 *     <mk-button (click)="back()">Back to Projects</mk-button>
 *   </mk-not-found-state>
 */
@Component({
  selector: 'mk-not-found-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-border">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
             class="text-gray-300 dark:text-zinc-600" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M11 8v4M11 16h.01"/>
        </svg>
      </div>
      <p class="text-sm font-semibold text-gray-900 dark:text-zinc-100">{{ title() }}</p>
      @if (subtitle()) {
        <p class="mt-1 text-xs text-gray-500 dark:text-zinc-500">{{ subtitle() }}</p>
      }
      <div class="mt-4 flex items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class NotFoundStateComponent {
  readonly title    = input('Not found');
  readonly subtitle = input('');
}
