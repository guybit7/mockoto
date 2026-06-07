export function isValidBaseUrl(value: string): boolean {
  if (/^https?:\/\/.+/.test(value)) return true;
  // Allow bare hostname/IP with optional port and path (e.g. localhost:3000, 0.0.0.0:8080, 192.168.1.1:3000)
  const m = /^([a-zA-Z0-9][a-zA-Z0-9.-]*)(:\d+)?(\/.*)?$/.exec(value);
  if (!m) return false;
  const port = m[2] ? Number(m[2].slice(1)) : null;
  return port === null || (port >= 1 && port <= 65535);
}
