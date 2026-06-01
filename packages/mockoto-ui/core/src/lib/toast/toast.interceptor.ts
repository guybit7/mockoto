import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { TOAST_OVERRIDE } from './toast.context';
import { ToastService } from './toast.service';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const DEFAULT_SUCCESS_MESSAGES: Record<string, string> = {
  POST:   'Created successfully',
  PUT:    'Updated successfully',
  PATCH:  'Updated successfully',
  DELETE: 'Deleted successfully',
};

const SERVER_DOWN_MESSAGE =
  'Mockoto server is not available. Please try again in a few minutes.';
const SERVER_DOWN_COOLDOWN_MS = 10_000;

// Module-level timestamp — deduplicates the server-down toast across concurrent requests.
let lastServerDownToastAt = 0;

export const toastInterceptor: HttpInterceptorFn = (req, next) => {
  const override = req.context.get(TOAST_OVERRIDE);
  if (override.suppress) return next(req);

  const toastService    = inject(ToastService);
  const isMutation      = MUTATION_METHODS.has(req.method);
  const successMessage  = override.successMessage ?? DEFAULT_SUCCESS_MESSAGES[req.method];
  const errorMessage    = override.errorMessage   ?? 'Something went wrong';

  return next(req).pipe(
    tap({
      next: (event) => {
        if (isMutation && event instanceof HttpResponse) {
          toastService.add({ level: 'success', message: successMessage });
        }
      },
      error: (err: unknown) => {
        // status 0 = network error / server unreachable (any HTTP method).
        if (err instanceof HttpErrorResponse && err.status === 0) {
          const now = Date.now();
          if (now - lastServerDownToastAt > SERVER_DOWN_COOLDOWN_MS) {
            lastServerDownToastAt = now;
            toastService.add({
              level: 'danger',
              message: SERVER_DOWN_MESSAGE,
              durationMs: 8_000,
            });
          }
          return;
        }

        // Generic mutation errors only — GET failures surface through query.isError().
        if (!isMutation) return;

        const message =
          err instanceof HttpErrorResponse
            ? ((err.error as { message?: string })?.message ?? errorMessage)
            : errorMessage;
        toastService.add({ level: 'danger', message });
      },
    }),
  );
};
