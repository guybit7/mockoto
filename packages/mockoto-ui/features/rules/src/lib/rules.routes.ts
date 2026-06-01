import { Route } from '@angular/router';
import { dirtyGuard } from '@mockoto-ui/core';

export const rulesRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./rules-page/rules-page.component').then(m => m.RulesPageComponent),
    children: [
      {
        path: ':id',
        outlet: 'panel',
        canDeactivate: [dirtyGuard],
        loadComponent: () =>
          import('./rule-panel/rule-panel.component').then(m => m.RulePanelComponent),
      },
    ],
  },
];
