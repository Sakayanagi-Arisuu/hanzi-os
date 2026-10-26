import { expect, it } from 'vitest';
import { releaseConfig } from '../../scripts/prepare-cloudflare.mjs';
const input = { workerName: 'hanzi-os', origin: 'https://hanzi.example', databaseName: 'hanzi-production',
  databaseId: '12345678-1234-1234-1234-123456789abc', supportEmail: 'support@example.com', operatorName: 'Test developer' };
it('prepares direct hosting with native auth and commerce disabled', () => {
  const config = releaseConfig(input);
  expect(config.vars.HANZI_HOSTING_PROVIDER).toBe('cloudflare');
  expect(config.vars.HANZI_CASH_LEDGER_ENABLED).toBe('0');
  expect(config.vars.AUTH_DEV_HANZI_DEMOS).toBe('0');
  expect(config.vars.GOOGLE_NATIVE_ENABLED).toBe('0');
  expect(config.vars).not.toHaveProperty('HANZI_STUDY_MODE');
  expect(releaseConfig({ ...input, studyMode: 'personal-study' }).vars.HANZI_STUDY_MODE).toBe('personal-study');
  expect(() => releaseConfig({ ...input, studyMode: 'production' })).toThrow();
  expect(config.d1_databases[0]?.binding).toBe('DB');
  expect(config.assets.run_worker_first).toContain('/api/*');
  expect(config.assets.run_worker_first).toContain('/offline.html');
  expect(config.triggers.crons).toEqual(['* * * * *']);
  const google = releaseConfig({ ...input, googleClientId: '123456-example.apps.googleusercontent.com' });
  expect(google.vars.GOOGLE_REDIRECT_URI).toBe('https://hanzi.example/auth/google/callback');
  expect(google.vars).not.toHaveProperty('GOOGLE_CLIENT_SECRET');
});
it('requires explicit Google native enablement and a configured signing identity', () => {
  expect(() => releaseConfig({ ...input, googleNativeEnabled: true })).toThrow();
  expect(() => releaseConfig({ ...input, googleNativeEnabled: '1' })).toThrow();
  expect(releaseConfig({ ...input, googleNativeEnabled: true,
    googleClientId: '123456-example.apps.googleusercontent.com', androidPackage: 'com.regulus.hanzios',
    androidFingerprints: [Array(32).fill('AB').join(':')] }).vars.GOOGLE_NATIVE_ENABLED).toBe('1');
});
it('rejects placeholders, loopback, unsafe origins and local D1', () => {
  for (const origin of ['http://hanzi.example', 'https://localhost', 'https://hanzi.example/path', 'https://user:pass@hanzi.example', 'https://YOUR-WORKER.workers.dev']) {
    expect(() => releaseConfig({ ...input, origin })).toThrow();
  }
  expect(() => releaseConfig({ ...input, databaseId: '00000000-0000-4000-8000-000000000000' })).toThrow();
  expect(() => releaseConfig({ ...input, androidFingerprints: ['bad'] })).toThrow();
});
