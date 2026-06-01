import { CanDeactivateFn } from '@angular/router';

export interface DirtyComponent {
  isDirty(): boolean;
}

export const dirtyGuard: CanDeactivateFn<DirtyComponent> = (component) => {
  if (!component.isDirty()) return true;
  return confirm('You have unsaved changes. Leave anyway?');
};
