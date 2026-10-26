import { readFile, copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { validateAndroidConfig } from './android-project.mjs';
import sharp from 'sharp';

export async function verifyCapacitorProject(root = process.cwd()) {
  const read = path => readFile(resolve(root, path), 'utf8');
  const config = JSON.parse(await read('mobile/release-config.json'));
  validateAndroidConfig({ ...config, browserHelperVersion: '2.7.4' });
  if (config.capacitorVersion !== '8.5.3' || config.versionCode <= 1) throw new Error('Invalid native release matrix');
  const capacitor = await read('capacitor.config.ts');
  if (/server:\s*\{[^}]*\burl\s*:/.test(capacitor) || /allowNavigation/.test(capacitor)
    || !capacitor.includes("webDir: 'tmp/capacitor-web'") || !capacitor.includes("webContentsDebuggingEnabled: false")) throw new Error('The app must run packaged trusted UI, never a remote website in the privileged WebView');
  const manifest = await read('mobile/android/app/src/main/AndroidManifest.xml');
  for (const marker of ['android:allowBackup="false"', 'android:usesCleartextTraffic="false"', 'android:scheme="com.regulus.hanzios"', 'android:host="auth"']) {
    if (!manifest.includes(marker)) throw new Error('Native security contract missing: ' + marker);
  }
  const wrapper = await readFile(resolve(root, 'mobile/android/gradle/wrapper/gradle-wrapper.jar'));
  if (createHash('sha256').update(wrapper).digest('hex') !== config.gradleWrapperSha256) throw new Error('Gradle wrapper integrity mismatch');
  if (!(await read('mobile/android/gradle/wrapper/gradle-wrapper.properties')).includes(`distributionSha256Sum=${config.gradleDistributionSha256}`)) throw new Error('Unpinned Gradle distribution');
  const gradle = await read('mobile/android/app/build.gradle');
  if (!gradle.includes('Release signing is required') || !gradle.includes('releaseConfig.versionCode')) throw new Error('Signed update identity guard missing');
  const assets = await read('tmp/capacitor-web/index.html');
  if (!assets.includes('Content-Security-Policy') || !assets.includes('/assets/')) throw new Error('Packaged UI is missing');
  if (assets !== await read('mobile/android/app/src/main/assets/public/index.html')) throw new Error('Run capacitor:prepare after building the UI; the copied app entry is stale');
  for (const name of await readdir(resolve(root, 'tmp/capacitor-web/assets'))) {
    if (!/\.(js|css)$/.test(name)) continue;
    const generated = await readFile(resolve(root, 'tmp/capacitor-web/assets', name));
    const copied = await readFile(resolve(root, 'mobile/android/app/src/main/assets/public/assets', name));
    if (!generated.equals(copied)) throw new Error('Copied app code is stale: ' + name);
  }
  const installed = JSON.parse(await read('node_modules/@capacitor/android/package.json'));
  if (installed.version !== config.capacitorVersion) throw new Error('Capacitor dependency drift');
  return config;
}
export async function prepareCapacitorProject() {
  for (const dir of ['mipmap-xxxhdpi', 'drawable-nodpi']) await mkdir(resolve('mobile/android/app/src/main/res', dir), { recursive: true });
  for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
    const bytes = await sharp('public/icons/icon-192.png').resize(size, size).png().toBuffer();
    for (const icon of ['ic_launcher.png', 'ic_launcher_round.png']) await writeFile(resolve('mobile/android/app/src/main/res/mipmap-' + density, icon), bytes);
  }
  await copyFile('public/icons/maskable-512.png', 'mobile/android/app/src/main/res/drawable-nodpi/hanzi_foreground.png');
  const resourceRoot = resolve('mobile/android/app/src/main/res');
  for (const entry of await readdir(resourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('drawable')) continue;
    const splash = resolve(resourceRoot, entry.name, 'splash.png');
    const metadata = await sharp(splash).metadata().catch(() => null);
    if (!metadata?.width || !metadata.height) continue;
    const size = Math.round(Math.min(metadata.width, metadata.height) * .32);
    const icon = await sharp('public/icons/maskable-512.png').resize(size, size).png().toBuffer();
    await sharp({ create: { width: metadata.width, height: metadata.height, channels: 4, background: '#021511' } })
      .composite([{ input: icon, gravity: 'centre' }]).png().toFile(splash + '.new');
    const bytes = await readFile(splash + '.new'); await writeFile(splash, bytes);
    await import('node:fs/promises').then(fs => fs.unlink(splash + '.new'));
  }
  await copyFile('node_modules/@capacitor/core/LICENSE', 'mobile/android/app/src/main/assets/CAPACITOR-LICENSE.txt');
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv[2] === 'prepare') await prepareCapacitorProject();
  else await verifyCapacitorProject();
}
