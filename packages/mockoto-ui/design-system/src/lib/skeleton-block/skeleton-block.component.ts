import { Component, computed, input } from '@angular/core';

/**
 * Primitive shimmer block. Compose these to build any skeleton layout.
 *
 * Examples:
 *   <mk-skeleton-block h="h-4" w="w-32" />              — text line
 *   <mk-skeleton-block h="h-8" w="w-8" r="rounded-lg" />  — avatar
 *   <mk-skeleton-block h="h-10" />                       — full-width row
 */
@Component({
  selector: 'mk-skeleton-block',
  standalone: true,
  host: { '[class]': 'hostClass()' },
  template: ``,
})
export class SkeletonBlockComponent {
  readonly h = input('h-4');
  readonly w = input('w-full');
  readonly r = input('rounded');

  protected readonly hostClass = computed(() =>
    `block animate-pulse bg-gray-100 dark:bg-white/5 ${this.h()} ${this.w()} ${this.r()}`
  );
}
