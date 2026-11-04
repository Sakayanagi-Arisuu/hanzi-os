import { defineConfig } from '@playwright/test';

// Uses the already-running local server and a fresh browser context per test.
export default defineConfig({
  testDir: './e2e', testMatch: 'dictionary-lookup.spec.ts', workers: 1,
  timeout: 90_000, expect: { timeout: 20_000 },
  outputDir: 'tmp/dictionary-e2e', reporter: 'list',
  use: { baseURL: process.env.DICTIONARY_TEST_URL ?? 'http://localhost:3000', viewport: { width: 1366, height: 643 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
