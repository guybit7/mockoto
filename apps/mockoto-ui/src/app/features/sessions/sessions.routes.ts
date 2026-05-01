import { Route } from '@angular/router';
import { SessionsListComponent } from './sessions-list/sessions-list.component';

export const sessionsRoutes: Route[] = [
  {
    path: '',
    component: SessionsListComponent,
  },
  {
    path: ':sessionId',
    children: [
      { path: '', redirectTo: 'mocks', pathMatch: 'full' },
      {
        path: 'mocks',
        loadChildren: () =>
          import('../mocks/mocks.routes').then(m => m.mocksRoutes),
      },
    ],
  },
];
