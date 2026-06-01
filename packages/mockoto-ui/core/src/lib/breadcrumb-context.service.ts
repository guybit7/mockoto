import { Injectable, signal } from '@angular/core';

export interface BreadcrumbContext {
  projectName?: string;
  collectionName?: string;
  ruleName?: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbContextService {
  readonly context = signal<BreadcrumbContext>({});

  patch(partial: Partial<BreadcrumbContext>): void {
    this.context.update(c => ({ ...c, ...partial }));
  }

  clear(keys?: (keyof BreadcrumbContext)[]): void {
    if (!keys) {
      this.context.set({});
      return;
    }
    this.context.update(c => {
      const next = { ...c };
      keys.forEach(k => delete next[k]);
      return next;
    });
  }
}
