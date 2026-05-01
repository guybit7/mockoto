import { Route } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'projects', pathMatch: 'full' },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/projects.routes').then(m => m.projectsRoutes),
      },
    ],
  },
  { path: '**', redirectTo: 'projects' },
];
