import { expect, test, type Page } from "@playwright/test";

const finishOnboarding = async (page: Page) => {
  await page.goto("/");
  const productOverview = page.getByTestId("product-overview");
  const carousel = page.getByRole("region", {
    name: /Các cửa sổ hologram của Thức Tỉnh Điện/u,
  });
  await expect(productOverview.or(carousel)).toBeVisible({ timeout: 30_000 });
  if (await productOverview.isVisible()) {
    await page.locator("#landing-main").getByRole("button", {
      name: "Kích hoạt HANZI.OS",
    }).click();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByRole("button", {
      name: "Bắt đầu Khảo Nghiệm Căn Cơ",
    }).click();
    await expect(page).toHaveURL(/\/assessment$/u);
    await page.goto("/");
  }

  const closeInvite = page.getByRole("button", {
    name: "Đóng lời mời Khảo Nghiệm Căn Cơ",
  });
  await closeInvite.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  if (await closeInvite.isVisible()) await closeInvite.click();
};

const openDashboardPillars = async (page: Page) => {
  const carousel = page.getByRole("region", {
    name: /Các cửa sổ hologram của Thức Tỉnh Điện/u,
  });
  const previousButton = carousel.getByRole("button", { name: /Cửa sổ trước/u });
  await previousButton.click();
  await expect(carousel.locator('[data-slide-id="path"]')).toBeVisible();
  await previousButton.click();
  const panel = carousel.locator('[data-slide-id="pillars"]');
  await expect(panel).toBeVisible();
  return { carousel, panel };
};

type Rect = { x: number; y: number; width: number; height: number };

const expectRectUnchanged = (after: Rect, before: Rect) => {
  for (const key of ["x", "y", "width", "height"] as const) {
    expect(Math.abs(after[key] - before[key])).toBeLessThanOrEqual(1);
  }
};

const captureDashboardGeometry = (page: Page) => page.evaluate(() => {
  const rect = (selector: string) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing ${selector}`);
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  };
  const scrolling = document.scrollingElement!;
  return {
    document: {
      clientWidth: scrolling.clientWidth,
      clientHeight: scrolling.clientHeight,
      scrollWidth: scrolling.scrollWidth,
      scrollHeight: scrolling.scrollHeight,
      scrollLeft: scrolling.scrollLeft,
      scrollTop: scrolling.scrollTop,
    },
    carousel: rect(".dashboard-deck"),
    slide: rect('[data-slide-id="pillars"]'),
    header: rect('[data-slide-id="pillars"] .dashboard-window-header'),
    body: rect('[data-slide-id="pillars"] .pillar-command-layout'),
    previous: rect(".dashboard-carousel-arrow.is-previous"),
    next: rect(".dashboard-carousel-arrow.is-next"),
  };
});

test("keeps exact Seven Pillars evidence behind the analytics disclosure", async ({
  page,
}) => {
  await finishOnboarding(page);
  await page.goto("/analytics");

  const panel = page.locator(".mastery-map-panel");
  const meters = panel.getByRole("progressbar");
  const details = panel.locator("details.pillar-details");
  const summary = details.locator("summary");

  await expect(panel).toBeVisible({ timeout: 20_000 });
  await expect(meters).toHaveCount(7);
  await expect(panel.locator('[role="progressbar"][data-state="insufficient"]'))
    .toHaveCount(7);
  await expect(panel.locator('[role="progressbar"][data-state="unavailable"]'))
    .toHaveCount(0);
  await expect(panel.getByRole("progressbar", { name: "Nhiệm vụ nói" }))
    .toHaveAttribute("aria-valuetext", "Căn cơ đang được dò xét");
  await expect(panel.getByRole("progressbar", { name: "Từ vựng" }))
    .toHaveAttribute("aria-valuetext", "Căn cơ đang được dò xét");

  for (const meter of await meters.all()) {
    await expect(meter).not.toHaveAttribute("aria-valuenow", /.+/u);
  }

  await expect(details).not.toHaveAttribute("open", "");
  await expect(details.locator("dd")).toHaveCount(7);
  await expect(details.locator("dd").first()).not.toBeVisible();
  await expect(panel).not.toContainText(/ít nhất hai|24 giờ|Wilson/iu);
  expect(await summary.evaluate((element) =>
    getComputedStyle(element).justifyContent
  )).toBe("center");

  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(details.locator("dd").first()).toBeVisible();
  await expect(details.getByText("Chưa ghi nhận chiến tích").first()).toBeVisible();
  const speaking = details.locator('[data-skill="speaking"]');
  await expect(speaking.locator("dd")).toHaveText("Chưa ghi nhận chiến tích");
  await expect(speaking).not.toContainText(/Luyện tập đã mở|Chưa có phép đo năng lực|%|Trụ chưa khai mở/u);
  await expect(speaking.getByRole("link")).toHaveCount(0);
});

for (const viewport of [
  { width: 1365, height: 640, label: "desktop thấp" },
  { width: 360, height: 640, label: "mobile thấp" },
] as const) {
  test(`opens a bounded Seven Pillars evidence overlay at ${viewport.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await finishOnboarding(page);
    const { carousel, panel } = await openDashboardPillars(page);

    const speakingMeter = panel.getByRole("progressbar", { name: "Nhiệm vụ nói" });
    await expect(speakingMeter).toHaveAttribute("data-state", "insufficient");
    await expect(speakingMeter).not.toHaveAttribute("aria-valuenow", /.+/u);
    const speakingRow = panel.locator('.pillar-signal-row[data-skill="speaking"]');
    const readingRow = panel.locator('.pillar-signal-row[data-skill="reading"]');
    const rowVisuals = async (row: typeof speakingRow) => row.evaluate((element) => {
      const rowStyle = getComputedStyle(element);
      const meterStyle = getComputedStyle(element.querySelector(".pillar-meter")!);
      return {
        background: rowStyle.backgroundImage,
        borderColor: rowStyle.borderColor,
        borderStyle: rowStyle.borderStyle,
        meterBackground: meterStyle.backgroundImage,
        meterBorder: meterStyle.border,
      };
    });
    expect(await rowVisuals(speakingRow)).toEqual(await rowVisuals(readingRow));

    const trigger = panel.getByTestId("pillar-details-trigger");
    await expect(trigger).toHaveAccessibleName("Chi tiết bằng chứng 07 hồ sơ từng trụ");
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    const before = await captureDashboardGeometry(page);

    await trigger.click();
    const dialog = panel.getByRole("dialog", { name: "Chi tiết bằng chứng Thất Trụ" });
    const close = dialog.getByRole("button", { name: "Đóng chi tiết Thất Trụ" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.locator(".pillar-evidence-row")).toHaveCount(7);
    const speaking = dialog.locator('[data-skill="speaking"]');
    const reading = dialog.locator('[data-skill="reading"]');
    await expect(speaking).toContainText("Cần thêm mẫu");
    await expect(speaking.locator("dd")).toHaveText(await reading.locator("dd").innerText());
    await expect(speaking).not.toContainText(/Luyện tập đã mở|Chưa có phép đo năng lực|%|Trụ chưa khai mở/u);
    await expect(speaking.getByRole("link")).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(close).toBeFocused();
    const closeBox = await close.boundingBox();
    expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(carousel).toHaveAttribute("data-rotation", "paused");
    await expect(panel).not.toContainText(/ít nhất hai|24 giờ|Wilson/iu);

    const overlayGeometry = await dialog.evaluate((element) => {
      const overlay = element.getBoundingClientRect();
      const slide = element.closest<HTMLElement>('[data-slide-id="pillars"]')!
        .getBoundingClientRect();
      return {
        overlay: { left: overlay.left, top: overlay.top, right: overlay.right, bottom: overlay.bottom },
        slide: { left: slide.left, top: slide.top, right: slide.right, bottom: slide.bottom },
      };
    });
    expect(overlayGeometry.overlay.left).toBeGreaterThanOrEqual(overlayGeometry.slide.left - 1);
    expect(overlayGeometry.overlay.top).toBeGreaterThanOrEqual(overlayGeometry.slide.top - 1);
    expect(overlayGeometry.overlay.right).toBeLessThanOrEqual(overlayGeometry.slide.right + 1);
    expect(overlayGeometry.overlay.bottom).toBeLessThanOrEqual(overlayGeometry.slide.bottom + 1);

    const scrollRegion = dialog.getByTestId("pillar-details-scroll");
    const scrollGeometry = await scrollRegion.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }));
    expect(scrollGeometry.overflowY).toBe("auto");
    if (scrollGeometry.scrollHeight > scrollGeometry.clientHeight) {
      await scrollRegion.evaluate((element) => { element.scrollTop = element.scrollHeight; });
      expect(await scrollRegion.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    }

    const after = await captureDashboardGeometry(page);
    expect(after.document.scrollWidth).toBeLessThanOrEqual(after.document.clientWidth + 1);
    expect(after.document.scrollHeight).toBeLessThanOrEqual(after.document.clientHeight + 1);
    expect(after.document.scrollLeft).toBe(before.document.scrollLeft);
    expect(after.document.scrollTop).toBe(before.document.scrollTop);
    for (const key of ["carousel", "slide", "header", "body", "previous", "next"] as const) {
      expectRectUnchanged(after[key], before[key]);
    }

    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await close.click();
    await expect(dialog).not.toBeAttached();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
