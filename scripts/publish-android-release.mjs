import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyAndroidProject, androidLinkConfig } from './android-project.mjs';
import { verifyCapacitorProject } from './capacitor-project.mjs';

const config = process.argv.includes('--capacitor') ? await verifyCapacitorProject() : await verifyAndroidProject();
const receipt = JSON.parse(await readFile('tmp/android-release/release.json', 'utf8'));
const apk = resolve(`tmp/android-release/HANZI.OS-${config.versionName}.apk`);
const bytes = await readFile(apk);
const hash = createHash('sha256').update(bytes).digest('hex');
if (receipt.signatureVerified !== true || receipt.origin !== config.origin || receipt.androidPackage !== config.applicationId
  || receipt.versionCode !== config.versionCode || receipt.versionName !== config.versionName || receipt.apkSha256 !== hash
  || receipt.androidFingerprints?.length !== 1 || bytes.length > 25 * 1024 * 1024) throw new Error('APK release receipt mismatch or hosting asset limit exceeded');
const link = androidLinkConfig(config, receipt.androidFingerprints[0]);
const tools = JSON.parse(await readFile('config/android-tools.local.json', 'utf8'));
const signature = spawnSync(resolve(tools.jdkHome, 'bin/java.exe'), ['-jar',
  resolve(tools.sdkHome, `build-tools/${config.buildToolsVersion}/lib/apksigner.jar`), 'verify', '--print-certs', apk],
{ encoding: 'utf8', windowsHide: true });
if (signature.status !== 0 || signature.stdout.match(/certificate SHA-256 digest:\s*([a-f\d]{64})/i)?.[1]?.toUpperCase()
  !== link.androidFingerprints[0].replaceAll(':', '')) throw new Error('APK signature must match its public certificate before publication');
const hosted = JSON.parse(await readFile('config/cloudflare-release.local.json', 'utf8'));
if (hosted.origin !== config.origin) throw new Error('APK and hosted origin must match before publication');
const filename = `hanzi-os-${config.versionName}.apk`;
const previous = await readFile('public/downloads/android-release.json', 'utf8')
  .then(JSON.parse, error => { if (error.code === 'ENOENT') return null; throw error; });
if (previous && (previous.androidPackage !== config.applicationId
  || previous.androidFingerprints?.[0] !== link.androidFingerprints[0])) throw new Error('The published signing identity changed. Recover the original release key before updating the app.');
if (previous && (config.versionCode < previous.versionCode
  || (config.versionCode === previous.versionCode && hash !== previous.apkSha256))) throw new Error('A changed APK needs a higher versionCode');
const existing = await readFile(`public/downloads/${filename}`)
  .then(value => createHash('sha256').update(value).digest('hex'), error => { if (error.code === 'ENOENT') return null; throw error; });
if (existing && existing !== hash) throw new Error('Do not replace a versioned APK. Increase versionName for a new download URL.');
await mkdir('public/downloads', { recursive: true });
await copyFile(apk, `public/downloads/${filename}`);
await writeFile('public/downloads/android-release.json', JSON.stringify({ ...receipt, apkUrl: `${config.origin}/downloads/${filename}`,
  byteLength: bytes.length, minAndroidVersion: '7.0' }, null, 2) + '\n');
await writeFile('config/cloudflare-release.local.json', JSON.stringify({ ...hosted, ...link }, null, 2) + '\n');
console.log('Verified Android download staged and public certificate configured locally. Run hosting:prepare/build:cloudflare/deploy to publish. No signing secrets were copied.');
