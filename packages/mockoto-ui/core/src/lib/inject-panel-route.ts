import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

export interface PanelRoute {
  entityId: string | null;
  mode: 'create' | 'edit';
}

export function injectPanelRoute(): PanelRoute {
  const route = inject(ActivatedRoute);
  const routeId = route.snapshot.paramMap.get('id')!;
  const entityId: string | null = routeId === 'new' ? null : routeId;
  const mode: 'create' | 'edit' = entityId ? 'edit' : 'create';
  return { entityId, mode };
}
