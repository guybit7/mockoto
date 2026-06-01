import { Component, input } from '@angular/core';

/**
 * Two variants:
 *  - 'inline'  (default) — compact red banner for inline query errors
 *  - 'page'             — centered, icon-led, action-slot for page-level failures
 */
@Component({
  selector: 'mk-error-state',
  standalone: true,
  template: `
    @if (variant() === 'page') {
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
               class="text-red-400 dark:text-red-500" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <p class="text-sm font-semibold text-gray-900 dark:text-zinc-100">{{ title() }}</p>
        @if (message()) {
          <p class="mt-1 max-w-xs text-xs text-gray-500 dark:text-zinc-500">{{ message() }}</p>
        }
        <div class="mt-4 flex items-center gap-2">
          <ng-content />
        </div>
      </div>
    } @else {
      <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400">
        {{ message() }}
      </div>
    }
  `,
})
export class ErrorStateComponent {
  readonly variant = input<'inline' | 'page'>('inline');
  readonly title   = input('Something went wrong');
  readonly message = input('');
}
