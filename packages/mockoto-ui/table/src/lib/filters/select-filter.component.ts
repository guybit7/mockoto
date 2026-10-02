import { Component, computed, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import type { Column } from '@tanstack/angular-table';

export interface SelectFilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'mk-select-filter',
  standalone: true,
  host: { class: 'relative' },
  template: `
    <!-- Trigger -->
    <button
      #trigger
      type="button"
      (click)="open.set(!open())"
      [attr.aria-expanded]="open()"
      aria-haspopup="listbox"
      class="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 text-xs transition-colors dark:border-border dark:bg-bg"
      [class]="open()
        ? 'border-indigo-400 text-gray-800 ring-2 ring-indigo-400/15 dark:border-accent dark:text-zinc-200 dark:ring-accent/15'
        : 'text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300'"
    >
      <span>{{ selectedLabel() }}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
           class="shrink-0 transition-transform"
           [class.rotate-180]="open()" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Dropdown panel -->
    @if (open()) {
      <div
        role="listbox"
        class="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-border dark:bg-zinc-900"
      >
        <!-- Clear / placeholder option -->
        <button
          type="button"
          role="option"
          [attr.aria-selected]="!activeValue()"
          (click)="select('')"
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors"
          [class]="!activeValue()
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200'"
        >
          @if (!activeValue()) {
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          } @else {
            <span class="w-[10px]"></span>
          }
          {{ placeholder() }}
        </button>

        <div class="my-1 h-px bg-gray-100 dark:bg-border"></div>

        @for (opt of options(); track opt.value) {
          <button
            type="button"
            role="option"
            [attr.aria-selected]="activeValue() === opt.value"
            (click)="select(opt.value)"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors"
            [class]="activeValue() === opt.value
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-zinc-100'"
          >
            @if (activeValue() === opt.value) {
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            } @else {
              <span class="w-[10px]"></span>
            }
            {{ opt.label }}
          </button>
        }
      </div>
    }
  `,
})
export class MkSelectFilterComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly column      = input.required<Column<any, any>>();
  readonly options     = input<SelectFilterOption[]>([]);
  readonly placeholder = input('All');

  private readonly elRef = inject(ElementRef<Element>);

  protected readonly open = signal(false);

  protected readonly activeValue = computed(() =>
    (this.column().getFilterValue() as string | undefined) ?? ''
  );

  protected readonly selectedLabel = computed(() => {
    const v = this.activeValue();
    return v ? (this.options().find(o => o.value === v)?.label ?? v) : this.placeholder();
  });

  protected select(value: string): void {
    this.column().setFilterValue(value || undefined);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(e: MouseEvent): void {
    if (!this.open()) return;
    if (!this.elRef.nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.open.set(false);
      (this.elRef.nativeElement.querySelector('button') as HTMLElement | null)?.focus();
    }
  }
}
