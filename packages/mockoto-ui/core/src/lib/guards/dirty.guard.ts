import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from '../confirm-dialog/confirm-dialog.service';

export interface HasUnsavedChanges {
  isDirty(): boolean;
}

export const dirtyGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.isDirty()) return true;
  return inject(ConfirmDialogService).confirm({
    title: 'Discard unsaved changes?',
    body: 'Your changes will be lost if you close without saving.',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
    focusConfirm: true,
  });
};
