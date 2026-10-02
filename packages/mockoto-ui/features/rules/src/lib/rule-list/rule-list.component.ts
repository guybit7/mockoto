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
import { ButtonComponent, ErrorStateComponent } from '@mockoto-ui/design-system';
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
    MkThComponent,
    MkTextFilterComponent,
    MkSelectFilterComponent,
    MkPaginationComponent,
    RuleItemComponent,
  ],
  host: { class: 'flex min-h-0 min-w-0 overflow-hidden flex-col px-6 py-4' },
  template: `
    <div class="mb-3 flex items-center gap-3">
      <!-- Fullscreen toggle -->
      <button
        type="button"
        (click)="fullscreenToggled.emit()"
        [title]="fullscreen() ? 'Exit fullscreen (Esc)' : 'Expand to fullscreen'"
        [attr.aria-label]="fullscreen() ? 'Exit fullscreen' : 'Expand to fullscreen'"
        [attr.aria-pressed]="fullscreen()"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
      >
        @if (fullscreen()) {
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
            <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
          </svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        }
      </button>

      <!-- Prev / Next collection navigation -->
      <div class="flex items-center gap-0.5">
        <button
          type="button"
          (click)="prevClicked.emit()"
          [disabled]="!hasPrev()"
          title="Previous collection (↑)"
          aria-label="Previous collection"
          class="flex h-7 w-7 items-center justify-center rounded transition-colors disabled:cursor-not-allowed"
          [class]="hasPrev() ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200' : 'text-gray-200 dark:text-zinc-800'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
        <button
          type="button"
          (click)="nextClicked.emit()"
          [disabled]="!hasNext()"
          title="Next collection (↓)"
          aria-label="Next collection"
          class="flex h-7 w-7 items-center justify-center rounded transition-colors disabled:cursor-not-allowed"
          [class]="hasNext() ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200' : 'text-gray-200 dark:text-zinc-800'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>

      <div class="shrink-0 flex items-center gap-2">
        <h1 class="text-sm font-medium text-gray-900 dark:text-zinc-100">
          @if (collectionName()) {
            {{ collectionName() }}
            @if (!fullscreen()) {
              <span class="ml-1 font-normal text-gray-400 dark:text-zinc-600">rules</span>
            }
          } @else {
            Rules
          }
        </h1>
        @if (fullscreen() && collectionName()) {
          <button
            type="button"
            (click)="collectionFavoriteToggled.emit()"
            [title]="collectionIsFavorite() ? 'Remove from favorites' : 'Add to favorites'"
            [attr.aria-label]="collectionIsFavorite() ? 'Remove from favorites' : 'Add to favorites'"
            [attr.aria-pressed]="collectionIsFavorite()"
            class="flex items-center justify-center rounded p-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                 [attr.fill]="collectionIsFavorite() ? 'currentColor' : 'none'"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                 [class]="collectionIsFavorite() ? 'text-amber-400' : 'text-gray-300 dark:text-zinc-600'">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          @if (collectionMode()) {
            <button
              type="button"
              (click)="collectionModeToggled.emit()"
              [title]="collectionMode() === 'proxy' ? 'Switch to local mode' : 'Switch to proxy mode'"
              [attr.aria-label]="collectionMode() === 'proxy' ? 'Switch to local mode' : 'Switch to proxy mode'"
              class="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none transition-colors"
              [class]="collectionMode() === 'proxy'
                ? 'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'"
            >{{ collectionMode() }}</button>
          }
          <span class="text-xs font-normal text-gray-400 dark:text-zinc-600">rules</span>
        }
      </div>

      @if (collectionIsActive() === false) {
        <div class="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1 dark:border-amber-500/20 dark:bg-amber-500/8">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               class="shrink-0 text-amber-500 dark:text-amber-400">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4M12 17h.01"/>
          </svg>
          <span class="min-w-0 truncate text-xs text-amber-700 dark:text-amber-400">
            Not active
            @if (activeCollectionName()) {
              · served from <strong class="font-semibold">{{ activeCollectionName() }}</strong>
            }
          </span>
          <button
            type="button"
            (click)="activateCollectionClicked.emit(); $event.stopPropagation()"
            class="ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/15"
          >Set as active</button>
        </div>
      } @else {
        <span class="flex-1"></span>
      }

      <mk-button size="sm" (click)="newRuleClicked.emit()">New Rule</mk-button>
    </div>

    @if (loading()) {
      <!-- Filter toolbar skeleton -->
      <div class="mb-2.5 flex items-center gap-1.5">
        <div class="h-7 w-36 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"></div>
        <div class="h-7 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"></div>
        <div class="h-7 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"></div>
      </div>

      <!-- Table skeleton -->
      <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-border">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50 dark:border-border dark:bg-white/1.5">
              <th class="w-[44px] px-3 py-2.5"></th>
              <th class="w-[85px] px-3 py-2.5 text-left"><div class="h-2 w-10 animate-pulse rounded bg-gray-200 dark:bg-white/6"></div></th>
              <th class="px-3 py-2.5 text-left"><div class="h-2 w-16 animate-pulse rounded bg-gray-200 dark:bg-white/6"></div></th>
              <th class="w-[80px] px-3 py-2.5 text-left"><div class="h-2 w-8 animate-pulse rounded bg-gray-200 dark:bg-white/6"></div></th>
              <th class="w-[110px] px-3 py-2.5 text-left"><div class="h-2 w-12 animate-pulse rounded bg-gray-200 dark:bg-white/6"></div></th>
              <th class="w-[70px]"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100/70 bg-white dark:divide-border/60 dark:bg-surface">
            @for (row of skeletonRows; track row.delay) {
              <tr [style.animation-delay]="row.delay">
                <td class="w-[44px] px-3 py-2.5">
                  <div class="mx-auto h-3.5 w-3.5 animate-pulse rounded-sm bg-gray-100 dark:bg-white/4" [style.animation-delay]="row.delay"></div>
                </td>
                <td class="w-[85px] px-3 py-2.5">
                  <div class="h-[18px] animate-pulse rounded" [style.width.px]="row.methodW" [style.animation-delay]="row.delay" [class]="row.methodCls"></div>
                </td>
                <td class="px-3 py-2.5">
                  <div class="h-[13px] animate-pulse rounded bg-gray-100 dark:bg-white/5" [style.width]="row.urlW" [style.animation-delay]="row.delay"></div>
                  @if (row.hasDesc) {
                    <div class="mt-1 h-2 w-20 animate-pulse rounded bg-gray-100 dark:bg-white/3" [style.animation-delay]="row.delay"></div>
                  }
                </td>
                <td class="w-[80px] px-3 py-2.5">
                  <div class="h-[18px] w-11 animate-pulse rounded bg-gray-100 dark:bg-white/4" [style.animation-delay]="row.delay"></div>
                </td>
                <td class="w-[110px] px-3 py-2.5">
                  <div class="flex items-center gap-1.5">
                    <div class="h-1.5 w-1.5 animate-pulse rounded-full" [style.animation-delay]="row.delay" [class]="row.green ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-gray-200 dark:bg-white/6'"></div>
                    <div class="h-2 w-12 animate-pulse rounded bg-gray-100 dark:bg-white/4" [style.animation-delay]="row.delay"></div>
                  </div>
                </td>
                <td class="w-[70px]"></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
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
          <table class="w-full table-fixed">
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
                  <td colspan="6" class="px-4 py-14 text-center">
                    <p class="text-sm text-gray-400 dark:text-zinc-600">No rules yet</p>
                    <p class="mt-1 text-xs text-gray-400 dark:text-zinc-600">Click <span class="font-medium text-gray-500 dark:text-zinc-500">New Rule</span> above to create one</p>
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
  readonly rules                = input<Rule[]>([]);
  readonly loading              = input(false);
  readonly error                = input(false);
  readonly selectedRuleId       = input<string | null>(null);
  readonly collectionName        = input<string | null>(null);
  readonly collectionMode        = input<string | null>(null);
  readonly collectionIsFavorite  = input(false);
  readonly collectionIsActive    = input<boolean | null>(null);
  readonly activeCollectionName  = input<string | null>(null);
  readonly fullscreen            = input(false);
  readonly hasPrev               = input(false);
  readonly hasNext               = input(false);
  readonly updatePending        = input(false);
  readonly deletePending        = input(false);

  readonly newRuleClicked              = output<void>();
  readonly fullscreenToggled           = output<void>();
  readonly collectionFavoriteToggled   = output<void>();
  readonly collectionModeToggled       = output<void>();
  readonly ruleSelected            = output<string>();
  readonly enabledToggled          = output<{ id: string; enabled: boolean }>();
  readonly favoriteToggled         = output<{ id: string; favorite: boolean }>();
  readonly editClicked             = output<string>();
  readonly deleteClicked           = output<string>();
  readonly activateCollectionClicked = output<void>();
  readonly prevClicked               = output<void>();
  readonly nextClicked               = output<void>();

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

  protected readonly skeletonRows = [
    { delay: '0ms',   methodW: 30, methodCls: 'bg-emerald-50 dark:bg-emerald-500/10', urlW: '56%', hasDesc: false, green: true  },
    { delay: '50ms',  methodW: 38, methodCls: 'bg-blue-50 dark:bg-blue-500/10',       urlW: '71%', hasDesc: true,  green: true  },
    { delay: '100ms', methodW: 46, methodCls: 'bg-red-50 dark:bg-red-500/10',         urlW: '44%', hasDesc: false, green: false },
    { delay: '150ms', methodW: 30, methodCls: 'bg-emerald-50 dark:bg-emerald-500/10', urlW: '79%', hasDesc: false, green: true  },
    { delay: '200ms', methodW: 43, methodCls: 'bg-amber-50 dark:bg-amber-500/10',     urlW: '62%', hasDesc: true,  green: false },
    { delay: '250ms', methodW: 38, methodCls: 'bg-blue-50 dark:bg-blue-500/10',       urlW: '51%', hasDesc: false, green: true  },
    { delay: '300ms', methodW: 55, methodCls: 'bg-orange-50 dark:bg-orange-500/10',   urlW: '73%', hasDesc: true,  green: true  },
    { delay: '350ms', methodW: 30, methodCls: 'bg-emerald-50 dark:bg-emerald-500/10', urlW: '67%', hasDesc: false, green: false },
  ];
}
