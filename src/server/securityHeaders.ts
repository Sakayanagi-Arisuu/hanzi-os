export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "content-security-policy": CONTENT_SECURITY_POLICY,
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": [
    "accelerometer=()",
    "camera=()",
    "display-capture=()",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=(self)",
    "payment=()",
    "usb=()",
  ].join(", "),
  "x-permitted-cross-domain-policies": "none",
};

/** Single-use credentials in the initial action URL must not enter asset/API referrers or caches. */
export function securityHeadersForPath(pathname: string): Readonly<Record<string, string>> {
  if (pathname.replace(/\/+$/u, '') !== '/auth/hanzi/action') return SECURITY_HEADERS;
  return { ...SECURITY_HEADERS, 'referrer-policy': 'no-referrer',
    'cache-control': 'private, no-store, max-age=0', 'x-robots-tag': 'noindex, nofollow' };
}

/** The browser still reads its initial address once; the server renderer must
 * not serialize the email action credential into router/hydration payloads. */
export function emailActionRenderingRequest(request: Request): Request {
  const url = new URL(request.url);
  if (!['GET', 'HEAD'].includes(request.method) || url.pathname.replace(/\/+$/u, '') !== '/auth/hanzi/action') return request;
  url.search = ''; url.hash = '';
  const headers = new Headers(request.headers);
  for (const name of ['next-url', 'next-router-state-tree', 'referer']) headers.delete(name);
  return new Request(url, { method: request.method, headers, signal: request.signal });
}
