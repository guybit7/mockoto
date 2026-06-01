import { Route } from '@angular/router';
import { dirtyGuard } from '@mockoto-ui/core';

export const projectsRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./projects-page/projects-page.component').then(m => m.ProjectsPageComponent),
    children: [
      {
        path: ':id',
        outlet: 'panel',
        canDeactivate: [dirtyGuard],
        loadComponent: () =>
          import('./project-panel/project-panel.component').then(m => m.ProjectPanelComponent),
      },
    ],
  },
  {
    path: ':projectId',
    loadComponent: () =>
      import('./project-workspace/project-workspace.component').then(m => m.ProjectWorkspaceComponent),
    children: [
      {
        path: 'collections',
        loadChildren: () =>
          import('@mockoto-ui/features/collections').then(m => m.collectionsRoutes),
      },
    ],
  },
];
