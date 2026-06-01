import { Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import type { RuleResponse } from '@mockoto/shared';

@Component({
  selector: 'mk-response-tab',
  standalone: true,
  imports: [NgClass],
  template: `
    <div
      class="group flex shrink-0 items-center rounded-lg border text-sm transition-colors"
      [ngClass]="tabClasses()"
    >
      <!-- Active-for-proxy dot -->
      <button
        type="button"
        (click)="setActiveClicked.emit()"
        [disabled]="response().isActive || setPending()"
        [title]="response().isActive ? 'Active response' : 'Set as active'"
        class="flex h-full items-center py-2 pl-3 pr-2 disabled:cursor-default"
        aria-label="Set as active response"
      >
        <span
          class="h-3 w-3 shrink-0 rounded-full border-2 transition-colors"
          [ngClass]="dotClasses()"
        ></span>
      </button>

      <!-- Edit trigger -->
      <button
        type="button"
        (click)="editClicked.emit()"
        class="flex items-center gap-2 py-2 pr-3"
        aria-label="Edit response"
      >
        <span class="font-mono font-semibold" [ngClass]="statusClasses()">
          {{ response().statusCode }}
        </span>
        @if (response().name) {
          <span class="max-w-[140px] truncate">{{ response().name }}</span>
        }
        @if (response().isFavorite) {
          <svg
            xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
            fill="currentColor" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"
            class="shrink-0 text-amber-400"
            aria-hidden="true"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        }
      </button>
    </div>
  `,
})
export class ResponseTabComponent {
  readonly response   = input.required<RuleResponse>();
  readonly selected   = input.required<boolean>();
  readonly setPending = input(false);

  readonly editClicked      = output<void>();
  readonly setActiveClicked = output<void>();

  protected readonly tabClasses = computed<string>(() =>
    this.selected()
      ? 'bg-white dark:bg-white/[0.08] border-zinc-400 dark:border-zinc-400 shadow-sm text-gray-800 dark:text-zinc-100'
      : 'bg-transparent border-gray-200 dark:border-zinc-700/60 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 dark:hover:bg-white/[0.04] dark:hover:border-zinc-600 dark:hover:text-zinc-300'
  );

  protected readonly dotClasses = computed<string>(() =>
    this.response().isActive
      ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400'
      : 'border-gray-300 bg-transparent dark:border-zinc-600 group-hover:border-emerald-400 dark:group-hover:border-emerald-500'
  );

  protected readonly statusClasses = computed<string>(() => {
    const { statusCode, isError } = this.response();
    if (isError || statusCode >= 500) return 'text-red-500 dark:text-red-400';
    if (statusCode >= 400)            return 'text-orange-500 dark:text-orange-400';
    if (statusCode >= 300)            return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  });
}
