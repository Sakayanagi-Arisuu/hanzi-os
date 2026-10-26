export function offlineFallbackAssetRequest(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname !== '/offline.html' || !['GET', 'HEAD'].includes(request.method)) return request;
  // Workers Assets canonicalizes HTML to extensionless URLs. Resolve that
  // internally so the install-critical fetch does not need a browser redirect.
  url.pathname = '/offline';
  return new Request(url, request);
}

export function isAuthNavigationPreload(request: Request): boolean {
  return request.method === 'GET'
    && request.headers.has('service-worker-navigation-preload')
    && /^\/auth(?:\/|$)/.test(new URL(request.url).pathname);
}

/** Public Cloudflare ingress must never inherit identity from caller-supplied proxy headers. */
export function directHostingRequest(request: Request, provider?: string): Request {
  if (provider !== 'cloudflare') return request;
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('oai-') || name.startsWith('x-forwarded-') || name === 'forwarded') headers.delete(name);
  }
  const url = new URL(request.url);
  headers.set('host', url.host);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.slice(0, -1));
  return new Request(request, { headers });
}

export function androidAssetLinks(packageName?: string, fingerprints?: string) {
  if (!packageName || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(packageName)) return null;
  const hashes = fingerprints?.split(',').map(value => value.trim().toUpperCase()) ?? [];
  if (!hashes.length || hashes.some(value => !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value))) return null;
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: {
    namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: [...new Set(hashes)],
  } }];
}
