import { Route } from '@angular/router';
import { ProjectsListComponent } from './projects-list/projects-list.component';

export const projectsRoutes: Route[] = [
  {
    path: '',
    component: ProjectsListComponent,
  },
  {
    path: ':projectId',
    children: [
      { path: '', redirectTo: 'sessions', pathMatch: 'full' },
      {
        path: 'sessions',
        loadChildren: () =>
          import('../sessions/sessions.routes').then(m => m.sessionsRoutes),
      },
    ],
  },
];
