# Toast Architecture

## Overview

Toasts are triggered **automatically** by a single HTTP interceptor that sits in the `@mockoto-ui/core` layer.
No feature code needs to call a toast service directly.
The interceptor reads the HTTP method + URL pattern to generate human-readable messages.
Feature code can opt out or override via `HttpContext` tokens.

---

## Layers

```
HttpClient
    │
    ▼
toast.interceptor.ts        ← single interception point
    │   reads: method + url → resolves label
    │   injects: ToastService
    ▼
ToastService                ← signal-based singleton
    │   signal<Toast[]>
    ▼
ToastHostComponent          ← mounted once in ShellComponent
    │   renders stacked toasts, auto-dismisses
    ▼
(user sees toast)
```

---

## 1. Toast Service

```ts
// packages/mockoto-ui/core/src/lib/toast/toast.service.ts

export type ToastLevel = 'success' | 'warning' | 'danger';

export interface Toast {
  id:      string;
  level:   ToastLevel;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  show(level: ToastLevel, message: string, durationMs = 4000): void { ... }
  dismiss(id: string): void { ... }
}
```

**Auto-dismiss** is timer-based inside `show()`.
Features can also call `show()` directly for non-HTTP toasts (e.g. clipboard copy).

---

## 2. HTTP Interceptor

```ts
// packages/mockoto-ui/core/src/lib/toast/toast.interceptor.ts

export const toastInterceptor: HttpInterceptorFn = (req, next) => {
  const toast  = inject(ToastService);
  const silent = req.context.get(TOAST_SILENT);      // opt-out
  const custom = req.context.get(TOAST_MESSAGE);     // override label

  const isMutation = ['POST','PUT','PATCH','DELETE'].includes(req.method);

  if (!isMutation || silent) return next(req);

  return next(req).pipe(
    tap({
      next:  ()  => toast.show('success', custom?.success ?? resolveSuccess(req)),
      error: (e) => toast.show('danger',  custom?.error   ?? resolveError(req, e)),
    }),
  );
};
```

**Only mutations are toasted** — GET requests are silent.

---

## 3. Message Registry

URL patterns are matched to produce human-readable labels.
No magic strings scattered in feature code.

```ts
// packages/mockoto-ui/core/src/lib/toast/toast-messages.ts

const RESOURCE_LABELS: Record<string, string> = {
  '/collections':    'Collection',
  '/rules':          'Rule',
  '/rule-responses': 'Response',
  '/projects':       'Project',
};

const METHOD_VERBS: Record<string, string> = {
  POST:   'created',
  PUT:    'updated',
  PATCH:  'updated',
  DELETE: 'deleted',
};

export function resolveSuccess(req: HttpRequest<unknown>): string {
  const label = matchLabel(req.url);
  const verb  = METHOD_VERBS[req.method] ?? 'saved';
  return label ? `${label} ${verb}` : 'Saved';
}

export function resolveError(req: HttpRequest<unknown>, err: HttpErrorResponse): string {
  if (err.status === 0)   return 'Network error — check your connection';
  if (err.status === 401) return 'Session expired — please reload';
  if (err.status === 403) return 'Permission denied';
  if (err.status === 404) return 'Not found';
  if (err.status >= 500)  return 'Server error — please try again';

  const label = matchLabel(req.url);
  return label ? `Failed to ${METHOD_VERBS[req.method] ?? 'save'} ${label.toLowerCase()}` : 'Request failed';
}
```

**Result examples:**

| Request               | Toast level | Message               |
|-----------------------|-------------|-----------------------|
| POST /collections     | success     | Collection created    |
| PATCH /rules/abc      | success     | Rule updated          |
| DELETE /rule-responses/xyz | success | Response deleted     |
| POST /rules (500)     | danger      | Server error — please try again |
| PATCH /collections (network) | danger | Network error — check your connection |

---

## 4. Opt-out & Override (HttpContext tokens)

For cases where the default behavior is wrong (e.g. silent background saves, custom copy).

```ts
// packages/mockoto-ui/core/src/lib/toast/toast-context.ts

export const TOAST_SILENT  = new HttpContextToken<boolean>(() => false);
export const TOAST_MESSAGE = new HttpContextToken<{ success?: string; error?: string } | null>(() => null);
```

**Usage in a service:**
```ts
// Silent (no toast at all)
this.http.patch(url, body, {
  context: new HttpContext().set(TOAST_SILENT, true),
});

// Custom message
this.http.post(url, body, {
  context: new HttpContext().set(TOAST_MESSAGE, {
    success: 'Collection activated',
    error:   'Failed to activate collection',
  }),
});
```

---

## 5. Toast Host Component

Mounted **once** in `ShellComponent`, renders the active toasts stack.

```ts
// packages/mockoto-ui/design-system/src/lib/toast/toast-host.component.ts
```

Renders as a fixed portal (bottom-right), stacks up, each toast:
- Has a colored left border by level
- Has an icon (✓ / ⚠ / ✕)
- Has a message and auto-dismiss progress bar
- Can be manually dismissed

---

## 6. Wire-up

```ts
// apps/mockoto-ui/src/app/app.config.ts
provideHttpClient(
  withInterceptors([toastInterceptor]),
),
```

Shell template:
```html
<mk-toast-host />
```

---

## Summary

| File | Responsibility |
|------|---------------|
| `toast.service.ts` | Signal state, show/dismiss API |
| `toast.interceptor.ts` | Intercepts mutations, resolves message, calls service |
| `toast-messages.ts` | URL → label mapping, error → message mapping |
| `toast-context.ts` | `TOAST_SILENT` and `TOAST_MESSAGE` HttpContext tokens |
| `toast-host.component.ts` | Renders the toast stack in the shell |

**Zero changes needed in any feature service or component** for the default behavior.
Custom messages require one `HttpContext` object at the call site.
