import { HttpErrorResponse } from '@angular/common/http';
import { ERROR_CODE, type ApiErrorBody } from '@mockoto/shared';

/** Extract a typed error body from a TanStack Query or HttpClient error. */
export function getApiErrorBody(error: unknown): ApiErrorBody | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body = error.error as Partial<ApiErrorBody> | null;
  if (body && typeof body === 'object' && 'code' in body && 'message' in body) {
    return body as ApiErrorBody;
  }
  return null;
}

/** True when the server returned 404 / NOT_FOUND for this request. */
export function isNotFound(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (error.status === 404) return true;
  return getApiErrorBody(error)?.code === ERROR_CODE.NOT_FOUND;
}

/** True when the server returned 409 / CONFLICT. */
export function isConflict(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (error.status === 409) return true;
  return getApiErrorBody(error)?.code === ERROR_CODE.CONFLICT;
}

/** True when the request failed due to a network/server error (status 0 or 5xx). */
export function isServerError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  return error.status === 0 || error.status >= 500;
}
