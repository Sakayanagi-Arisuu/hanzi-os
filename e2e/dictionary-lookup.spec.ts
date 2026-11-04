import { expect, test, type Page } from '@playwright/test';

async function enter(page: Page) {
  await page.goto('/');
  await page.locator('#landing-main').getByRole('button', { name: 'Bắt đầu hành trình' }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu Khảo Nghiệm Căn Cơ' }).click();
  await expect(page).toHaveURL(/assessment/);
  await page.goto('/dictionary');
  await expect(page.getByRole('combobox', { name: 'Tìm trong từ điển' })).toBeVisible();
  const dismiss = page.getByRole('button', { name: 'Đóng lời mời Khảo Nghiệm Căn Cơ' });
  if (await dismiss.isVisible()) await dismiss.click();
}

test('typeahead, IME, keyboard, exact ranking, filters and return context', async ({ page }) => {
  await enter(page);
  const input = page.getByRole('combobox', { name: 'Tìm trong từ điển' });
  await input.fill('学');
  await expect(page.getByRole('option').first()).toContainText('学');
  await expect.poll(() => page.getByRole('option').count()).toBeGreaterThan(3);
  await input.dispatchEvent('compositionstart');
  await input.press('Enter');
  await expect(page).toHaveURL(/view=explore/);
  await input.dispatchEvent('compositionend');
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', /.+/);
  await input.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.fill('xuexi');
  await expect(page.getByRole('option').first()).toContainText('学习');
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(page).toHaveURL(/view=detail/);
  await expect(page.locator('.lex-entry-heading')).toContainText('学习');
  await page.getByRole('button', { name: 'Quay lại kết quả tra cứu' }).click();
  await expect(input).toHaveValue('xuexi');
  await input.fill('truong hoc');
  await expect(page.getByRole('option').first()).toContainText('学校');
  await input.fill('学');
  await page.getByRole('button', { name: 'Chữ', exact: true }).click();
  await expect(page).toHaveURL(/kind=character/);
  await expect(page.locator('.lex-word-grid > button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Từ', exact: true }).click();
  await expect(page).toHaveURL(/kind=word/);
  await expect(page.getByRole('button', { name: 'Từ', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await page.locator('.lex-word-grid > button strong').allTextContents())
    .every(text => [...text].length > 1)).toBe(true);
});

test('history reload, save and selected self-review preserve learning progress', async ({ page }) => {
  await enter(page);
  const progress = () => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('hanzi-os-learning-state-v1') ?? '{}');
    return { completion: state.completedLessons, streak: state.streak, xp: state.xp };
  });
  const before = await progress();
  await page.getByRole('combobox').fill('学习');
  await page.getByRole('option').filter({ hasText: '学习' }).first().click();
  await page.getByRole('button', { name: 'Mở hồ sơ mục từ', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu ngọc giản', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Quay lại kết quả tra cứu' }).click();
  await page.getByRole('button', { name: 'Xóa từ tìm' }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Tra gần đây' })).toContainText('学习');
  await page.getByRole('button', { name: 'Xóa lịch sử' }).click();
  await expect(page.getByRole('region', { name: 'Tra gần đây' })).not.toContainText('学习');
  await page.getByRole('button', { name: 'Đã lưu', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Chọn 学习 để tự ôn' }).check();
  await page.getByRole('button', { name: 'Ôn mục đã chọn', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Mở nghĩa để tự kiểm tra' }).click();
  await expect(page.getByRole('heading', { name: 'học tập', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kết thúc lượt tự ôn' }).click();
  expect(await progress()).toEqual(before);
});

for (const viewport of [{ width: 1366, height: 643 }, { width: 375, height: 812 }, { width: 812, height: 375 }]) {
  test(`lookup and detail fit ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await enter(page);
    await page.getByRole('combobox').fill('学');
    await expect.poll(() => page.getByRole('option').count()).toBeGreaterThan(3);
    await expect(page.locator('.lex-typeahead')).toBeVisible();
    const all = await page.getByRole('button', { name: 'Xem tất cả kết quả' }).boundingBox();
    expect(all!.y + all!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: info.outputPath('lookup.png') });
    await page.getByRole('option').filter({ hasText: '学习' }).first().click();
    if (viewport.width > 1000) await page.getByRole('button', { name: 'Mở hồ sơ mục từ', exact: true }).click();
    await expect(page).toHaveURL(/view=detail/);
    const action = page.getByRole('button', { name: 'Tự ôn mục từ', exact: true }).filter({ visible: true });
    const rect = await action.boundingBox();
    const nav = await page.locator('[aria-label="Điều hướng di động"]').boundingBox();
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(nav?.y ?? viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('detail.png') });
  });
}
