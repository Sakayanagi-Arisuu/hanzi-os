import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'account-settings.spec.ts',workers:1,timeout:90000,expect:{timeout:20000},outputDir:'tmp/account-e2e',reporter:'list',use:{baseURL:process.env.ACCOUNT_TEST_URL ?? 'http://localhost:3000',trace:'retain-on-failure',screenshot:'only-on-failure'}});
