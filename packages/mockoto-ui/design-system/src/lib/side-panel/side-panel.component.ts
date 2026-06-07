import { animate, style, transition, trigger } from '@angular/animations';
import { afterNextRender, Component, ElementRef, HostListener, inject, input, output } from '@angular/core';

@Component({
  selector: 'mk-side-panel',
  standalone: true,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('210ms cubic-bezier(0.16,1,0.3,1)', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('160ms ease-in', style({ transform: 'translateX(100%)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('210ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('160ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
  ],
  template: `
    <div @fadeIn class="fixed inset-0 z-40 bg-black/25 dark:bg-black/40" (click)="closed.emit()"></div>
    <aside
      @slideIn
      class="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-gray-200 bg-white shadow-2xl sm:max-w-[440px] dark:border-border dark:bg-surface"
    >
      <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-border">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-zinc-100">{{ title() }}</h2>
        <button
          type="button"
          (click)="closed.emit()"
          class="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
          aria-label="Close panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="flex flex-1 flex-col overflow-y-auto px-5 py-5">
        <ng-content />
      </div>
    </aside>
  `,
})
export class SidePanelComponent {
  readonly title = input('');
  readonly closed = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const first = this.el.nativeElement.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
      );
      first?.focus();
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closed.emit();
  }
}
