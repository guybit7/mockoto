import { Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import type { Collection } from '@mockoto/shared';

@Component({
  selector: 'mk-collection-item',
  standalone: true,
  imports: [NgClass],
  template: `
    <div
      class="group relative mx-1 flex cursor-pointer items-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
      (click)="navigated.emit()"
    >
      @if (collapsed()) {
        <!-- Collapsed: initials avatar -->
        <div class="relative flex w-full items-center justify-center py-1.5" [title]="collection().name">
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
        <!-- Expanded: full label + actions -->
        <div class="flex flex-1 items-center gap-1 overflow-hidden py-1.5 pl-3 pr-1.5">

          <!-- Favorite star -->
          <button
            type="button"
            (click)="toggleFavoriteClicked.emit(); $event.stopPropagation()"
            [disabled]="updating()"
            [title]="collection().isFavorite ? 'Remove from favorites' : 'Add to favorites'"
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors disabled:cursor-not-allowed"
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

          <!-- Name -->
          <span class="flex-1 truncate text-sm" [ngClass]="nameClasses()">
            {{ collection().name }}
          </span>

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

          <!-- Active-for-proxy dot -->
          <button
            type="button"
            (click)="setActiveClicked.emit(); $event.stopPropagation()"
            [disabled]="collection().isActive || updating()"
            [title]="collection().isActive ? 'Active collection' : 'Set as active'"
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors disabled:cursor-default"
            [ngClass]="collection().isActive
              ? 'text-emerald-500'
              : 'text-gray-300 hover:text-emerald-400 dark:text-zinc-600 dark:hover:text-emerald-500'"
            aria-label="Set as active collection"
          >
            <span
              class="h-2 w-2 rounded-full transition-colors"
              [ngClass]="collection().isActive ? 'bg-emerald-500' : 'border-2 border-current'"
            ></span>
          </button>

        </div>
      }
    </div>
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

  protected readonly initials = computed(() =>
    this.collection().name.slice(0, 2).toUpperCase()
  );

  protected readonly nameClasses = computed<string>(() =>
    this.active()
      ? 'font-semibold text-gray-900 dark:text-zinc-100'
      : 'text-gray-600 dark:text-zinc-400'
  );

  protected readonly collapsedAvatarClasses = computed<string>(() =>
    this.active()
      ? 'bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100'
      : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700'
  );
}
