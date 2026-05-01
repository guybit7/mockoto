import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-mocks-list',
  imports: [],
  templateUrl: './mocks-list.component.html',
})
export class MocksListComponent {
  @Input() projectId?: string;
  @Input() sessionId?: string;
}
