import { Injectable } from '@angular/core';
import type { Rule } from '@mockoto/shared';

const PROXY_BASE = 'http://localhost:3001';
const NO_BODY    = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable({ providedIn: 'root' })
export class RuleTestService {
  openInBrowser(rule: Rule, projectId: string): void {
    const url    = `${PROXY_BASE}/${projectId}${rule.url}`;
    const method = rule.requestMethod;

    if (NO_BODY.has(method)) { window.open(url, '_blank'); return; }

    const params = new URLSearchParams({ method, url });
    if (rule.requestBody) {
      params.set('body', btoa(rule.requestBody as string));
    }

    const viewerUrl = `${window.location.origin}/response-viewer?${params.toString()}`;
    window.open(viewerUrl, '_blank');
  }
}
