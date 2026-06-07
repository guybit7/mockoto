import { Component, computed, input, output } from '@angular/core';
import type { Project } from '@mockoto/shared';

@Component({
  selector: 'mk-project-card',
  standalone: true,
  template: `
    <div
      class="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white
             transition-[border-color,box-shadow,transform] duration-150
             hover:-translate-y-px hover:border-gray-300 hover:shadow-lg hover:shadow-black/6
             dark:border-border dark:bg-surface dark:hover:border-zinc-600/70 dark:hover:shadow-black/20"
      (click)="cardClicked.emit()"
    >

      <!-- ── Content area ───────────────────────────────────────────────── -->
      <div class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-4">

        <!-- Header: logo · name · actions (hover) · favorite -->
        <div class="flex items-center gap-2.5">

          @if (project().logoUrl || project().logoBase64) {
            <img
              [src]="logoSrc()"
              [alt]="project().name"
              class="h-8 w-8 shrink-0 rounded-lg object-cover"
              (error)="onImgError($event)"
            />
          } @else {
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
              {{ initial() }}
            </div>
          }

          <p class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {{ project().name }}
          </p>

          <!-- Edit / Delete — visible on hover only -->
          <div
            class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100"
            (click)="$event.stopPropagation()"
          >
            <button
              type="button"
              (click)="editClicked.emit()"
              aria-label="Edit project"
              class="flex h-6 w-6 items-center justify-center rounded-md text-gray-300
                     transition-[background-color,color] duration-100
                     hover:bg-gray-100 hover:text-gray-600
                     dark:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
              </svg>
            </button>
            <button
              type="button"
              (click)="deleteClicked.emit()"
              [disabled]="deleting()"
              aria-label="Delete project"
              class="flex h-6 w-6 items-center justify-center rounded-md text-gray-300
                     transition-[background-color,color] duration-100
                     hover:bg-red-50 hover:text-red-500
                     disabled:cursor-not-allowed disabled:opacity-50
                     dark:text-zinc-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </div>

          <!-- Favorite — always visible -->
          <button
            type="button"
            (click)="toggleFavoriteClicked.emit(); $event.stopPropagation()"
            [disabled]="updating()"
            [attr.aria-label]="project().isFavorite ? 'Remove from favorites' : 'Add to favorites'"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors duration-100
                   disabled:cursor-not-allowed disabled:opacity-50"
            [class]="project().isFavorite
              ? 'text-amber-400 hover:text-amber-500'
              : 'text-gray-300 hover:text-amber-300 dark:text-zinc-600 dark:hover:text-amber-400'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                 [attr.fill]="project().isFavorite ? 'currentColor' : 'none'"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        </div>

        <!-- Body: description (top-anchored) + URL (bottom-anchored) -->
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <!-- Description: reserved height for 2 lines keeps URL position consistent -->
          <p class="line-clamp-2 shrink-0 text-xs leading-snug text-gray-500 min-h-8.25 dark:text-zinc-500">
            {{ project().description }}
          </p>
          <!-- URL: always at bottom of body area -->
          <p class="mt-auto truncate pt-1.5 font-mono text-xs text-gray-400 dark:text-zinc-600">
            {{ project().baseUrl }}
          </p>
        </div>

      </div>

      <!-- ── Footer: owner · default badge ─────────────────────────────── -->
      <div class="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-2 dark:border-border">

        @if (project().ownerName) {
          <span class="inline-flex items-center gap-1 truncate rounded-md border border-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:border-border dark:text-zinc-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {{ project().ownerName }}
          </span>
        } @else {
          <span></span>
        }

        @if (isDefault()) {
          <span class="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
                 fill="currentColor" stroke="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8"/>
            </svg>
            Default
          </span>
        }

      </div>
    </div>
  `,
})
export class ProjectCardComponent {
  readonly project   = input.required<Project>();
  readonly updating  = input(false);
  readonly deleting  = input(false);
  readonly isDefault = input(false);

  readonly cardClicked           = output<void>();
  readonly editClicked           = output<void>();
  readonly deleteClicked         = output<void>();
  readonly toggleFavoriteClicked = output<void>();

  protected readonly initial = computed(() =>
    this.project().name.charAt(0).toUpperCase(),
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
