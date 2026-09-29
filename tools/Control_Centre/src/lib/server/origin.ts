export function isRequestAllowed(
  method: string,
  host: string | null,
  origin: string | null,
  allowedHosts: readonly string[]
): boolean {
  if (host === null || !allowedHosts.includes(host)) return false;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (origin === null || origin === "null") return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  return parsed.origin === `http://${host}`;
}
