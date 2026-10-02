import { Component, inject } from '@angular/core';
import { ToastService, type ToastLevel } from '@mockoto-ui/core';

const LEVEL_CLASSES: Record<ToastLevel, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800/60 dark:text-emerald-200',
  warning: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/80 dark:border-amber-800/60 dark:text-amber-200',
  danger:  'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/80 dark:border-red-800/60 dark:text-red-200',
  info:    'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/80 dark:border-blue-800/60 dark:text-blue-200',
};

@Component({
  selector: 'mk-toast-host',
  standalone: true,
  styles: [`
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(0.75rem); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .toast-item { animation: toast-in 0.18s ease-out both; }
  `],
  template: `
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      class="pointer-events-none fixed top-4 right-4 z-10000 flex flex-col items-end gap-2"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          role="alert"
          class="toast-item pointer-events-auto flex w-80 max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm"
          [class]="levelClasses[toast.level]"
        >
          <span class="mt-0.5 shrink-0">
            @switch (toast.level) {
              @case ('success') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              }
              @case ('warning') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
                </svg>
              }
              @case ('danger') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>
                </svg>
              }
              @case ('info') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
              }
            }
          </span>

          <p class="flex-1 text-sm font-medium leading-snug">{{ toast.message }}</p>

          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            class="ml-1 shrink-0 opacity-50 transition-opacity hover:opacity-100"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
  protected readonly levelClasses = LEVEL_CLASSES;
}
