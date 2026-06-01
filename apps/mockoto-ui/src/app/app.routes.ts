import { Route } from '@angular/router';
import { ShellComponent } from '@mockoto-ui/common';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('@mockoto-ui/features/home').then(m => m.homeRoutes),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('@mockoto-ui/features/projects').then(m => m.projectsRoutes),
      },
    ],
  },
  {
    path: 'response-viewer',
    loadComponent: () =>
      import('./response-viewer/response-viewer.component').then(m => m.ResponseViewerComponent),
  },
  { path: '**', redirectTo: 'home' },
];
