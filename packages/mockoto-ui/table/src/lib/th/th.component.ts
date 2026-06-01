import { Component, input } from '@angular/core';
import type { Column } from '@tanstack/angular-table';

@Component({
  selector: 'mk-th',
  standalone: true,
  template: `
    <button
      type="button"
      class="flex items-center gap-1 select-none text-xs font-medium text-gray-500 dark:text-zinc-500"
      [class.hover:text-gray-700]="column().getCanSort()"
      [class.dark:hover:text-zinc-300]="column().getCanSort()"
      [class.cursor-pointer]="column().getCanSort()"
      [class.cursor-default]="!column().getCanSort()"
      (click)="column().getCanSort() && column().toggleSorting()"
    >
      {{ label() }}

      @if (column().getIsSorted() === 'asc') {
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-accent">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      } @else if (column().getIsSorted() === 'desc') {
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-accent">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      } @else if (column().getCanSort()) {
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30">
          <path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>
        </svg>
      }
    </button>
  `,
})
export class MkThComponent {
  readonly label = input.required<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly column = input.required<Column<any, any>>();
}
