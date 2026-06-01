const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

const STRIP_RESPONSE = new Set([...HOP_BY_HOP, 'content-encoding', 'content-length']);

export type ForwardRequest = {
  baseUrl: string;
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string | null;
};

export type ForwardResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export class RequestForwarder {
  async forward(req: ForwardRequest): Promise<ForwardResult> {
    const url = `${req.baseUrl.replace(/\/$/, '')}${req.path}`;

    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(key.toLowerCase()) && val !== undefined) {
        headers[key] = Array.isArray(val) ? val.join(', ') : val;
      }
    }
    delete headers['host'];

    const hasBody =
      req.body !== null && !['GET', 'HEAD'].includes(req.method.toUpperCase());

    try {
      const res = await fetch(url, {
        method: req.method,
        headers,
        ...(hasBody ? { body: req.body } : {}),
      });

      const body = await res.text();
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        if (!STRIP_RESPONSE.has(key.toLowerCase())) responseHeaders[key] = val;
      });

      return { statusCode: res.status, headers: responseHeaders, body };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Failed to reach upstream server.', error: message }),
      };
    }
  }
}
