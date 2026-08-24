import { expect, test, type Page } from "@playwright/test";

const finishOnboarding = async (page: Page) => {
  await page.goto("/");
  await expect(page.getByTestId("product-overview")).toBeVisible();
  await page.locator("#landing-main").getByRole("button", {
    name: "Kích hoạt HANZI.OS",
  }).click();
  await expect(page.getByTestId("onboarding-wizard")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
  await expect(page).toHaveURL(/\/assessment$/u);
};

const openPilotChapter = async (page: Page) => {
  await page.goto("/reader");
  await expect(page.getByTestId("reader-library")).toBeVisible();
  await page.getByRole("link", { name: "Mở mô tả Thư Các Thanh Đăng" }).click();
  await page.getByRole("link", { name: "Mở chương đầu" }).click();
  await expect(page.getByTestId("reader-chapter-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "会写名字的书" })).toBeVisible();
};

const progressDocument = (page: Page) => page.evaluate(() => {
  const documents = Object.keys(localStorage)
    .filter((candidate) => candidate.startsWith("hanzi-os-reader-progress-v2:"))
    .map((key) => JSON.parse(localStorage.getItem(key) ?? "null"));
  return documents.find((document) =>
    document?.chapters?.["jade-lantern-archive-c01"]
  ) ?? documents[0] ?? null;
});

test("reads, looks up, saves, resumes, completes, exits and replays without creating Reader mastery", async ({
  context,
  page,
}) => {
  await finishOnboarding(page);
  await page.goto("/reader");

  const learnerCopy = await page.locator("main").innerText();
  expect(learnerCopy).not.toMatch(/Reader session|receipt|schema|mastery|outbox|hash|closed alpha/u);
  await expect(page.getByTestId("reader-book-grid").getByRole("link")).toHaveCount(25);
  await expect(page.getByText("Ngày đầu ở lớp tiếng Trung", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Mở mô tả Thư Các Thanh Đăng" }).click();
  await page.getByRole("link", { name: "Mở chương đầu" }).click();

  await page.getByRole("button", { name: "Tra từ 图书馆" }).click();
  const wordSheet = page.getByRole("dialog", { name: "图书馆" });
  await expect(wordSheet.getByText("túshūguǎn")).toBeVisible();
  await expect(wordSheet.getByText("thư viện", { exact: true })).toBeVisible();
  await wordSheet.getByRole("button", { name: "Lưu để ôn" }).click();
  await wordSheet.getByRole("button", { name: "Đóng 图书馆" }).click();

  await page.getByRole("button", { name: "Hỗ trợ đọc" }).click();
  const supportSheet = page.getByRole("dialog", { name: "Hỗ trợ đọc" });
  await supportSheet.getByRole("radio", { name: /Song ngữ Trung–Việt/u }).click();
  await supportSheet.getByRole("button", { name: "Pinyin toàn đoạn" }).click();
  await supportSheet.getByRole("button", { name: "Đóng Hỗ trợ đọc" }).click();
  await expect(page.getByText(/Thư viện cũ của thành phố Bắc Hà/u)).toBeVisible();
  await expect(page.getByText(/Běihé chéngshì de jiù túshūguǎn/u)).toBeVisible();

  const chapterUrl = page.url();
  await page.reload();
  await expect(page.getByTestId("reader-chapter-shell")).toHaveAttribute("data-reader-mode", "bilingual");
  await expect(page.getByText(/Thư viện cũ của thành phố Bắc Hà/u)).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("reader-chapter-shell")).toBeVisible();
  expect(page.url()).toBe(chapterUrl);
  await context.setOffline(false);

  await page.getByRole("button", { name: "Hoàn thành chương" }).click();
  await expect(page.getByText(/Đã lưu hoàn thành chương/u)).toBeVisible();
  const firstCompletedAt = (await progressDocument(page))
    ?.chapters?.["jade-lantern-archive-c01"]?.completedAt;
  expect(firstCompletedAt).toBeTruthy();

  await page.getByRole("link", { name: "Mở chương tiếp" }).click();
  await expect(page.getByRole("heading", { name: "书架后面的门" })).toBeVisible();
  await page.getByRole("button", { name: "Thoát phiên đọc và trở về Thư Khố" }).click();
  await expect(page.getByTestId("reader-library")).toBeVisible();
  await page.getByRole("link", { name: "Mở mô tả Thư Các Thanh Đăng" }).click();
  await page.getByRole("link", { name: "Đọc lại Cuốn sách viết được tên" }).click();
  await expect(page.getByRole("heading", { name: "会写名字的书" })).toBeVisible();
  expect((await progressDocument(page))
    ?.chapters?.["jade-lantern-archive-c01"]?.completedAt).toBe(firstCompletedAt);

  const learningState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}")
  );
  expect(learningState.savedWords?.filter((id: string) => id === "hsk-vocab-00863"))
    .toHaveLength(1);
  expect(Object.keys(learningState.fsrsCards ?? {}).filter((id) => id === "hsk-vocab-00863"))
    .toHaveLength(1);
  expect((learningState.evidence ?? []).filter((item: { source: string }) =>
    item.source === "reader"
  )).toEqual([]);
});

test("opens the independent library immediately for an authenticated account session", async ({ page }) => {
  await finishOnboarding(page);
  await page.route("**/api/session", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "cache-control": "private, no-store" },
    body: JSON.stringify({
      authenticated: true,
      accountKey: "account:e2e-reader",
      user: {
        displayName: "Hành giả E2E",
        email: "reader@example.com",
        fullName: null,
        provider: "hanzi",
      },
      authorization: { roles: ["learner"], permissions: ["learning:use"] },
    }),
  }));
  await page.route("**/api/sync", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          protocolVersion: 1,
          revision: 0,
          cursor: 0,
          document: null,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "e2e-offline", message: "Queued locally" } }),
    });
  });
  await page.goto("/reader", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("reader-library")).toBeVisible();
  await expect(page.getByText("Trang đọc đã khép lại")).toHaveCount(0);
  await expect(page.getByTestId("reader-book-grid").getByRole("link")).toHaveCount(25);
});

test("discovers an original light novel in-page, opens its details and looks up vocabulary", async ({ page }) => {
  await finishOnboarding(page);
  await page.goto("/reader");
  await expect(page.getByTestId("reader-book-grid").getByRole("link")).toHaveCount(25);

  await page.getByRole("button", { name: "Khám phá" }).click();
  const search = page.getByRole("searchbox", { name: "Tìm theo tên, nội dung hoặc thể loại" });
  await expect(search).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await search.fill("Pháp Sư Ca Đêm");
  await expect(page.getByTestId("reader-book-grid").getByRole("link")).toHaveCount(1);

  await page.getByRole("link", { name: "Mở mô tả Pháp Sư Ca Đêm" }).click();
  await expect(page.getByRole("heading", { name: "Pháp Sư Ca Đêm" })).toBeVisible();
  await expect(page.getByText(/Sinh viên làm thêm Tô Nguyên/u)).toBeVisible();
  await page.getByRole("link", { name: "Mở chương đầu" }).click();
  await expect(page.getByRole("heading", { name: "逾期一百年的书" })).toBeVisible();
  await page.getByRole("button", { name: "Tra từ 图书馆" }).click();
  const wordSheet = page.getByRole("dialog", { name: "图书馆" });
  await expect(wordSheet.getByText("túshūguǎn")).toBeVisible();
  await expect(wordSheet.getByText("thư viện", { exact: true })).toBeVisible();
});

for (const viewport of [
  { width: 1365, height: 640 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]) {
  test(`keeps the immersive header and primary action reachable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await finishOnboarding(page);
    await page.goto("/reader");
    await expect(page.getByTestId("reader-book-grid")).toBeVisible();
    const libraryGeometry = await page.getByTestId("reader-library").evaluate(() => {
      const firstBook = document.querySelector(".reader-library-book-card")?.getBoundingClientRect();
      return {
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        firstBookTop: firstBook?.top,
        viewportHeight: window.innerHeight,
      };
    });
    expect(libraryGeometry.horizontalOverflow).toBe(false);
    expect(libraryGeometry.firstBookTop).toBeLessThan(libraryGeometry.viewportHeight);

    await openPilotChapter(page);

    const geometry = await page.getByTestId("reader-chapter-shell").evaluate(() => {
      const header = document.querySelector(".reader-chapter-header")?.getBoundingClientRect();
      const footer = document.querySelector(".reader-chapter-footer")?.getBoundingClientRect();
      const cta = document.querySelector(".reader-chapter-footer .reader-button--primary")?.getBoundingClientRect();
      return {
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        headerTop: header?.top,
        footerBottom: footer?.bottom,
        ctaTop: cta?.top,
        ctaBottom: cta?.bottom,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry.horizontalOverflow).toBe(false);
    expect(geometry.headerTop).toBe(0);
    expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.ctaTop).toBeGreaterThanOrEqual(0);
    expect(geometry.ctaBottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    await expect(page.locator(".assessment-invite")).toHaveCount(0);
  });
}

test("traps dialog focus, restores the trigger and honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await finishOnboarding(page);
  await openPilotChapter(page);
  const trigger = page.getByRole("button", { name: "Hỗ trợ đọc" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Hỗ trợ đọc" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Nghe toàn chương" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Đóng Hỗ trợ đọc" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  const moving = await page.getByTestId("reader-chapter-shell").evaluate((root) => {
    const toMilliseconds = (duration: string) => duration.endsWith("ms")
      ? Number.parseFloat(duration)
      : Number.parseFloat(duration) * 1_000;
    const hasPositiveDuration = (value: string) => value
      .split(",")
      .some((duration) => toMilliseconds(duration.trim()) > 0.02);
    return [...root.querySelectorAll("*")].filter((element) => {
      const style = getComputedStyle(element);
      return hasPositiveDuration(style.animationDuration)
        || hasPositiveDuration(style.transitionDuration);
    }).length;
  });
  expect(moving).toBe(0);
});
