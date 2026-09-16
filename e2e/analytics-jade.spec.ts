import { expect, test } from '@playwright/test';

for (const viewport of [{width:1440,height:1000},{width:375,height:812},{width:812,height:375}]) {
  test(`jade analytics preserves shell and actions at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    await page.goto('/onboarding');
    await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
    await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();
    await page.getByRole('button',{name:'Bắt đầu Khảo Nghiệm Căn Cơ'}).click();
    await expect(page).toHaveURL(/\/assessment$/u);
    await page.goto('/reader');
    await page.getByTestId('reader-library').waitFor();
    const shell = () => page.evaluate(() => ['.side-rail','.command-bar'].map(selector => {
      const el = document.querySelector(selector)!;
      const box = el.getBoundingClientRect(); const css = getComputedStyle(el);
      return {x:box.x,y:box.y,width:box.width,height:box.height,background:css.backgroundColor,color:css.color,font:css.fontFamily};
    }));
    const before = await shell();
    await page.goto('/analytics');
    const module = page.getByTestId('analytics-page');
    await expect(module).toBeVisible();
    const invite=page.getByRole('button',{name:'Đóng lời mời Khảo Nghiệm Căn Cơ'});
    await invite.waitFor({state:'visible',timeout:3000}).catch(()=>{});
    if(await invite.isVisible()) await invite.click();
    await page.evaluate(()=>document.fonts.ready);
    expect(await shell()).toEqual(before);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(module.getByRole('progressbar')).toHaveCount(7);
    await expect(module.locator('.practice-milestone.is-compact')).toHaveCount(7);
    const links=module.locator('.oracle-gateway-card');
    expect(await links.evaluateAll(els=>els.map(el=>el.getAttribute('href')))).toEqual(['/path','/review','/mistakes','/pronunciation','/reader','/characters','/exams','/dictionary']);
    await module.getByRole('link',{name:'Xem chi tiết',exact:true}).click();
    const detail=module.locator('#oracle-detail');
    await expect(detail).toHaveAttribute('open','');
    await expect(detail.locator('dt')).toHaveCount(7);
    await detail.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(detail).not.toHaveAttribute('open','');
    await module.locator('.oracle-primary-action').scrollIntoViewIfNeeded();
    const action=module.locator('.oracle-primary-action');
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await module.evaluate(el => { for (let node: Element | null = el; node; node = node.parentElement) node.scrollTop = 0; window.scrollTo(0,0); });
    await page.screenshot({path:`design-explorations/2026-09-10-thien-co-kinh-v2/implemented-${viewport.width}.png`});
    const to=await action.getAttribute('href');
    await action.click();
    await expect(page).toHaveURL(new RegExp(`${to!.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`));
  });
}
