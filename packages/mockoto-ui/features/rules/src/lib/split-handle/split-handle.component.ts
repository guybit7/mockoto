import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export interface SplitPreset {
  readonly value: number;
  readonly title: string;
  readonly icon: { left: { x: number; w: number }; right: { x: number; w: number } };
}

@Component({
  selector: 'mk-split-handle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'group relative flex w-5 shrink-0 cursor-col-resize select-none items-center justify-center',
    '(pointerdown)': 'startDrag($event)',
    '(pointermove)': 'onDrag($event)',
    '(pointerup)': 'endDrag()',
    '(pointercancel)': 'endDrag()',
  },
  template: `
    <div class="pointer-events-none h-full w-px bg-violet-200 transition-colors group-hover:bg-violet-400 dark:bg-violet-500/25 dark:group-hover:bg-violet-500"></div>

    <div class="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-0.5 rounded-xl border border-gray-200 bg-white p-1 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-900">
      @for (preset of presets(); track preset.value) {
        <button
          type="button"
          (pointerdown)="$event.stopPropagation()"
          (click)="splitChanged.emit(preset.value)"
          [title]="preset.title"
          class="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          [class]="activePreset() === preset.value
            ? 'bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400'
            : 'text-gray-400 hover:bg-gray-100 hover:text-violet-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-violet-400'"
        >
          <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" aria-hidden="true">
            <rect [attr.x]="preset.icon.left.x" y="0.5" [attr.width]="preset.icon.left.w" height="9" rx="0.5"/>
            <rect [attr.x]="preset.icon.right.x" y="0.5" [attr.width]="preset.icon.right.w" height="9" rx="0.5"/>
          </svg>
        </button>
      }
    </div>
  `,
})
export class SplitHandleComponent {
  readonly splitLeft = input.required<number>();
  readonly presets   = input.required<readonly SplitPreset[]>();
  readonly containerRef = input.required<HTMLElement>();

  readonly splitChanged = output<number>();

  private readonly el = inject(ElementRef<HTMLElement>);

  private activeDrag  = false;
  private dragStartX  = 0;
  private dragStartLeft = 0;

  protected readonly activePreset = computed<number | null>(() => {
    const v = this.splitLeft();
    for (const p of this.presets()) {
      if (Math.abs(v - p.value) < 1) return p.value;
    }
    return null;
  });

  protected startDrag(e: PointerEvent): void {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this.activeDrag    = true;
    this.dragStartX    = e.clientX;
    this.dragStartLeft = this.splitLeft();
    e.preventDefault();
  }

  protected onDrag(e: PointerEvent): void {
    if (!this.activeDrag) return;
    const containerWidth = this.containerRef().clientWidth;
    const dx = ((e.clientX - this.dragStartX) / containerWidth) * 100;
    this.splitChanged.emit(Math.max(15, Math.min(75, this.dragStartLeft + dx)));
  }

  protected endDrag(): void {
    this.activeDrag = false;
  }
}
