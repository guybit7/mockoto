import { Component, input } from '@angular/core';
import type { Table } from '@tanstack/angular-table';

@Component({
  selector: 'mk-pagination',
  standalone: true,
  template: `
    <div class="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-border">
      <span class="text-xs text-gray-400 dark:text-zinc-600">
        Page {{ table().getState().pagination.pageIndex + 1 }} of {{ table().getPageCount() }}
        &nbsp;·&nbsp;
        {{ table().getFilteredRowModel().rows.length }} rows
      </span>

      <div class="flex items-center gap-1">
        <button
          type="button"
          (click)="table().setPageIndex(0)"
          [disabled]="!table().getCanPreviousPage()"
          class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-border dark:text-zinc-500 dark:hover:bg-surface dark:hover:text-zinc-200"
          aria-label="First page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>
          </svg>
        </button>

        <button
          type="button"
          (click)="table().previousPage()"
          [disabled]="!table().getCanPreviousPage()"
          class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-border dark:text-zinc-500 dark:hover:bg-surface dark:hover:text-zinc-200"
          aria-label="Previous page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>

        <button
          type="button"
          (click)="table().nextPage()"
          [disabled]="!table().getCanNextPage()"
          class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-border dark:text-zinc-500 dark:hover:bg-surface dark:hover:text-zinc-200"
          aria-label="Next page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>

        <button
          type="button"
          (click)="table().setPageIndex(table().getPageCount() - 1)"
          [disabled]="!table().getCanNextPage()"
          class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:border-border dark:text-zinc-500 dark:hover:bg-surface dark:hover:text-zinc-200"
          aria-label="Last page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class MkPaginationComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly table = input.required<Table<any>>();
}
