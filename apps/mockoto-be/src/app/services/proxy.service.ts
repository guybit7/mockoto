// import { randomUUID } from 'crypto';
import { ProjectsRepository, ProjectRow } from '../repositories/projects.repository';
import { MockResolver } from './mock-resolver';
import { RequestForwarder, ForwardResult } from './request-forwarder';
import { ResponseRecorder } from './response-recorder';
import { CollectionRow } from '../repositories/collections.repository';
import { RecordingStrategy } from '@mockoto/shared';

// TODO: re-enable applyTemplate once the UI exposes a per-rule toggle for template variables.
// Variables supported: {{$uuid}}, {{$timestamp}}, {{$isodate}}, {{$body.path.to.field}}
//
// function applyTemplate(bodyStr: string, requestBody: string | null): string {
//   let out = bodyStr;
//   out = out.replace(/\{\{\s*\$uuid\s*\}\}/g, () => randomUUID());
//   out = out.replace(/\{\{\s*\$timestamp\s*\}\}/g, () => String(Math.floor(Date.now() / 1000)));
//   out = out.replace(/\{\{\s*\$isodate\s*\}\}/g, () => new Date().toISOString());
//
//   if (requestBody) {
//     try {
//       const parsed: unknown = JSON.parse(requestBody);
//       out = out.replace(/\{\{\s*\$body\.([^}\s]+)\s*\}\}/g, (_, keyPath: string) => {
//         const value = keyPath.split('.').reduce<unknown>((obj, key) => {
//           if (obj !== null && typeof obj === 'object') {
//             return (obj as Record<string, unknown>)[key];
//           }
//           return undefined;
//         }, parsed);
//         return value !== undefined && value !== null
//           ? typeof value === 'string'
//             ? JSON.stringify(value).slice(1, -1)
//             : String(JSON.stringify(value))
//           : '';
//       });
//     } catch {
//       // Request body is not valid JSON — $body. templates remain unreplaced
//     }
//   }
//   return out;
// }

export type ProxyRequest = {
  projectId: string;
  path: string;
  method: string;
  incomingHeaders: Record<string, string | string[] | undefined>;
  body: string | null;
};

export type ProxyResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string | null;
  latency: number;
};

// Orchestrates a proxied request: resolve mock → serve or forward → record.
// Each collaborator owns one concern; this class owns only the control flow.
export class ProxyOrchestrator {
  constructor(
    private readonly projectsRepo: ProjectsRepository,
    private readonly resolver: MockResolver,
    private readonly forwarder: RequestForwarder,
    private readonly recorder: ResponseRecorder,
  ) {}

  async handle(req: ProxyRequest): Promise<ProxyResult> {
    const project = await this.projectsRepo.findById(req.projectId);
    if (!project) {
      return this.json(404, { message: `No project found for id: ${req.projectId}` });
    }

    const resolution = await this.resolver.resolve(
      project.id,
      req.path,
      req.method,
      req.body,
    );

    switch (resolution.status) {
      case 'no_active_collection':
        return this.json(503, { message: 'No active collection for this project.' });

      case 'no_active_response':
        return this.json(404, { message: 'Rule matched but has no active response.' });

      case 'found': {
        const { response } = resolution;
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (response.headers) {
          try {
            const stored = JSON.parse(response.headers);
            delete stored['content-encoding'];
            delete stored['content-length'];
            Object.assign(headers, stored);
          } catch { /* use stored defaults */ }
        }
        // TODO: replace with applyTemplate(response.body, req.body) once UI toggle is ready.
        return {
          statusCode: response.statusCode,
          headers,
          body: response.body ?? null,
          latency: response.latency ?? 0,
        };
      }

      case 'passthrough':
        // Rule matched but is explicitly marked to forward to the real server.
        return this.forwardAndRecord(req, project, resolution.collection);

      case 'no_matching_rule': {
        const { collection } = resolution;
        if (collection.mode === 'local') {
          return this.json(404, { message: 'No mock found for this request.' });
        }
        return this.forwardAndRecord(req, project, collection);
      }
    }
  }

  // Forwards the request to the upstream server and fires off recording
  // without blocking the response. Recording failures are intentionally swallowed
  // — they must never degrade the proxy response.
  private async forwardAndRecord(
    req: ProxyRequest,
    project: ProjectRow,
    collection: CollectionRow,
  ): Promise<ProxyResult> {
    const forward = await this.forwarder.forward({
      baseUrl: project.baseUrl,
      path: req.path,
      method: req.method,
      headers: req.incomingHeaders,
      body: req.body,
    });

    const strategy = collection.recordingStrategy as RecordingStrategy;
    if (this.recorder.shouldRecord(strategy, forward.statusCode)) {
      void this.fireRecord(project.id, collection.id, req, forward);
    }

    return { ...forward, latency: 0 };
  }

  private fireRecord(
    projectId: string,
    collectionId: string,
    req: ProxyRequest,
    forward: ForwardResult,
  ): Promise<void> {
    return this.recorder
      .record({ projectId, collectionId, path: req.path, method: req.method, body: req.body, result: forward })
      .catch(() => {
        // Recording is best-effort. Log when a real logger is available.
      });
  }

  private json(statusCode: number, payload: object): ProxyResult {
    return {
      statusCode,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      latency: 0,
    };
  }
}
