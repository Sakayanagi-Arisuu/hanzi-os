import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

for (const authenticated of [false, true]) {
  test(authenticated ? 'new account enters setup and keeps it after reload' : 'guest can enter setup from landing', async ({ page }) => {
    let sessionReads = 0;
    // All API traffic stays in this isolated browser fixture, including writes.
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/session') {
        sessionReads++;
        return route.fulfill({ json: authenticated ? {
          authenticated: true, accountKey: `siwc_${'a'.repeat(64)}`,
          user: { displayName: 'Fixture', email: 'fixture@example.test', fullName: 'Fixture', provider: 'google' },
        } : { authenticated: false, accountKey: null, user: null } });
      }
      if (path === '/api/sync' && route.request().method() === 'GET') {
        return route.fulfill({ json: { protocolVersion: 1, revision: 0, cursor: 0, document: null } });
      }
      return route.fulfill({ status: 503, json: { error: { code: 'TEST_ONLY', message: 'Isolated fixture', retryable: true } } });
    });
    await page.goto('/');
    if (!authenticated) {
      await expect(page.locator('.guild-hero')).toBeVisible({ timeout: 30_000 });
      await page.goto('/onboarding');
    }
    await expect(page.getByTestId('onboarding-wizard')).toBeVisible({ timeout: 30_000 });
    expect(sessionReads).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await expect(page.getByRole('radiogroup', { name: 'Trình độ hiện tại' })).toBeVisible();
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page.getByRole('button', { name: 'Bắt đầu Khảo Nghiệm Căn Cơ', exact: true }).click();
    await expect(page).toHaveURL(/\/assessment$/);
    await expect(page.getByTestId('onboarding-wizard')).toHaveCount(0);
    await page.goto('/');
    await expect(page.locator('.app-frame')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.guild-hero')).toHaveCount(0);
    await expect(page.getByTestId('onboarding-wizard')).toHaveCount(0);
  });
}
