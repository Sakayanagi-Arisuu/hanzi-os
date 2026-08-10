import { expect, test } from "@playwright/test";

const areaLabels = ["Học", "Ôn", "Nói", "Luyện", "Hồ sơ"] as const;

test("presents one clear Reforge product contract", async ({ page }) => {
  await page.goto("/reforge");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Học tiếng Trung rõ đường, nhớ lâu, dùng được.",
  })).toBeVisible();
  await expect(page.getByText("Người Việt tự học từ số 0 đến HSK4.")).toBeVisible();
  await expect(page.getByText("Mandarin Trung Quốc đại lục, chữ giản thể và Pinyin.")).toBeVisible();
  await expect(page.getByText(/không phải tuyên bố mọi chức năng đã hoàn tất/u)).toBeVisible();
  await expect(page.locator("[data-reforge-area]")).toHaveCount(5);

  for (const label of areaLabels) {
    await expect(page.getByRole("heading", { level: 3, name: label })).toBeVisible();
  }

  await expect(page.getByText("Học / Hôm nay", { exact: true })).toBeVisible();
  await expect(page.getByText("Kết phiên", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ranh giới nguyên bản" })).toBeVisible();
  await expect(page.locator(".reforge-primary-action")).toHaveCount(1);
});

test("fits a 360px viewport with keyboard focus and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/reforge");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  await page.keyboard.press("Tab");
  const primaryAction = page.getByRole("link", { name: /Vào HANZI\.OS/u });
  await expect(primaryAction).toBeFocused();

  const actionBox = await primaryAction.boundingBox();
  expect(actionBox?.height).toBeGreaterThanOrEqual(44);
  const outlineStyle = await primaryAction.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outlineStyle).not.toBe("none");
  const motion = await primaryAction.evaluate((element) => ({
    animationName: getComputedStyle(element).animationName,
    transitionDuration: getComputedStyle(element).transitionDuration,
  }));
  expect(motion.animationName).toBe("none");
  expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.001);
});
