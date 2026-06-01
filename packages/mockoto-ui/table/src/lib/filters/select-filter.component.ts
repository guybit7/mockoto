import { Component, input } from '@angular/core';
import type { Column } from '@tanstack/angular-table';

export interface SelectFilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'mk-select-filter',
  standalone: true,
  template: `
    <select
      [value]="column().getFilterValue() ?? ''"
      (change)="column().setFilterValue(asSelect($event).value || undefined)"
      class="h-7 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/15 dark:border-border dark:bg-bg dark:text-zinc-300 dark:focus:border-accent dark:focus:ring-accent/15"
    >
      <option value="">{{ placeholder() }}</option>
      @for (opt of options(); track opt.value) {
        <option [value]="opt.value">{{ opt.label }}</option>
      }
    </select>
  `,
})
export class MkSelectFilterComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly column = input.required<Column<any, any>>();
  readonly options = input<SelectFilterOption[]>([]);
  readonly placeholder = input('All');

  protected asSelect(e: Event): HTMLSelectElement {
    return e.target as HTMLSelectElement;
  }
}
