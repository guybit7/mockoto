import { Route } from '@angular/router';
import { dirtyGuard } from '@mockoto-ui/core';

export const collectionsRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./project-layout/project-layout.component').then(m => m.ProjectLayoutComponent),
    children: [
      {
        path: ':id',
        outlet: 'panel',
        canDeactivate: [dirtyGuard],
        loadComponent: () =>
          import('./collection-panel/collection-panel.component').then(m => m.CollectionPanelComponent),
      },
      {
        path: ':collectionId/rules',
        loadChildren: () =>
          import('@mockoto-ui/features/rules').then(m => m.rulesRoutes),
      },
    ],
  },
];
