import { Component, input } from '@angular/core';
import { FlexRenderDirective, type Table } from '@tanstack/angular-table';

@Component({
  selector: 'mk-table',
  standalone: true,
  imports: [FlexRenderDirective],
  template: `
    <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-border">
      <table class="w-full">
        <thead>
          @for (headerGroup of table().getHeaderGroups(); track headerGroup.id) {
            <tr class="border-b border-gray-100 bg-gray-50/50 dark:border-border dark:bg-white/[0.01]">
              @for (header of headerGroup.headers; track header.id) {
                <th
                  [attr.colspan]="header.colSpan"
                  class="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-zinc-500"
                >
                  @if (!header.isPlaceholder) {
                    <ng-container *flexRender="header.column.columnDef.header; props: header.getContext()" />
                  }
                </th>
              }
            </tr>
          }
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white dark:divide-border dark:bg-surface">
          @if (table().getRowModel().rows.length === 0) {
            <tr>
              <td
                [attr.colspan]="table().getVisibleLeafColumns().length"
                class="px-4 py-16 text-center text-sm text-gray-400 dark:text-zinc-600"
              >
                {{ emptyMessage() }}
              </td>
            </tr>
          } @else {
            @for (row of table().getRowModel().rows; track row.id) {
              <tr class="group transition-colors hover:bg-gray-50 dark:hover:bg-white/2">
                @for (cell of row.getVisibleCells(); track cell.id) {
                  <td class="px-4 py-3 text-sm text-gray-800 dark:text-zinc-200">
                    <ng-container *flexRender="cell.column.columnDef.cell; props: cell.getContext()" />
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class MkTableComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly table = input.required<Table<any>>();
  readonly emptyMessage = input('No data');
}
