import { Component, computed, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import type { Collection } from '@mockoto/shared';

@Component({
  selector: 'mk-collection-item',
  standalone: true,
  imports: [NgClass],
  template: `
    <div
      class="group relative mx-1 flex cursor-pointer items-center rounded-lg border-l-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
      [ngClass]="active()
        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-500/5'
        : 'border-transparent'"
      (click)="navigated.emit()"
    >
      @if (collapsed()) {
        <!-- Collapsed: initials avatar -->
        <div
          class="relative flex w-full items-center justify-center py-1.5"
          [title]="collapsedTooltip()"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold tracking-tight transition-colors"
            [ngClass]="collapsedAvatarClasses()"
          >{{ initials() }}</span>

          @if (collection().isActive) {
            <span class="absolute bottom-1 right-2 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-zinc-900"></span>
          }
          @if (collection().isFavorite) {
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
                 fill="currentColor" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"
                 class="absolute right-1.5 top-1 text-amber-400" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          }
        </div>
      } @else {
        <!-- Expanded: two-line layout -->
        <div class="flex min-w-0 flex-1 items-center py-1.5 pl-3 pr-1.5">

          <!-- Favorite star – pinned to top of two-line block -->
          <button
            type="button"
            (click)="toggleFavoriteClicked.emit(); $event.stopPropagation()"
            [disabled]="updating()"
            [title]="collection().isFavorite ? 'Remove from favorites' : 'Add to favorites'"
            class="mr-1 flex h-5 w-5 shrink-0 self-start items-center justify-center rounded pt-0.5 transition-colors disabled:cursor-not-allowed"
            [ngClass]="collection().isFavorite
              ? 'text-amber-400 hover:text-amber-500'
              : 'text-gray-300 hover:text-amber-400 dark:text-zinc-600 dark:hover:text-amber-400'"
            aria-label="Toggle favorite"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                 [attr.fill]="collection().isFavorite ? 'currentColor' : 'none'"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>

          <!-- Name + sub-row -->
          <div class="flex min-w-0 flex-1 flex-col">

            <!-- Line 1: full name + optional description tooltip -->
            <div class="flex min-w-0 items-center gap-1 leading-5">
              <span class="truncate text-sm" [ngClass]="nameClasses()" [title]="collection().name">{{ collection().name }}</span>
              @if (collection().description) {
                <button
                  type="button"
                  (mouseenter)="showDesc($event)"
                  (mouseleave)="hideDesc()"
                  (click)="$event.stopPropagation()"
                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-300 transition-colors hover:text-gray-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                  aria-label="Collection description"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                </button>
              }
            </div>

            <!-- Line 2: mode badge · recording badge · spacer · edit · delete -->
            <div class="flex items-center gap-0.5">

              <button
                type="button"
                (click)="modeCycleClicked.emit(nextModeState()); $event.stopPropagation()"
                [disabled]="updating()"
                [title]="modeBadgeTitle()"
                [attr.aria-label]="modeBadgeTitle()"
                class="mr-0.5 rounded px-1 py-0.5 font-mono text-[10px] font-medium leading-none transition-colors disabled:cursor-not-allowed"
                [class]="modeBadgeClasses()"
              >{{ modeBadgeLabel() }}</button>

              @if (collection().mode === 'proxy') {
                <button
                  type="button"
                  (click)="recordingStrategyCycled.emit(nextRecordingStrategy()); $event.stopPropagation()"
                  [disabled]="updating()"
                  [title]="recordingBadgeTitle()"
                  class="mr-1 rounded px-1 py-0.5 font-mono text-[10px] font-medium leading-none transition-colors disabled:cursor-not-allowed"
                  [class]="recordingBadgeClasses()"
                >{{ recordingBadgeLabel() }}</button>
              }

              <span class="flex-1"></span>

              <!-- Edit -->
              <button
                type="button"
                (click)="editClicked.emit(); $event.stopPropagation()"
                title="Edit collection"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition-[opacity,colors] group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                aria-label="Edit collection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
              </button>

              <!-- Delete -->
              <button
                type="button"
                (click)="deleteClicked.emit(); $event.stopPropagation()"
                [disabled]="deleting()"
                title="Delete collection"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition-[opacity,colors] group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed dark:text-zinc-500 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                aria-label="Delete collection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>

            </div>
          </div>

          <!-- Active indicator – vertically centered across both lines -->
          <button
            type="button"
            (click)="setActiveClicked.emit(); $event.stopPropagation()"
            [disabled]="collection().isActive || updating()"
            [title]="collection().isActive ? 'Active collection' : 'Set as active'"
            class="ml-1 flex h-8 w-6 shrink-0 items-center justify-center rounded transition-colors disabled:cursor-default"
            [ngClass]="collection().isActive
              ? 'text-emerald-500'
              : 'text-gray-300 hover:text-emerald-400 dark:text-zinc-600 dark:hover:text-emerald-500'"
            [attr.aria-label]="collection().isActive ? 'Active collection' : 'Set as active collection'"
          >
            <span
              class="h-3 w-3 rounded-full transition-colors"
              [ngClass]="collection().isActive
                ? 'bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-400/60'
                : 'border-2 border-current'"
            ></span>
          </button>

        </div>
      }
    </div>

    <!-- Fixed-position description tooltip — escapes all parent overflow -->
    @if (descVisible() && collection().description) {
      <div
        class="pointer-events-none fixed z-9999 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-gray-100 shadow-xl dark:bg-zinc-700"
        [style.top.px]="descPos().top"
        [style.left.px]="descPos().left"
      >
        {{ collection().description }}
      </div>
    }
  `,
})
export class CollectionItemComponent {
  readonly collection = input.required<Collection>();
  readonly active     = input.required<boolean>();
  readonly collapsed  = input.required<boolean>();
  readonly updating   = input(false);
  readonly deleting   = input(false);

  readonly navigated             = output<void>();
  readonly editClicked           = output<void>();
  readonly deleteClicked         = output<void>();
  readonly setActiveClicked      = output<void>();
  readonly toggleFavoriteClicked = output<void>();
  readonly modeCycleClicked           = output<{ mode: Collection['mode']; recordingStrategy: Collection['recordingStrategy'] }>();
  readonly recordingStrategyCycled    = output<Collection['recordingStrategy']>();

  protected readonly descVisible = signal(false);
  protected readonly descPos     = signal({ top: 0, left: 0 });

  protected showDesc(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const left = Math.min(rect.right + 10, window.innerWidth - 240);
    this.descPos.set({ top: rect.top - 4, left });
    this.descVisible.set(true);
  }

  protected hideDesc(): void {
    this.descVisible.set(false);
  }

  protected readonly initials = computed(() =>
    this.collection().name.slice(0, 2).toUpperCase() || '?'
  );

  protected readonly nameClasses = computed<string>(() =>
    this.active()
      ? 'font-semibold text-gray-900 dark:text-zinc-100'
      : 'text-gray-500 dark:text-zinc-400'
  );

  protected readonly nextModeState = computed(() => {
    const { mode } = this.collection();
    if (mode === 'local') return { mode: 'proxy' as const, recordingStrategy: 'all'  as const };
    return                       { mode: 'local' as const, recordingStrategy: 'none' as const };
  });

  protected readonly modeBadgeLabel = computed(() => this.collection().mode);

  protected readonly modeBadgeClasses = computed(() =>
    this.collection().mode === 'proxy'
      ? 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25'
      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25'
  );

  protected readonly modeBadgeTitle = computed(() =>
    this.collection().mode === 'proxy'
      ? 'Proxy mode — click to switch to Local'
      : 'Local mode — click to switch to Proxy'
  );

  protected readonly nextRecordingStrategy = computed(() => {
    const strategies = ['all', 'success', 'error', 'none'] as const;
    const idx = strategies.indexOf(this.collection().recordingStrategy);
    return strategies[(idx + 1) % strategies.length];
  });

  protected readonly recordingBadgeLabel = computed(() => {
    switch (this.collection().recordingStrategy) {
      case 'all':     return 'all';
      case 'success': return '2xx';
      case 'error':   return '4xx+';
      case 'none':    return 'pass';
    }
  });

  protected readonly recordingBadgeClasses = computed(() => {
    switch (this.collection().recordingStrategy) {
      case 'all':     return 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25';
      case 'success': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25';
      case 'error':   return 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25';
      case 'none':    return 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10';
    }
  });

  protected readonly recordingBadgeTitle = computed(() => {
    switch (this.collection().recordingStrategy) {
      case 'all':     return 'Recording all requests — click to cycle';
      case 'success': return 'Recording success (2xx) only — click to cycle';
      case 'error':   return 'Recording errors (4xx+) only — click to cycle';
      case 'none':    return 'Passthrough, nothing recorded — click to cycle';
    }
  });

  protected readonly collapsedAvatarClasses = computed<string>(() => {
    const proxy = this.collection().mode === 'proxy';
    return this.active()
      ? `bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300${proxy ? ' ring-2 ring-violet-400 dark:ring-violet-500' : ''}`
      : `bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700${proxy ? ' ring-2 ring-violet-400/60 dark:ring-violet-500/50' : ''}`;
  });

  protected readonly collapsedTooltip = computed<string>(() => {
    const c = this.collection();
    const parts = [c.name, `(${c.mode})`];
    if (c.description) parts.push(`— ${c.description}`);
    return parts.join(' ');
  });
}
