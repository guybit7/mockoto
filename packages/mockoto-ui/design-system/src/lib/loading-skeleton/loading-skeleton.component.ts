import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'mk-loading-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="wrapperClass()">
      @for (_ of rows(); track $index) {
        <div [class]="rowClass()"></div>
      }
    </div>
  `,
})
export class LoadingSkeletonComponent {
  readonly count     = input(5);
  readonly rowHeight = input('h-10');
  readonly gap       = input('gap-1.5');
  readonly rounded   = input('rounded-xl');
  readonly bordered  = input(true);
  /** When true, rows are inset horizontally so they don't fill edge-to-edge. */
  readonly inset     = input(false);

  protected readonly rows = computed(() => Array.from({ length: this.count() }));

  protected readonly wrapperClass = computed(() => [
    'flex flex-col overflow-hidden',
    this.rounded(),
    this.gap(),
    this.bordered() ? 'border border-gray-200 dark:border-border' : '',
  ].join(' '));

  protected readonly rowClass = computed(() => [
    this.rowHeight(),
    'shimmer rounded-lg',
    this.inset() ? 'mx-4' : '',
  ].join(' '));
}
