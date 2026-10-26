import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] ?? '');
assert.equal(origin.protocol, 'https:', 'A hosted HTTPS origin is required');
assert.equal(origin.pathname, '/', 'Pass the origin without a path');
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash);
const get = (path, options = {}) => fetch(new URL(path, origin), {
  redirect: 'manual', signal: AbortSignal.timeout(30_000), ...options,
});

for (const path of ['/welcome', '/signin', '/privacy', '/delete-account', '/offline-shell']) {
  const response = await get(path);
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assert.match(await response.text(), /HANZI/);
  console.log(`OK ${path}`);
}
const manifestResponse = await get('/manifest.webmanifest');
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.scope, '/');
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
for (const icon of manifest.icons.filter(icon => icon.type === 'image/png')) {
  const response = await get(icon.src);
  assert.equal(response.status, 200, icon.src);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
}
const sw = await get('/sw.js');
assert.equal(sw.status, 200);
assert.match(sw.headers.get('content-type') ?? '', /javascript/);
assert.match(await sw.text(), /offline-shell/);

// A direct public host must not trust caller-supplied legacy identity headers.
const anonymous = await get('/api/account/security', { headers: {
  'oai-authenticated-user-email': 'spoof-check@example.test',
  'oai-authenticated-user-full-name': 'Spoof check',
  'x-forwarded-host': 'attacker.example.test',
} });
assert.equal(anonymous.status, 401, 'Forged identity must stay anonymous (and DB must be available)');
assert.equal((await anonymous.json()).error.code, 'AUTH_REQUIRED');
console.log('OK install manifest, PNG dimensions, service worker and anonymous auth boundary');
console.log('Hosted read-only checks passed. This does not certify offline journeys or production content readiness.');
