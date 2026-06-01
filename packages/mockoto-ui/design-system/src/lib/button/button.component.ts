import { Component, computed, input } from '@angular/core';
import { Variant, Size } from '../types';

const BASE = 'inline-flex cursor-pointer items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/85 focus-visible:ring-accent/40 dark:focus-visible:ring-offset-bg',
  secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-border dark:bg-transparent dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-surface dark:hover:text-zinc-100 dark:focus-visible:ring-accent/30 dark:focus-visible:ring-offset-bg',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/40 dark:focus-visible:ring-offset-bg',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-3 text-xs gap-1.5',
  md: 'h-8 px-4 text-sm gap-2',
  lg: 'h-9 px-5 text-sm gap-2',
};

@Component({
  selector: 'mk-button',
  standalone: true,
  template: `
    <button [class]="classes()" [type]="type()" [disabled]="disabled()">
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<Variant>('primary');
  readonly size = input<Size>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);

  protected readonly classes = computed(() =>
    `${BASE} ${VARIANTS[this.variant()]} ${SIZES[this.size()]}`
  );
}
