import { Component, input } from '@angular/core';

@Component({
  selector: 'mk-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-16 text-center">
      @if (icon()) {
        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 dark:border-border dark:bg-surface dark:text-zinc-600">
          <ng-content select="[slot=icon]" />
        </div>
      }
      <p class="text-sm font-medium text-gray-900 dark:text-zinc-200">{{ title() }}</p>
      @if (subtitle()) {
        <p class="mt-1 text-xs text-gray-500 dark:text-zinc-600">{{ subtitle() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title    = input.required<string>();
  readonly subtitle = input('');
  readonly icon     = input(true);
}
