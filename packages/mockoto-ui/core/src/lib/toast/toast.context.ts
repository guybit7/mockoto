import { HttpContext, HttpContextToken } from '@angular/common/http';

export interface ToastOverride {
  suppress?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export const TOAST_OVERRIDE = new HttpContextToken<ToastOverride>(() => ({}));

export function withToastOverride(override: ToastOverride): HttpContext {
  return new HttpContext().set(TOAST_OVERRIDE, override);
}
