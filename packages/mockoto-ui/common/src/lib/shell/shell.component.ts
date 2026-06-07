import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ToastHostComponent } from '../toast/toast-host.component';
import { ConfirmDialogHostComponent } from '../confirm-dialog/confirm-dialog-host.component';

@Component({
  selector: 'mk-shell',
  imports: [RouterOutlet, HeaderComponent, BreadcrumbComponent, ToastHostComponent, ConfirmDialogHostComponent],
  styles: [
    `
      :host-context(.dark) .shell-root {
        background:
          radial-gradient(ellipse 65% 45% at 95% 0%,   rgba(99,102,241,0.09) 0%, transparent 55%),
          radial-gradient(ellipse 55% 40% at 5%  100%, rgba(139,92,246,0.06) 0%, transparent 55%),
          #09090f;
      }
      :host-context(.dark) main {
        background: transparent;
      }
    `,
  ],
  template: `
    <div class="shell-root flex h-screen w-screen flex-col overflow-hidden bg-gray-50 dark:bg-bg">
      <mk-header />
      <div class="flex shrink-0 items-center border-b border-gray-200 bg-white px-6 py-2.5 dark:border-border dark:bg-bg/80 dark:backdrop-blur-md">
        <mk-breadcrumb />
      </div>
      <main class="flex-1 overflow-auto bg-gray-50 dark:bg-bg">
        <router-outlet />
      </main>
      <mk-toast-host />
      <mk-confirm-dialog-host />
    </div>
  `,
})
export class ShellComponent {}
