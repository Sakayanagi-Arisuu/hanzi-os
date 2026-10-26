import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { validateAndroidConfig } from './android-project.mjs';
import { verifyCapacitorProject } from './capacitor-project.mjs';

const config = process.argv.includes('--capacitor') ? await verifyCapacitorProject() : validateAndroidConfig(JSON.parse(await readFile('android/twa-config.json', 'utf8')));
const expected = JSON.parse(await readFile('tmp/android-release/release.json', 'utf8'));
const get = path => fetch(new URL(path, config.origin), { redirect: 'error', signal: AbortSignal.timeout(60_000) });
const linksResponse = await get('/.well-known/assetlinks.json');
assert.equal(linksResponse.status, 200, 'Website association must be published');
const links = await linksResponse.json();
assert.ok(links.some(link => link.relation.includes('delegate_permission/common.handle_all_urls')
  && link.target.namespace === 'android_app' && link.target.package_name === config.applicationId
  && link.target.sha256_cert_fingerprints.includes(expected.androidFingerprints[0])), 'Signing certificate association mismatch');
const metadataResponse = await get('/downloads/android-release.json');
assert.equal(metadataResponse.status, 200);
const metadata = await metadataResponse.json();
assert.equal(metadata.apkSha256, expected.apkSha256);
assert.equal(metadata.versionCode, config.versionCode);
const apkUrl = new URL(metadata.apkUrl);
assert.equal(apkUrl.origin, config.origin);
assert.equal(apkUrl.pathname, `/downloads/hanzi-os-${config.versionName}.apk`);
const apkResponse = await get(apkUrl.pathname);
assert.equal(apkResponse.status, 200);
assert.match(apkResponse.headers.get('content-type') ?? '', /application\/(vnd\.android\.package-archive|octet-stream)/);
const bytes = Buffer.from(await apkResponse.arrayBuffer());
assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304', 'APK must be a ZIP package, not an HTML fallback');
assert.equal(bytes.length, metadata.byteLength);
assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.apkSha256, 'Hosted APK bytes differ from the signature-verified release');
await writeFile('tmp/android-release/hosted-verified.json', JSON.stringify({
  verifiedAt: new Date().toISOString(), androidPackage: config.applicationId,
  versionCode: config.versionCode, versionName: config.versionName,
  apkUrl: apkUrl.href, byteLength: bytes.length, apkSha256: expected.apkSha256,
  assetLinksMatch: true, hostedBytesMatch: true, physicalDeviceTested: false,
}, null, 2) + '\n');
console.log('Hosted APK download matches the signed release; HTTPS website association matches its package/certificate. Physical Android installation remains a device test.');
