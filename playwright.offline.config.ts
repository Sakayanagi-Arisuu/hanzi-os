import { defineConfig } from '@playwright/test';
process.env.HANZI_OFFLINE_LIVE_TEST = '1';
export default defineConfig({
  testDir: './e2e', testMatch: 'offline-study.spec.ts', workers: 1,
  timeout: 180_000, expect: { timeout: 30_000 },
  outputDir: 'tmp/offline-e2e', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4174', headless: true, contextOptions: { reducedMotion: 'reduce' }, screenshot: 'only-on-failure' },
  webServer: { command: 'node scripts/serve-offline-local.mjs', url: 'http://127.0.0.1:4174', reuseExistingServer: true },
});
