import { expect, it } from 'vitest';
import { androidAssetLinks, directHostingRequest, isAuthNavigationPreload, offlineFallbackAssetRequest } from './directHosting';

it.each(['GET', 'HEAD'])('resolves the offline fallback internally for %s without an install-time redirect', async method => {
  const original = new Request('https://hanzi.example/offline.html?revision=1', {method, headers: {accept:'text/html'}});
  const assets = {fetch: async (request: Request) => new URL(request.url).pathname === '/offline.html'
    ? new Response(null, {status:307,headers:{location:'/offline'}})
    : new Response(method === 'HEAD' ? null : '<h1>Offline</h1>', {headers:{'content-type':'text/html'}})};
  expect((await assets.fetch(original)).status).toBe(307);
  const mapped = offlineFallbackAssetRequest(original);
  const response = await assets.fetch(mapped);
  expect(response.status).toBe(200);
  expect(response.headers.has('location')).toBe(false);
  expect(mapped.method).toBe(method);
  expect(mapped.url).toBe('https://hanzi.example/offline?revision=1');
  expect(mapped.headers.get('accept')).toBe('text/html');
  expect(original.url).toContain('/offline.html');
});

it('does not rewrite navigation, private routes, assets or write requests', () => {
  for (const path of ['/offline', '/offline-shell', '/api/sync', '/account', '/assets/app.js']) {
    const request = new Request(`https://hanzi.example${path}`);
    expect(offlineFallbackAssetRequest(request)).toBe(request);
  }
  const write = new Request('https://hanzi.example/offline.html', {method:'POST',body:'keep'});
  expect(offlineFallbackAssetRequest(write)).toBe(write);
});

it('suppresses legacy service-worker preloads only for authentication GET navigations', () => {
  for (const path of ['/auth/google/start', '/auth/google/callback', '/auth/facebook/callback']) {
    expect(isAuthNavigationPreload(new Request(`https://hanzi.example${path}`, {
      headers: { 'service-worker-navigation-preload': 'true' },
    }))).toBe(true);
    expect(isAuthNavigationPreload(new Request(`https://hanzi.example${path}`))).toBe(false);
  }
  expect(isAuthNavigationPreload(new Request('https://hanzi.example/lesson/1', {
    headers: { 'service-worker-navigation-preload': 'true' },
  }))).toBe(false);
});

it('strips forged host identities and forwarded origin while retaining native credentials and POST body', async () => {
  const request = new Request('https://hanzi.example/api/sync', { method: 'POST', body: '{"answer":1}', headers: {
    'oai-authenticated-user-email': 'admin@example.com', 'OAI-Authenticated-User-Full-Name': 'Admin',
    'x-forwarded-host': 'localhost:3000', 'x-forwarded-proto': 'http', forwarded: 'host=localhost',
    cookie: 'native-session=sample', 'x-learning-owner': 'owner-a', origin: 'https://hanzi.example',
  } });
  const safe = directHostingRequest(request, 'cloudflare');
  expect(safe.headers.has('oai-authenticated-user-email')).toBe(false);
  expect(safe.headers.has('oai-authenticated-user-full-name')).toBe(false);
  expect(safe.headers.has('forwarded')).toBe(false);
  expect(safe.headers.get('x-forwarded-host')).toBe('hanzi.example');
  expect(safe.headers.get('x-forwarded-proto')).toBe('https');
  expect(safe.headers.get('cookie')).toBe('native-session=sample');
  expect(safe.headers.get('x-learning-owner')).toBe('owner-a');
  expect(await safe.text()).toBe('{"answer":1}');
});
it('preserves the existing trusted-host adapter outside direct Cloudflare deployment', () => {
  const request = new Request('https://host.example/');
  expect(directHostingRequest(request)).toBe(request);
});
it('publishes only configured valid Android signing fingerprints', () => {
  const hash = Array(32).fill('AB').join(':');
  expect(androidAssetLinks('vn.hanzi.app', `${hash},${hash}`)?.[0]?.target.sha256_cert_fingerprints).toEqual([hash]);
  expect(androidAssetLinks()).toBeNull();
  expect(androidAssetLinks('not a package', hash)).toBeNull();
  expect(androidAssetLinks('vn.hanzi.app', 'upload-key-placeholder')).toBeNull();
  expect(androidAssetLinks('vn.hanzi.app', `${hash},bad`)).toBeNull();
});
