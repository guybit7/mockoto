import { Component, input } from '@angular/core';
import type { Column } from '@tanstack/angular-table';

@Component({
  selector: 'mk-text-filter',
  standalone: true,
  template: `
    <div class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 transition-colors focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400/15 dark:border-border dark:bg-bg dark:focus-within:border-accent dark:focus-within:ring-accent/15">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-gray-400 dark:text-zinc-600">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input
        type="text"
        [placeholder]="placeholder()"
        [value]="column().getFilterValue() ?? ''"
        (input)="column().setFilterValue(asInput($event).value || undefined)"
        class="h-7 w-full min-w-0 bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-600"
      />
      @if (column().getFilterValue()) {
        <button
          type="button"
          (click)="column().setFilterValue(undefined)"
          class="text-gray-300 transition-colors hover:text-gray-600 dark:text-zinc-700 dark:hover:text-zinc-400"
          aria-label="Clear filter"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      }
    </div>
  `,
})
export class MkTextFilterComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly column = input.required<Column<any, any>>();
  readonly placeholder = input('Filter…');

  protected asInput(e: Event): HTMLInputElement {
    return e.target as HTMLInputElement;
  }
}
