import { inject } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '../http/http.service';

export abstract class ResourceService {
  protected readonly http = inject(HttpService);

  protected fetch<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(path));
  }

  protected create<T>(path: string, body: unknown, context?: HttpContext): Promise<T> {
    return firstValueFrom(this.http.post<T>(path, body, context));
  }

  protected update<T>(path: string, body: unknown, context?: HttpContext): Promise<T> {
    return firstValueFrom(this.http.put<T>(path, body, context));
  }

  protected modify<T>(path: string, body: unknown, context?: HttpContext): Promise<T> {
    return firstValueFrom(this.http.patch<T>(path, body, context));
  }

  protected remove(path: string, context?: HttpContext): Promise<void> {
    return firstValueFrom(this.http.delete<void>(path, context));
  }
}
