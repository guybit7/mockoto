import { Component } from '@angular/core';

@Component({
  selector: 'mk-card',
  standalone: true,
  template: `
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-surface">
      <ng-content />
    </div>
  `,
})
export class CardComponent {}
