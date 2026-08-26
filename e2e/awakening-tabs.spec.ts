import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

const finishOnboarding = async (page: import("@playwright/test").Page) => {
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
    await expect(page.getByTestId("onboarding-wizard")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
    await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
    await expect(page).toHaveURL(/\/assessment$/u);
    await page.goto("/");
  }
  await expect(carousel).toBeVisible({ timeout: 30_000 });
  const closeInvite = page.getByRole("button", {
    name: "Đóng lời mời Khảo Nghiệm Căn Cơ",
  });
  if (await closeInvite.isVisible()) await closeInvite.click();
  await page.mouse.move(1, 1);
};

const slideIds = ["awakening", "status", "missions", "pillars", "path"] as const;

test("keeps the hologram carousel in one viewport and supports side controls", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 640 });
  await finishOnboarding(page);

  const carousel = page.getByRole("region", {
    name: /Các cửa sổ hologram của Thức Tỉnh Điện/u,
  });
  const previousButton = carousel.getByRole("button", { name: /Cửa sổ trước/u });
  const nextButton = carousel.getByRole("button", { name: /Cửa sổ tiếp theo/u });

  await expect(carousel.getByRole("tablist")).toHaveCount(0);
  await expect(carousel.locator(".dashboard-window-console")).toHaveCount(0);
  await expect(carousel.locator('[data-dashboard-slide]:not([hidden])')).toHaveAttribute("data-slide-id", "awakening");
  await nextButton.click();
  await expect(carousel.locator('[data-dashboard-slide]:not([hidden])')).toHaveAttribute("data-slide-id", "status");

  await nextButton.focus();
  await page.keyboard.press("Enter");
  await expect(nextButton).toBeFocused();
  await expect(carousel.locator('[data-dashboard-slide]:not([hidden])')).toHaveAttribute("data-slide-id", "missions");
  await previousButton.focus();
  await page.keyboard.press("Space");
  await expect(previousButton).toBeFocused();
  await expect(carousel.locator('[data-dashboard-slide]:not([hidden])')).toHaveAttribute("data-slide-id", "status");

  const statusSlide = carousel.locator('[data-slide-id="status"]');
  await expect(statusSlide.getByRole("heading", { name: "Bản đồ nhịp học" })).toBeVisible();
  await expect(statusSlide.locator(".dashboard-window-cta")).toHaveAttribute("href", /\/(assessment|analytics)$/u);
  const signalOrbitAlignment = await statusSlide.locator(".dashboard-signal-orbit").evaluate((orbit) => {
    const orbitRect = orbit.getBoundingClientRect();
    const label = orbit.querySelector("strong");
    if (!label) throw new Error("Missing Thất Trụ signal label");
    const labelRect = label.getBoundingClientRect();
    return {
      centerDelta: Math.abs(
        orbitRect.left + orbitRect.width / 2 - (labelRect.left + labelRect.width / 2),
      ),
      textAlign: getComputedStyle(label).textAlign,
      whiteSpace: getComputedStyle(label).whiteSpace,
    };
  });
  expect(signalOrbitAlignment.centerDelta).toBeLessThanOrEqual(2);
  expect(signalOrbitAlignment.textAlign).toBe("center");
  expect(signalOrbitAlignment.whiteSpace).toBe("nowrap");

  await nextButton.click();
  const missionSlide = carousel.locator('[data-slide-id="missions"]');
  await expect(missionSlide.getByRole("heading", { name: "Nhiệm vụ nên làm ngay" })).toBeVisible();
  await expect(missionSlide.locator(".mission-start-command")).toBeVisible();
  const missionPalette = await missionSlide.evaluate((slide) => {
    const root = getComputedStyle(slide);
    return {
      accent: root.getPropertyValue("--window-accent-rgb").replaceAll(" ", ""),
      token: getComputedStyle(slide.querySelector<HTMLElement>(".dashboard-window-token")!).color,
      cta: getComputedStyle(slide.querySelector<HTMLElement>(".dashboard-window-cta")!).backgroundColor,
      sigilBorder: getComputedStyle(slide.querySelector<HTMLElement>(".mission-sigil")!).borderColor,
    };
  });
  expect(missionPalette.accent).toBe("81,246,193");
  expect(missionPalette.token).toBe("rgb(81, 246, 193)");
  expect(missionPalette.cta).toBe("rgb(81, 246, 193)");
  expect(missionPalette.sigilBorder).toContain("81, 246, 193");
  await nextButton.click();
  const pillarSlide = carousel.locator('[data-slide-id="pillars"]');
  await expect(pillarSlide.getByRole("heading", { name: "Bản đồ bảy vùng kỹ năng" })).toBeVisible();
  await expect(pillarSlide.locator(".pillar-signal-row")).toHaveCount(7);
  await expect(pillarSlide.getByRole("link", { name: "Mở phân tích Thất Trụ" })).toHaveAttribute("href", "/analytics");
  await nextButton.click();
  const pathSlide = carousel.locator('[data-slide-id="path"]');
  await expect(pathSlide.getByRole("heading", { name: "Biết mình đang ở đâu" })).toBeVisible();
  await expect(pathSlide.locator(".dashboard-window-cta")).toHaveAttribute("href", /\/(lesson\/[^/]+|path)$/u);
  const pathPalette = await pathSlide.evaluate((slide) => {
    const root = getComputedStyle(slide);
    const currentMarker = slide.querySelector<HTMLElement>(".realm-node.current .realm-marker");
    return {
      accent: root.getPropertyValue("--window-accent-rgb").replaceAll(" ", ""),
      token: getComputedStyle(slide.querySelector<HTMLElement>(".dashboard-window-token")!).color,
      cta: getComputedStyle(slide.querySelector<HTMLElement>(".dashboard-window-cta")!).backgroundColor,
      progress: getComputedStyle(slide.querySelector<HTMLElement>(".path-progress-core")!).backgroundImage,
      progressValue: getComputedStyle(slide.querySelector<HTMLElement>(".path-progress-core strong")!).color,
      currentMarker: currentMarker ? getComputedStyle(currentMarker).backgroundColor : null,
    };
  });
  expect(pathPalette.accent).toBe("81,246,193");
  expect(pathPalette.token).toBe("rgb(81, 246, 193)");
  expect(pathPalette.cta).toBe("rgb(81, 246, 193)");
  expect(pathPalette.progress).toContain("85, 217, 255");
  expect(pathPalette.progress).not.toContain("233, 137, 219");
  expect(pathPalette.progressValue).toBe("rgb(85, 217, 255)");
  expect(pathPalette.currentMarker).toBe("rgb(85, 217, 255)");

  const controlGeometry = await Promise.all([previousButton, nextButton].map((button) => button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right };
  })));
  for (const control of controlGeometry) {
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.height).toBeGreaterThanOrEqual(44);
    expect(control.left).toBeGreaterThanOrEqual(0);
    expect(control.right).toBeLessThanOrEqual(1365);
  }
  expect(controlGeometry[0].left).toBeLessThan(controlGeometry[1].left);

  const desktopGeometry = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(desktopGeometry.scrollHeight).toBeLessThanOrEqual(desktopGeometry.clientHeight);
  expect(desktopGeometry.scrollWidth).toBeLessThanOrEqual(desktopGeometry.clientWidth);

  await nextButton.click();
  await expect(carousel.locator('[data-dashboard-slide]:not([hidden])')).toHaveAttribute("data-slide-id", "awakening");
  await page.setViewportSize({ width: 360, height: 640 });
  await expect(carousel.locator('[data-dashboard-slide]:not([hidden])')).toHaveAttribute("data-slide-id", "awakening");
  for (const [index, slideId] of slideIds.entries()) {
    const activeSlide = carousel.locator('[data-dashboard-slide]:not([hidden])');
    await expect(activeSlide).toHaveAttribute("data-slide-id", slideId);
    if (slideId !== "awakening") {
      await expect(activeSlide.locator(".dashboard-window-header h2")).toBeVisible();
      await expect(activeSlide.locator(".dashboard-window-cta")).toBeVisible();
    }
    const panelGeometry = await activeSlide.evaluate((panel) => ({
      clientHeight: panel.clientHeight,
      scrollHeight: panel.scrollHeight,
    }));
    expect(panelGeometry.scrollHeight).toBeLessThanOrEqual(panelGeometry.clientHeight + 6);
    if (index < slideIds.length - 1) await nextButton.click();
  }
  const mobileGeometry = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(mobileGeometry.scrollHeight).toBeLessThanOrEqual(mobileGeometry.clientHeight);
  expect(mobileGeometry.scrollWidth).toBeLessThanOrEqual(mobileGeometry.clientWidth);
});

test("rotates every five seconds", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 640 });
  await finishOnboarding(page);

  const carousel = page.getByRole("region", {
    name: /Các cửa sổ hologram của Thức Tỉnh Điện/u,
  });
  const activeSlide = carousel.locator('[data-dashboard-slide]:not([hidden])');
  await carousel.getByRole("button", { name: /Cửa sổ tiếp theo/u }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(1, 1);
  await expect(carousel).toHaveAttribute("data-rotation", "running");
  await expect(activeSlide).toHaveAttribute("data-slide-id", "status");
  await page.waitForTimeout(4_600);
  await expect(activeSlide).toHaveAttribute("data-slide-id", "status");
  await expect(activeSlide).toHaveAttribute("data-slide-id", "missions", { timeout: 1_000 });
});

test("does not auto-rotate when reduced motion is requested on entry", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await finishOnboarding(page);

  const carousel = page.getByRole("region", {
    name: /Các cửa sổ hologram của Thức Tỉnh Điện/u,
  });
  const awakeningSlide = carousel.locator('[data-slide-id="awakening"]');
  await expect(awakeningSlide).toBeVisible();
  await expect(carousel).toHaveAttribute("data-rotation", "paused");
  await page.waitForTimeout(5_500);
  await expect(awakeningSlide).toBeVisible();
});
