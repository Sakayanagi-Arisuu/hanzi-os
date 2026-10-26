import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateAndroidConfig(input) {
  if (!input || input.schemaVersion !== 1) throw new Error('Invalid Android configuration');
  if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(input.applicationId ?? '')) throw new Error('Invalid Android package ID');
  const origin = new URL(input.origin);
  if (origin.protocol !== 'https:' || origin.port || origin.username || origin.password
    || origin.pathname !== '/' || origin.search || origin.hash || !origin.hostname.includes('.')
    || /(^|\.)localhost$|^127\.|^0\./.test(origin.hostname)) throw new Error('Use a public HTTPS origin without a path');
  if (!Number.isSafeInteger(input.versionCode) || input.versionCode < 1 || input.versionCode > 2_100_000_000
    || !/^\d+\.\d+\.\d+$/.test(input.versionName ?? '')) throw new Error('Invalid Android version');
  if (typeof input.appName !== 'string' || !input.appName.trim() || input.appName.length > 60
    || /[<>]/.test(input.appName) || [...input.appName].some(char => char.codePointAt(0) < 32)) throw new Error('Invalid application name');
  if (input.minSdk !== 24 || input.compileSdk !== 36 || input.targetSdk !== 36
    || input.buildToolsVersion !== '36.0.0' || input.androidGradlePlugin !== '8.13.2'
    || input.browserHelperVersion !== '2.7.4' || input.gradleVersion !== '8.13'
    || input.gradleDistributionSha256 !== '20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78'
    || input.gradleWrapperSha256 !== '81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f') {
    throw new Error('Android toolchain differs from the verified dependency matrix');
  }
  return { ...input, origin: origin.origin };
}

const androidString = value => String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')
  .replaceAll("'", "\\'").replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function androidResources(config) {
  const statements = [{ relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'web', site: config.origin } }];
  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${androidString(config.appName)}</string>\n    <string name="asset_statements" translatable="false">${androidString(JSON.stringify(statements))}</string>\n</resources>\n`;
}

export function androidLinkConfig(config, fingerprint) {
  if (!/^(?:[\dA-F]{2}:){31}[\dA-F]{2}$/i.test(fingerprint ?? '')) throw new Error('A verified signing certificate is required');
  return { androidPackage: config.applicationId, androidFingerprints: [fingerprint.toUpperCase()] };
}

export async function prepareAndroidProject(root = process.cwd()) {
  const config = validateAndroidConfig(JSON.parse(await readFile(resolve(root, 'android/twa-config.json'), 'utf8')));
  const resources = resolve(root, 'android/app/src/main/res');
  for (const dir of ['values', 'mipmap-xxxhdpi', 'drawable-nodpi']) await mkdir(resolve(resources, dir), { recursive: true });
  await writeFile(resolve(resources, 'values/strings.xml'), androidResources(config));
  await copyFile(resolve(root, 'public/icons/icon-192.png'), resolve(resources, 'mipmap-xxxhdpi/ic_launcher.png'));
  await copyFile(resolve(root, 'public/icons/maskable-512.png'), resolve(resources, 'drawable-nodpi/launcher_foreground.png'));
  return config;
}

export async function verifyAndroidProject(root = process.cwd()) {
  const read = path => readFile(resolve(root, path), 'utf8');
  const config = validateAndroidConfig(JSON.parse(await read('android/twa-config.json')));
  const wrapper = await readFile(resolve(root, 'android/gradle/wrapper/gradle-wrapper.jar'));
  if (createHash('sha256').update(wrapper).digest('hex') !== config.gradleWrapperSha256) throw new Error('Gradle wrapper integrity mismatch');
  const properties = await read('android/gradle/wrapper/gradle-wrapper.properties');
  if (!properties.includes(`distributionSha256Sum=${config.gradleDistributionSha256}`)
    || !properties.includes('gradle-8.13-bin.zip')) throw new Error('Gradle distribution integrity binding missing');
  const manifest = await read('android/app/src/main/AndroidManifest.xml');
  if (!manifest.includes('com.google.androidbrowserhelper.trusted.LauncherActivity')
    || !manifest.includes('android:host="${launchHost}"') || !manifest.includes('android:value="${startUrl}"')
    || !manifest.includes('android:autoVerify="true"') || !manifest.includes('android:usesCleartextTraffic="false"')
    || !manifest.includes('android:value="customtabs"') || /webview|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE/i.test(manifest)) {
    throw new Error('Android launch/security contract mismatch');
  }
  if (await read('android/app/src/main/res/values/strings.xml') !== androidResources(config)) throw new Error('Android website association drift');
  const gradle = await read('android/app/build.gradle');
  if (!gradle.includes('Release signing is required') || !gradle.includes('config.applicationId')
    || !(await read('android/build.gradle')).includes("version '8.13.2'")) throw new Error('Android release identity/signing guard missing');
  for (const [source, generated] of [['public/icons/icon-192.png', 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'],
    ['public/icons/maskable-512.png', 'android/app/src/main/res/drawable-nodpi/launcher_foreground.png']]) {
    const [original, copy] = await Promise.all([readFile(resolve(root, source)), readFile(resolve(root, generated))]);
    if (!original.equals(copy)) throw new Error('Android icon provenance mismatch');
  }
  return config;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv[2] === 'prepare') await prepareAndroidProject();
    else if (process.argv[2] !== 'verify') throw new Error('Usage: android-project.mjs prepare|verify');
    const config = await verifyAndroidProject();
    console.log(`Android source contract verified: ${config.applicationId}, version ${config.versionName}. This is not APK compilation.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
