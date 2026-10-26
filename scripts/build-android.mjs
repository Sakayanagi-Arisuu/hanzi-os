import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyAndroidProject, androidLinkConfig } from './android-project.mjs';
import { verifyCapacitorProject } from './capacitor-project.mjs';

const root = process.cwd();
const capacitor = process.argv.includes('--capacitor');
const config = capacitor ? await verifyCapacitorProject(root) : await verifyAndroidProject(root);
const androidDirectory = capacitor ? 'mobile/android' : 'android';
let tools;
try { tools = JSON.parse(await readFile(resolve(root, 'config/android-tools.local.json'), 'utf8')); }
catch (error) { throw new Error('JDK/Android SDK are not configured. No tools were downloaded or installed. See docs/ANDROID_APP.md.', { cause: error }); }
if (typeof tools.jdkHome !== 'string' || typeof tools.sdkHome !== 'string') throw new Error('Configure approved JDK/SDK paths');
const jdkHome = capacitor ? tools.capacitorJdkHome : tools.jdkHome;
if (!jdkHome) throw new Error('Configure the approved JDK21 for Capacitor. No automatic installation.');
const java = resolve(jdkHome, 'bin/java.exe');
const keytool = resolve(jdkHome, 'bin/keytool.exe');
const sdk = resolve(tools.sdkHome);
const buildTools = resolve(sdk, `build-tools/${config.buildToolsVersion}`);
for (const path of [java, keytool, resolve(buildTools, 'lib/apksigner.jar'), resolve(buildTools, 'aapt2.exe'), resolve(sdk, `platforms/android-${config.compileSdk}/android.jar`)]) {
  await access(path).catch(() => { throw new Error('Approved Android toolchain is incomplete; no automatic installation was attempted.'); });
}
const run = (executable, args, env = process.env, capture = false) => {
  const result = spawnSync(executable, args, { cwd: resolve(root, androidDirectory), env, encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit', windowsHide: true });
  if (result.status !== 0) throw new Error('Android command failed. Preserve the signing files; do not regenerate the key.');
  return result.stdout ?? '';
};
const javaVersion = spawnSync(java, ['-version'], { encoding: 'utf8', windowsHide: true });
if (javaVersion.status !== 0 || !(capacitor ? /version "21\./ : /version "17\./).test(javaVersion.stderr + javaVersion.stdout)) throw new Error('Use the approved project-local JDK');

const secretDir = resolve(root, '.secrets/android-release');
const signingFile = resolve(secretDir, 'signing.json');
const keystore = resolve(secretDir, 'hanzi-os.p12');
await mkdir(secretDir, { recursive: true });
let signing;
try { signing = JSON.parse(await readFile(signingFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  if (await access(keystore).then(() => true, () => false)) throw new Error('Existing key has no credential file. Recover it; do not overwrite it.', { cause: error });
  signing = { schemaVersion: 1, alias: 'hanzi-os', password: randomBytes(32).toString('base64url') };
  await writeFile(signingFile, JSON.stringify(signing), { flag: 'wx', mode: 0o600 });
}
if (signing.schemaVersion !== 1 || signing.alias !== 'hanzi-os' || typeof signing.password !== 'string' || signing.password.length < 32) throw new Error('Invalid saved signing credentials');
const env = { ...process.env, JAVA_HOME: resolve(jdkHome), ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk,
  GRADLE_USER_HOME: resolve(root, 'tmp/android-gradle-cache'), HANZI_ANDROID_KEYSTORE: keystore,
  HANZI_ANDROID_STORE_PASSWORD: signing.password, HANZI_ANDROID_KEY_PASSWORD: signing.password,
  HANZI_ANDROID_KEY_ALIAS: signing.alias };
if (!await access(keystore).then(() => true, () => false)) {
  run(keytool, ['-genkeypair', '-keystore', keystore, '-storetype', 'PKCS12', '-alias', signing.alias,
    '-storepass:env', 'HANZI_ANDROID_STORE_PASSWORD', '-keypass:env', 'HANZI_ANDROID_KEY_PASSWORD',
    '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', 'CN=Regulus'], env, true);
}
const keyInfo = run(keytool, ['-J-Duser.language=en', '-J-Duser.country=US', '-list', '-v', '-keystore', keystore,
  '-alias', signing.alias, '-storepass:env', 'HANZI_ANDROID_STORE_PASSWORD'], env, true);
const fingerprint = keyInfo.match(/SHA256:\s*((?:[A-F\d]{2}:){31}[A-F\d]{2})/i)?.[1]?.toUpperCase();
const linkConfig = androidLinkConfig(config, fingerprint);
run(java, ['-classpath', resolve(root, androidDirectory, 'gradle/wrapper/gradle-wrapper.jar'), 'org.gradle.wrapper.GradleWrapperMain',
  '--no-daemon', ':app:lintRelease', ...(capacitor ? [':app:testReleaseUnitTest'] : []), ':app:assembleRelease'], env);
const apk = resolve(root, androidDirectory, 'app/build/outputs/apk/release/app-release.apk');
const certInfo = run(java, ['-jar', resolve(buildTools, 'lib/apksigner.jar'), 'verify', '--verbose', '--print-certs', apk], env, true);
if (certInfo.match(/certificate SHA-256 digest:\s*([a-f\d]{64})/i)?.[1]?.toUpperCase() !== fingerprint.replaceAll(':', '')) throw new Error('APK signing identity mismatch');
const badging = run(resolve(buildTools, 'aapt2.exe'), ['dump', 'badging', apk], env, true);
if (!badging.includes(`name='${config.applicationId}'`) || !badging.includes(`versionCode='${config.versionCode}'`)
  || !badging.includes(`versionName='${config.versionName}'`)) throw new Error('APK package/version mismatch');
const output = resolve(root, 'tmp/android-release');
await mkdir(output, { recursive: true });
const apkBytes = await readFile(apk);
await copyFile(apk, resolve(output, `HANZI.OS-${config.versionName}.apk`));
await writeFile(resolve(output, 'release.json'), JSON.stringify({ ...linkConfig, origin: config.origin, runtime: capacitor ? 'capacitor' : 'twa',
  versionCode: config.versionCode, versionName: config.versionName,
  apkSha256: createHash('sha256').update(apkBytes).digest('hex'), signatureVerified: true }, null, 2) + '\n');
console.log(`Signed APK verified in tmp/android-release. Signing credentials remain private. Website association still needs the public certificate configuration.`);
