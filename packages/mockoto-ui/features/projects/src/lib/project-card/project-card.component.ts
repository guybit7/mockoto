import { Component, computed, input, output } from '@angular/core';
import type { Project } from '@mockoto/shared';

@Component({
  selector: 'mk-project-card',
  standalone: true,
  template: `
    <div
      class="group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4
             transition-[transform,border-color,box-shadow] duration-150
             hover:-translate-y-px hover:border-gray-300 hover:shadow-xl hover:shadow-black/8
             dark:border-border dark:bg-surface dark:hover:border-zinc-600/70 dark:hover:shadow-black/25"
      (click)="cardClicked.emit()"
    >
      <!-- Top row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">

          <!-- Logo / avatar -->
          @if (project().logoUrl || project().logoBase64) {
            <img
              [src]="logoSrc()"
              [alt]="project().name"
              class="h-8 w-8 rounded-lg object-cover"
              (error)="onImgError($event)"
            />
          } @else {
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
              {{ initial() }}
            </div>
          }

          <!-- Favorite -->
          <button
            type="button"
            (click)="toggleFavoriteClicked.emit(); $event.stopPropagation()"
            [disabled]="updating()"
            [attr.aria-label]="project().isFavorite ? 'Remove from favorites' : 'Add to favorites'"
            class="flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50"
            [class]="project().isFavorite
              ? 'text-amber-400 hover:text-amber-500'
              : 'text-gray-300 hover:text-amber-300 dark:text-zinc-600 dark:hover:text-amber-400'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                 [attr.fill]="project().isFavorite ? 'currentColor' : 'none'"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>

        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
          <!-- Edit -->
          <button
            type="button"
            (click)="editClicked.emit(); $event.stopPropagation()"
            class="flex h-6 w-6 items-center justify-center rounded-md text-gray-300
                   transition-[background-color,color] duration-100
                   hover:bg-gray-100 hover:text-gray-600
                   dark:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-400"
            aria-label="Edit project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>

          <!-- Delete -->
          <button
            type="button"
            (click)="deleteClicked.emit(); $event.stopPropagation()"
            [disabled]="deleting()"
            class="flex h-6 w-6 items-center justify-center rounded-md text-gray-300
                   transition-[background-color,color] duration-100
                   hover:bg-red-50 hover:text-red-500
                   disabled:cursor-not-allowed disabled:opacity-50
                   dark:text-zinc-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label="Delete project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
          {{ project().name }}
        </p>
        @if (project().description) {
          <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
            {{ project().description }}
          </p>
        }
        <p class="mt-1.5 truncate font-mono text-xs text-gray-400 dark:text-zinc-700">
          {{ project().baseUrl }}
        </p>
      </div>

      <!-- Owner badge -->
      @if (project().ownerName) {
        <div>
          <span class="inline-flex items-center rounded-md border border-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:border-border dark:text-zinc-600">
            {{ project().ownerName }}
          </span>
        </div>
      }
    </div>
  `,
})
export class ProjectCardComponent {
  readonly project  = input.required<Project>();
  readonly updating = input(false);
  readonly deleting = input(false);

  readonly cardClicked           = output<void>();
  readonly editClicked           = output<void>();
  readonly deleteClicked         = output<void>();
  readonly toggleFavoriteClicked = output<void>();

  protected readonly initial = computed(() =>
    this.project().name.charAt(0).toUpperCase()
  );

  protected readonly logoSrc = computed(() => {
    const p = this.project();
    return p.logoUrl ?? `data:image/png;base64,${p.logoBase64}`;
  });

  protected onImgError(event: Event): void {
    if (event.target instanceof HTMLImageElement) {
      event.target.style.display = 'none';
    }
  }
}
