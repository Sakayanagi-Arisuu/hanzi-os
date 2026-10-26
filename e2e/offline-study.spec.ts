import { expect, test, request as playwrightRequest, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readIndexedDbStore } from './indexedDb';

const origin = 'http://127.0.0.1:4174';
test.skip(process.env.HANZI_OFFLINE_LIVE_TEST !== '1', 'Requires the dedicated local offline preview and API');
async function onboard(page: Page) {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu Khảo Nghiệm Căn Cơ', exact: true }).click();
}

test('account begins a lesson offline, reopens, and synchronizes once', async ({ page, context }) => {
  test.setTimeout(300_000);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const registered = await page.request.post('/api/auth/hanzi/register', { headers: { origin }, data: {
    username: `offline.${suffix}`, email: `offline.${suffix}@example.test`,
    password: `Offline!${randomUUID()}a9`, displayName: 'Hành giả kiểm thử offline',
  } });
  expect(registered.ok(), await registered.text()).toBe(true);
  try {
    console.log('Offline test: account created', `offline.${suffix}`);
    await onboard(page);
    await page.goto('/lesson/boot-1');
    await expect(page.locator('.lesson-page-reader')).toBeVisible({ timeout: 60_000 });
    console.log('Offline test: reader loaded');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await expect.poll(async () => (await readIndexedDbStore<{ value: { session?: { authenticated?: boolean } } }>(page, 'lesson-resumes'))
      .some(record => record.value.session?.authenticated), { timeout: 60_000 }).toBe(true);
    console.log('Offline test: downloaded');
    await context.setOffline(true);
    // Use the reader's actual page and item controls to reach practice.
    const pages = page.getByRole('combobox', { name: 'Chọn trang học', exact: true });
    await pages.selectOption({ index: await pages.locator('option').count() - 1 });
    const items = page.getByRole('combobox', { name: 'Chọn mục trong trang', exact: true });
    if (await items.isVisible()) await items.selectOption({ index: await items.locator('option').count() - 1 });
    await page.locator('.lesson-page-reader footer button').last().click();
    await expect(page.locator('.lesson-live-page')).toBeVisible();
    console.log('Offline test: practice opened');
    await context.setOffline(true);
    for (let i = 0; i < 3; i++) {
      await expect(page.getByRole('progressbar', { name: 'Tiến độ Thử Luyện' })).toHaveAttribute('aria-valuenow', String(i + 1));
      const choices = page.locator('.answer-grid button');
      if (await choices.count()) await choices.first().click();
      else await page.getByLabel('Hán tự bạn tự gọi lại').fill('你');
      await page.getByRole('button', { name: 'Gửi để chấm', exact: true }).click();
      await expect(page.getByText('Đã lưu trên máy · chờ đồng bộ để chấm.', { exact: false })).toBeVisible();
      await page.getByRole('button', { name: 'Câu tiếp theo', exact: true }).click();
      await expect(page.getByRole('progressbar', { name: 'Tiến độ Thử Luyện' })).toHaveAttribute('aria-valuenow', String(i + 2));
    }
    const before = await readIndexedDbStore<{ kind: string; status: string; commandId: string }>(page, 'learning-command-outbox');
    const pending = before.filter(record => record.kind === 'objective-attempt' && record.status === 'pending');
    expect(pending).toHaveLength(3);
    await page.close();
    page = await context.newPage();
    await page.goto('/lesson/boot-1');
    await expect(page.locator('.lesson-live-page')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Tiến độ Thử Luyện' })).toHaveAttribute('aria-valuenow', '4');
    for (const size of [{ width: 375, height: 812 }, { width: 812, height: 375 }]) {
      await page.setViewportSize(size);
      const action = page.locator('.answer-console button.primary-button');
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: 'tmp/offline-lesson-landscape.png' });
    const total = Number(await page.getByRole('progressbar', { name: 'Tiến độ Thử Luyện' }).getAttribute('aria-valuemax'));
    for (let i = 3; i < total; i++) {
      await expect(page.getByRole('progressbar', { name: 'Tiến độ Thử Luyện' })).toHaveAttribute('aria-valuenow', String(i + 1));
      const choices = page.locator('.answer-grid button');
      if (await choices.count()) await choices.first().click();
      else await page.getByLabel('Hán tự bạn tự gọi lại').fill('你');
      await page.getByRole('button', { name: 'Gửi để chấm', exact: true }).click();
      await expect(page.getByText('Đã lưu trên máy · chờ đồng bộ để chấm.', { exact: false })).toBeVisible();
      await page.getByRole('button', { name: i === total - 1 ? 'Hoàn thành bài' : 'Câu tiếp theo', exact: true }).click();
      if (i < total - 1) await expect(page.getByRole('progressbar', { name: 'Tiến độ Thử Luyện' })).toHaveAttribute('aria-valuenow', String(i + 2));
    }
    await expect(page.getByRole('heading', { name: 'Đã lưu bài trên thiết bị' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Đã lưu bài trên thiết bị' })).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByTestId('lesson-quest-result')).toBeVisible({ timeout: 90_000 });
    await expect.poll(async () => {
      const records = await readIndexedDbStore<{ commandId: string; status: string }>(page, 'learning-command-outbox');
      return pending.map(item => records.find(record => record.commandId === item.commandId)?.status);
    }, { timeout: 60_000 }).toEqual(['acknowledged', 'acknowledged', 'acknowledged']);
    await page.reload();
    await expect(page.getByTestId('lesson-quest-result')).toBeVisible();
    const after = await readIndexedDbStore<{ commandId: string }>(page, 'learning-command-outbox');
    for (const item of pending) expect(after.filter(record => record.commandId === item.commandId)).toHaveLength(1);
    await page.goto('/mistakes');
    await expect(page.getByRole('button', { name: 'Bắt đầu hóa giải', exact: false })).toBeEnabled({ timeout: 60_000 });
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: 'Bắt đầu hóa giải', exact: false }).click();
    const remediationChoices = page.locator('.rem-answer-grid button');
    if (await remediationChoices.count()) await remediationChoices.first().click();
    else await page.getByLabel('Câu trả lời của bạn', { exact: true }).fill('你');
    await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
    await expect(page.locator('.rem-feedback-card.is-pending')).toBeVisible();
    const remediation = (await readIndexedDbStore<{ commandId: string; kind: string; status: string; command?: { source?: string } }>(page, 'learning-command-outbox'))
      .filter(record => record.kind === 'objective-attempt' && record.command?.source === 'mistake');
    expect(remediation).toHaveLength(1);
    expect(remediation[0]!.status).toBe('pending');
    await page.reload();
    await expect(page.locator('.rem-observatory')).toBeVisible();
    await context.setOffline(false);
    await expect.poll(async () => (await readIndexedDbStore<{ commandId: string; status: string }>(page, 'learning-command-outbox'))
      .find(record => record.commandId === remediation[0]!.commandId)?.status, { timeout: 60_000 }).toBe('acknowledged');
    console.log('Offline test: cached mistake answer retained and synchronized once');
  } finally {
    await context.setOffline(false);
    const cleanup = page.isClosed() ? await context.newPage() : page;
    if (cleanup.url() === 'about:blank') await cleanup.goto('/');
    const deleted = await cleanup.evaluate(async () => (await fetch('/api/account', { method: 'DELETE',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmation: 'DELETE HANZI.OS' }) })).ok);
    expect.soft(deleted, 'Remove only the account created by this test').toBe(true);
  }
});

test('guest automatic preparation survives offline reload with reading position intact', async ({ page, context }) => {
  await onboard(page);
  await page.goto('/lesson/boot-1');
  await expect(page.locator('.lesson-page-reader')).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const picker = page.getByRole('combobox', { name: 'Chọn trang học', exact: true });
  await picker.selectOption({ index: 2 });
  const selected = await picker.inputValue();
  await expect.poll(async () => {
    const records = await readIndexedDbStore<{ value: { lessonId?: string; index?: number } }>(page, 'lesson-resumes');
    return records.some(record => record.value.lessonId === 'boot-1' && record.value.index === 2);
  }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Chọn trang học', exact: true })).toHaveValue(selected);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'tmp/offline-reader-mobile.png' });
});

test('automatic preparation caches dictionary and stroke resources for offline use', async ({ page, context }) => {
  test.setTimeout(240_000);
  await onboard(page);
  await page.goto('/profile');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await expect.poll(async () => (await readIndexedDbStore<{ entryKey: string; value: { phase?: string } }>(page, 'lesson-resumes'))
    .find(record => record.entryKey === 'offline-preparation:v1')?.value.phase, { timeout: 180_000 }).toBe('ready');
  await context.setOffline(true);
  const resources = await page.evaluate(async () => {
    const stroke = await (await fetch('/hanzi-data/%E4%BD%A0.json')).json() as { strokes?: string[] };
    const dictionary = await (await fetch('/content/mandarin-mega-lexicon-2026.08.1.json')).json() as { vocabulary?: unknown[] };
    return { strokes: stroke.strokes?.length ?? 0, vocabulary: dictionary.vocabulary?.length ?? 0 };
  });
  expect(resources.strokes).toBeGreaterThan(0);
  expect(resources.vocabulary).toBeGreaterThan(0);
  await page.goto('/dictionary');
  await expect(page.getByRole('textbox', { name: 'Tìm trong từ điển' })).toBeVisible();
});

test('account begins cached exam with server 503, reopens, submits offline and receives a single practice result', async ({ page, context }) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0,12);
  const registered = await page.request.post('/api/auth/hanzi/register', { headers: { origin }, data: {
    username: `offline.${suffix}`, email: `offline.${suffix}@example.test`, password: `Offline!${randomUUID()}a9`, displayName: 'Hành giả kiểm thử offline',
  } });
  expect(registered.ok(), await registered.text()).toBe(true);
  const fixtureCookies = (await context.storageState()).cookies;
  console.log('Offline exam test: account created', `offline.${suffix}`);
  try {
    await onboard(page);
    await page.goto('/exams');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await expect.poll(async () => (await readIndexedDbStore<{ entryKey: string }>(page, 'lesson-resumes'))
      .some(record => record.entryKey === 'offline-read:v1:/api/exams/hsk1/a/practice'), { timeout: 120_000 }).toBe(true);
    console.log('Offline exam test: package prepared automatically');
    await context.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'server stopped' } }) }));
    expect(await page.evaluate(() => navigator.onLine)).toBe(true);
    await page.goto('/exams/hsk1/a');
    await expect(page.locator('.mock-exam-live')).toBeVisible({ timeout: 60_000 });
    console.log('Offline exam test: practice opened with server 503');
    for (let index = 0; index < 3; index++) {
      await page.locator('.dungeon-options button').first().click();
      await page.getByRole('button', { name: 'Lưu và sang câu tiếp', exact: false }).click();
      await expect(page.locator('.dungeon-question-count')).toHaveText(`${index + 2}/40`);
    }
    await page.close(); page = await context.newPage();
    await page.goto('/exams/hsk1/a');
    await expect(page.locator('.dungeon-question-count')).toHaveText('4/40');
    console.log('Offline exam test: resumed answer 4');
    for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }]) {
      await page.setViewportSize(viewport);
      const action = await page.locator('.dungeon-runner-dock button.primary-button').boundingBox();
      expect(action!.y + action!.height).toBeLessThanOrEqual(viewport.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await context.setOffline(true);
    for (let index = 3; index < 40; index++) {
      await page.locator('.dungeon-options button').first().click();
      await page.getByRole('button', { name: 'Lưu và sang câu tiếp', exact: false }).click();
    }
    await page.getByRole('button', { name: 'Ghi chiến tích', exact: false }).click();
    await expect(page.getByRole('heading', { name: 'Đã lưu 40 câu trả lời' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Đã lưu 40 câu trả lời' })).toBeVisible();
    console.log('Offline exam test: submission retained after offline reload');
    await context.unroute('**/api/**'); await context.setOffline(false);
    await expect(page.locator('.mock-exam-result')).toBeVisible({ timeout: 120_000 });
    await page.reload(); await expect(page.locator('.mock-exam-result')).toBeVisible();
    const journal = (await readIndexedDbStore<{ entryKey: string; value: { runs?: unknown[] } }>(page, 'lesson-resumes'))
      .find(record => record.entryKey === 'offline-mock-practice:v1');
    expect(journal?.value.runs).toHaveLength(1);
    await page.goto('/exams/history');
    await expect(page.locator('.dungeon-history-card')).toHaveCount(1);
  } finally {
    const cleanup = await playwrightRequest.newContext({ baseURL: origin, storageState: { cookies: fixtureCookies, origins: [] } });
    try {
      const deleted = await cleanup.delete('/api/account', { headers: { origin, cookie: fixtureCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') }, data: { confirmation: 'DELETE HANZI.OS' } });
      expect.soft(deleted.ok(), 'Remove only the account created by this test').toBe(true);
    } finally { await cleanup.dispose(); }
  }
});
