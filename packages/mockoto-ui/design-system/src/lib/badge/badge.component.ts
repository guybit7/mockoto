import { Component, input } from '@angular/core';
import { Variant } from '../types';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gray-100 text-gray-600 dark:bg-zinc-800/70 dark:text-zinc-400',
  secondary: 'bg-indigo-50 text-indigo-600 dark:bg-accent/10 dark:text-accent',
  danger: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
};

@Component({
  selector: 'mk-badge',
  standalone: true,
  template: `
    <span [class]="'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' + VARIANTS[variant()]">
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly variant = input<Variant>('primary');
  protected readonly VARIANTS = VARIANTS;
}
