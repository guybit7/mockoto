import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  createAngularTable,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/angular-table';

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    label?: string;
  }
}
import { ButtonComponent, ErrorStateComponent, LoadingSkeletonComponent } from '@mockoto-ui/design-system';
import { MkThComponent, MkTextFilterComponent, MkSelectFilterComponent, MkPaginationComponent } from '@mockoto-ui/table';
import type { Rule } from '@mockoto/shared';
import { RuleItemComponent } from '../rule-item/rule-item.component';

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  .map(m => ({ value: m, label: m }));

const STATUS_OPTIONS = [
  { value: 'true',  label: 'Enabled'  },
  { value: 'false', label: 'Disabled' },
];

const col = createColumnHelper<Rule>();

@Component({
  selector: 'mk-rule-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    ErrorStateComponent,
    LoadingSkeletonComponent,
    MkThComponent,
    MkTextFilterComponent,
    MkSelectFilterComponent,
    MkPaginationComponent,
    RuleItemComponent,
  ],
  host: { class: 'flex min-h-0 min-w-0 overflow-hidden flex-col px-6 py-4' },
  template: `
    <div class="mb-3 flex items-center justify-between">
      <h1 class="text-sm font-medium text-gray-900 dark:text-zinc-100">
        @if (collectionName()) {
          {{ collectionName() }}
          <span class="ml-1 font-normal text-gray-400 dark:text-zinc-600">rules</span>
        } @else {
          Rules
        }
      </h1>
      <mk-button size="sm" (click)="newRuleClicked.emit()">New Rule</mk-button>
    </div>

    @if (loading()) {
      <mk-loading-skeleton [count]="8" rowHeight="h-9" gap="gap-2" [bordered]="false" [inset]="true" />
    } @else if (error()) {
      <mk-error-state message="Failed to load rules." />
    } @else {

      <!-- Filter toolbar -->
      <div class="mb-2.5 flex items-center gap-1.5">
        <mk-text-filter   [column]="table.getColumn('url')!"          placeholder="Filter by URL…" />
        <mk-select-filter [column]="table.getColumn('requestMethod')!" [options]="methodOptions" placeholder="All methods" />
        <mk-select-filter [column]="table.getColumn('isEnabled')!"     [options]="statusOptions"  placeholder="All statuses" />
      </div>

      <!-- Scrollable table area -->
      <div class="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <!-- Table -->
        <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-border">
          <table class="w-full">
            <thead class="sticky top-0 z-10">
              @for (headerGroup of headerGroups(); track headerGroup.id) {
                <tr class="border-b border-gray-100 bg-gray-50/50 dark:border-border dark:bg-white/1.5">
                  @for (header of headerGroup.headers; track header.id) {
                    <th [style.width.px]="header.getSize()" class="px-3 py-2 text-left">
                      @if (!header.isPlaceholder && header.column.columnDef.meta?.label; as label) {
                        <mk-th [label]="label" [column]="header.column" />
                      }
                    </th>
                  }
                </tr>
              }
            </thead>
            <tbody class="divide-y divide-gray-100/70 bg-white dark:divide-border/60 dark:bg-surface">
              @if (tableRows().length === 0) {
                <tr>
                  <td colspan="6" class="px-4 py-14 text-center text-sm text-gray-400 dark:text-zinc-600">
                    No rules yet
                  </td>
                </tr>
              } @else {
                @for (row of tableRows(); track row.id) {
                  <tr mk-rule-item
                    [rule]="row.original"
                    [selected]="selectedRuleId() === row.original.id"
                    [updating]="updatePending()"
                    [deleting]="deletePending()"
                    (ruleClicked)="ruleSelected.emit(row.original.id)"
                    (enabledToggled)="enabledToggled.emit({ id: row.original.id, enabled: !row.original.isEnabled })"
                    (favoriteToggled)="favoriteToggled.emit({ id: row.original.id, favorite: !row.original.isFavorite })"
                    (editClicked)="editClicked.emit(row.original.id)"
                    (deleteClicked)="deleteClicked.emit(row.original.id)"
                  ></tr>
                }
              }
            </tbody>
          </table>
        </div>

        @if (showPagination()) {
          <mk-pagination [table]="table" />
        }
      </div>
    }
  `,
})
export class RuleListComponent {
  readonly rules          = input<Rule[]>([]);
  readonly loading        = input(false);
  readonly error          = input(false);
  readonly selectedRuleId = input<string | null>(null);
  readonly collectionName = input<string | null>(null);
  readonly updatePending  = input(false);
  readonly deletePending  = input(false);

  readonly newRuleClicked  = output<void>();
  readonly ruleSelected    = output<string>();
  readonly enabledToggled  = output<{ id: string; enabled: boolean }>();
  readonly favoriteToggled = output<{ id: string; favorite: boolean }>();
  readonly editClicked     = output<string>();
  readonly deleteClicked   = output<string>();

  protected readonly methodOptions = METHOD_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;

  private readonly sorting       = signal<SortingState>([]);
  private readonly columnFilters = signal<ColumnFiltersState>([]);

  protected readonly table = createAngularTable<Rule>(() => ({
    data: this.rules(),
    columns: [
      col.display({
        id: 'isFavorite',
        header: () => '',
        size: 44,
        enableSorting: false,
      }),
      col.accessor('requestMethod', {
        id: 'requestMethod',
        header: 'Method',
        meta: { label: 'Method' },
        filterFn: (row, _id, value) => row.original.requestMethod === value,
        size: 85,
      }),
      col.accessor('url', {
        header: 'Endpoint',
        meta: { label: 'Endpoint' },
        filterFn: 'includesString',
      }),
      col.display({
        id: 'passthrough',
        header: 'Type',
        meta: { label: 'Type' },
        size: 80,
        enableSorting: false,
      }),
      col.accessor('isEnabled', {
        id: 'isEnabled',
        header: 'Status',
        meta: { label: 'Status' },
        filterFn: (row, _id, value) => String(row.original.isEnabled) === value,
        size: 110,
        enableSorting: false,
      }),
      col.display({
        id: 'actions',
        header: () => '',
        size: 70,
        enableSorting: false,
      }),
    ],
    state: {
      sorting:       this.sorting(),
      columnFilters: this.columnFilters(),
    },
    onSortingChange: (updater) =>
      this.sorting.update(s => typeof updater === 'function' ? updater(s) : updater),
    onColumnFiltersChange: (updater) =>
      this.columnFilters.update(f => typeof updater === 'function' ? updater(f) : updater),
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  }));

  protected readonly tableRows      = computed(() => this.table.getRowModel().rows);
  protected readonly headerGroups   = computed(() => this.table.getHeaderGroups());
  protected readonly showPagination = computed(() => this.table.getPageCount() > 1);
}
