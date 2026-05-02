import { createHash } from 'crypto';

function canonicalJson(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value ?? '';
  }
}

export function ruleLookupHash(
  url: string,
  method: string,
  requestBody?: string | null,
): string {
  return createHash('sha256')
    .update(`${url}:${method}:${canonicalJson(requestBody)}`)
    .digest('hex');
}
