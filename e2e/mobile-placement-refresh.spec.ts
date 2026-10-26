import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block', viewport: { width: 375, height: 667 } });
test('placement survives denied content refresh and mobile controls stay visible', async ({ page }) => {
  let projectionReads = 0;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/session') return route.fulfill({ json: {
      authenticated: true, accountKey: `siwc_${'b'.repeat(64)}`,
      user: { displayName: 'Fixture', email: 'mobile@example.test', fullName: 'Fixture', provider: 'google' },
    } });
    if (path === '/api/sync' && route.request().method() === 'GET') return route.fulfill({ json: {
      protocolVersion: 1, revision: 0, cursor: 0, document: null,
    } });
    if (path === '/api/learning/projection') {
      projectionReads++;
      await new Promise(resolve => setTimeout(resolve, 300));
      return route.fulfill({ status: 409, json: { error: { code: 'LEARNING_PROJECTION_CONTENT_UNAVAILABLE', message: 'Unreleased test content' } } });
    }
    return route.fulfill({ status: 503, json: { error: { code: 'TEST_ONLY', message: 'Isolated fixture', retryable: true } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu Khảo Nghiệm Căn Cơ', exact: true }).click();
  await page.goto('/assessment/placement/hsk1');
  await page.getByRole('button', { name: 'Bắt đầu Khảo Nghiệm', exact: true }).click();
  await expect(page.getByTestId('hsk1-level-check-live')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    const before = projectionReads;
    const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/learning/projection');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => projectionReads).toBeGreaterThan(before);
    await refreshed;
    await expect(page.getByTestId('hsk1-level-check-live')).toBeVisible();
    await expect(page.getByText('Cần một lượt khảo nghiệm mới', { exact: true })).toHaveCount(0);
  }
  for (const viewport of [{ width: 375, height: 667 }, { width: 812, height: 375 }]) {
    await page.setViewportSize(viewport);
    const header = await page.locator('.ngoc-header').boundingBox();
    expect(header!.height).toBeLessThanOrEqual(64);
    const button = await page.getByRole('button', { name: 'Chưa biết', exact: true }).boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(44);
    const navigation = page.locator('.mobile-nav');
    const bottom = await navigation.isVisible() ? (await navigation.boundingBox())!.y : viewport.height;
    expect(button!.y + button!.height).toBeLessThanOrEqual(bottom);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/mobile-placement-${viewport.width}.png` });
  }
});
