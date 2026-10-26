import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function releaseConfig(input) {
  if (!input || typeof input !== 'object' || /REPLACE|YOUR-/i.test(JSON.stringify(input))) throw new Error('Fill the deployment settings with your own Cloudflare values first.');
  const origin = new URL(input.origin);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.port || origin.pathname !== '/'
    || origin.search || origin.hash || !origin.hostname.includes('.') || /localhost|127\.0\.0\.1/.test(origin.hostname)) throw new Error('Use a public HTTPS origin without a path.');
  if (!/^[a-z][a-z0-9-]{2,62}$/.test(input.workerName ?? '') || !/^[a-zA-Z0-9_-]{3,63}$/.test(input.databaseName ?? '')) throw new Error('Invalid Worker or D1 name.');
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.databaseId ?? '')
    || input.databaseId === '00000000-0000-4000-8000-000000000000') throw new Error('A real remote D1 database ID is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.supportEmail ?? '') || typeof input.operatorName !== 'string' || !input.operatorName.trim()) throw new Error('Public support email and operator name are required.');
  const fingerprints = input.androidFingerprints ?? [];
  if (!Array.isArray(fingerprints) || fingerprints.some(value => typeof value !== 'string' || !/^(?:[\dA-F]{2}:){31}[\dA-F]{2}$/i.test(value))) throw new Error('Invalid Android SHA-256 signing certificate.');
  if (input.androidPackage && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(input.androidPackage)) throw new Error('Invalid Android package ID.');
  if (fingerprints.length && !input.androidPackage) throw new Error('Android fingerprints require a package ID.');
  if (input.googleClientId && !/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(input.googleClientId)) throw new Error('Invalid Google OAuth client ID.');
  if (input.studyMode !== undefined && input.studyMode !== 'personal-study') throw new Error('Unsupported study mode.');
  if (input.googleNativeEnabled !== undefined && typeof input.googleNativeEnabled !== 'boolean') throw new Error('Google native enablement must be explicit.');
  if (input.googleNativeEnabled && (!input.googleClientId || !input.androidPackage || !fingerprints.length)) throw new Error('Google native requires the web client and Android signing identity.');
  return {
    name: input.workerName, main: resolve('worker/index.ts'), compatibility_date: '2026-07-17',
    compatibility_flags: ['nodejs_compat'], workers_dev: true,
    triggers: { crons: ['* * * * *'] },
    assets: { binding: 'ASSETS', run_worker_first: ['/api/*', '/auth/*', '/signin', '/account/*', '/admin/*', '/studio/*', '/offline-shell', '/offline.html', '/sw.js', '/.well-known/*'] },
    d1_databases: [{ binding: 'DB', database_name: input.databaseName, database_id: input.databaseId, migrations_dir: resolve('drizzle') }],
    vars: { HANZI_HOSTING_PROVIDER: 'cloudflare', AUTH_ALLOWED_ORIGIN: origin.origin, AUTH_RP_ID: origin.hostname,
      NEXT_PUBLIC_SITE_URL: origin.origin, HANZI_SUPPORT_EMAIL: input.supportEmail, HANZI_OPERATOR_NAME: input.operatorName.trim(),
      AUTH_DEV_HANZI_DEMOS: '0', AUTH_DEV_EMAIL_OTP: '0', HANZI_CASH_LEDGER_ENABLED: '0', HANZI_BANK_TRANSFER_ENABLED: '0',
      GOOGLE_NATIVE_ENABLED: input.googleNativeEnabled === true ? '1' : '0',
      ...(input.studyMode ? { HANZI_STUDY_MODE: input.studyMode } : {}),
      ...(input.googleClientId ? { GOOGLE_CLIENT_ID: input.googleClientId, GOOGLE_REDIRECT_URI: `${origin.origin}/auth/google/callback` } : {}),
      ...(input.androidPackage ? { ANDROID_PACKAGE_NAME: input.androidPackage, ANDROID_SHA256_FINGERPRINTS: fingerprints.join(',') } : {}),
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const source = process.argv[2];
    if (!source) throw new Error('Usage: npm run hosting:prepare -- config/cloudflare-release.local.json');
    const config = releaseConfig(JSON.parse(await readFile(source, 'utf8')));
    await mkdir('.deploy', { recursive: true });
    await writeFile('.deploy/wrangler.json', JSON.stringify(config, null, 2) + '\n');
    console.log('Prepared .deploy/wrangler.json. No database creation, migration or deployment was performed.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
