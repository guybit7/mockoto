import { Component, input } from '@angular/core';

type TdAlign = 'left' | 'center' | 'right';

const ALIGN: Record<TdAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

@Component({
  selector: 'mk-td',
  standalone: true,
  template: `
    <div [class]="'flex items-center ' + ALIGN[align()]">
      <ng-content />
    </div>
  `,
})
export class MkTdComponent {
  readonly align = input<TdAlign>('left');
  protected readonly ALIGN = ALIGN;
}
