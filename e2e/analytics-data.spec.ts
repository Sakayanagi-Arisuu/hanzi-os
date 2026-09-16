import { expect, test } from '@playwright/test';

test('analytics keeps guest data, access-day deduplication, details and dark surfaces across viewports', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', {name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button', {name:'Tiếp tục',exact:true}).click();
  await page.getByRole('button', {name:'Bắt đầu Khảo Nghiệm Căn Cơ',exact:true}).click();
  await expect(page).toHaveURL(/\/assessment$/u);
  await page.goto('/analytics');
  const module = page.getByTestId('analytics-page');
  await expect(module).toBeVisible();
  const invitation = page.getByRole('button', {name:'Đóng lời mời Khảo Nghiệm Căn Cơ'});
  await invitation.waitFor({state:'visible',timeout:3000}).catch(()=>{});
  if (await invitation.isVisible()) await invitation.click();
  const days = module.locator('.oracle-metrics article').nth(1).locator('strong');
  await expect(days).toHaveText('1 ngày');
  await page.reload();
  await expect(days).toHaveText('1 ngày');
  await expect(module).not.toContainText('Đang hợp nhất bằng chứng');
  await expect(module.locator('.oracle-pillar-copy small')).toHaveText(Array(7).fill('0 câu · 0 lượt luyện'));
  await expect(module.getByRole('progressbar')).toHaveCount(7);
  await expect(module).toContainText('217 bài học');
  await page.keyboard.press('Alt+s');
  const hologram = page.getByRole('dialog');
  await expect(hologram.locator('.sys-practice-count > strong')).toHaveText(Array(7).fill('0 câu'));
  await expect(hologram.locator('.sys-holo-alerts')).toContainText('1 ngày');
  await page.keyboard.press('Escape');
  for (const viewport of [{width:1440,height:900},{width:375,height:812},{width:812,height:375}]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await module.locator('.oracle-pillar-panel').evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('21, 54, 46');
    await module.getByRole('link',{name:'Xem chi tiết',exact:true}).click();
    await expect(module.locator('#oracle-detail')).toHaveAttribute('open','');
    await module.locator('#oracle-detail summary').focus();
    await page.keyboard.press('Enter');
    await expect(module.locator('#oracle-detail')).not.toHaveAttribute('open','');
    expect((await module.locator('.oracle-primary-action').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({width:1366,height:643});
  const pillars = module.locator('.oracle-pillar-panel');
  await pillars.evaluate(el => el.scrollIntoView({block:'start'}));
  await expect.poll(() => pillars.evaluate(el => {
    const panel = el.getBoundingClientRect();
    const last = el.querySelector('article:last-child')!.getBoundingClientRect();
    return panel.height <= innerHeight - 90 && last.bottom <= innerHeight && last.top >= 70;
  })).toBe(true);
  await page.screenshot({path:'tmp/analytics-compact.png'});
  await module.locator('.oracle-primary-action').click();
  await expect(page).toHaveURL(/\/(lesson\/[^/]+|assessment|path|review)$/u);
});
