import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '@mockoto-ui/core';
import { ActiveRouteService } from '../../core/services/active-route.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  protected readonly activeRoute = inject(ActiveRouteService);

  private readonly themeService = inject(ThemeService);
  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');
  protected toggle(): void { this.themeService.toggle(); }
}
