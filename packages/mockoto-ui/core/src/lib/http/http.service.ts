import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_BASE_URL } from './http.config';

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(HTTP_BASE_URL);

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`);
  }

  post<T>(path: string, body: unknown, context?: HttpContext): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, { context });
  }

  put<T>(path: string, body: unknown, context?: HttpContext): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body, { context });
  }

  patch<T>(path: string, body: unknown, context?: HttpContext): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, { context });
  }

  delete<T>(path: string, context?: HttpContext): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`, { context });
  }
}
