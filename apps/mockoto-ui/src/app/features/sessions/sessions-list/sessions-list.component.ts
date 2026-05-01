import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sessions-list',
  imports: [],
  templateUrl: './sessions-list.component.html',
})
export class SessionsListComponent {
  @Input() projectId?: string;
}
