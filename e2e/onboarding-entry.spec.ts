import { expect, test, type Locator, type Page } from "@playwright/test";

const heroStartButton = (page: Page) =>
  page.locator("#landing-main").getByRole("button", {
    name: "Kích hoạt HANZI.OS",
  });

const persistedOnboardingFlag = (page: Page) => page.evaluate(() => {
  const raw = localStorage.getItem("hanzi-os-learning-state-v1");
  if (!raw) return false;
  return Boolean(JSON.parse(raw).profile?.onboarded);
});

const expectActionableWithoutDocumentScroll = async (
  page: Page,
  action: Locator,
) => {
  await expect(action).toBeVisible();
  const geometry = await action.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(centerX, centerY);
    return {
      bottom: rect.bottom,
      centerHitsAction: hit === element || element.contains(hit),
      left: rect.left,
      right: rect.right,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      top: rect.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });

  expect(geometry.scrollX).toBe(0);
  expect(geometry.scrollY).toBe(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.centerHitsAction).toBe(true);
};

const expectReducedMotion = async (page: Page) => {
  const offenders = await page.evaluate(() => {
    const toMilliseconds = (duration: string) => duration.endsWith("ms")
      ? Number.parseFloat(duration)
      : Number.parseFloat(duration) * 1_000;
    const hasLongDuration = (value: string) => value
      .split(",")
      .some((duration) => toMilliseconds(duration.trim()) > 0.02);

    return [...document.querySelectorAll("*")].flatMap((element) => {
      const styles = [
        getComputedStyle(element),
        getComputedStyle(element, "::before"),
        getComputedStyle(element, "::after"),
      ];
      return styles.some((style) =>
        hasLongDuration(style.animationDuration)
        || hasLongDuration(style.transitionDuration)
      )
        ? [`${element.tagName.toLowerCase()}.${element.getAttribute("class") ?? ""}`]
        : [];
    }).slice(0, 10);
  });

  expect(offenders).toEqual([]);
};

test("shows the product overview before asking a fresh learner to configure a profile", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("product-overview")).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Đánh thức một hệ thống Hán ngữ dành riêng cho bạn.",
  })).toBeVisible();
  const systemMap = page.locator("#he-thong");
  await expect(systemMap.locator("article")).toHaveCount(5);
  await expect(systemMap.getByRole("heading", { name: "Thiên Lộ" })).toBeVisible();
  await expect(systemMap.getByRole("heading", { name: "Vạn Âm Điện" })).toBeVisible();
  await expect(systemMap.getByText("1.096 chữ nhận diện trong ngữ cảnh", {
    exact: true,
  })).toBeVisible();
  await expect(page.getByTestId("onboarding-wizard")).toHaveCount(0);
  await expect(page.getByRole("radiogroup", { name: "Mục tiêu học" })).toHaveCount(0);
  expect(await persistedOnboardingFlag(page)).toBe(false);

  await heroStartButton(page).click();

  await expect(page).toHaveURL(/\/onboarding$/u);
  await expect(page.getByTestId("product-overview")).toHaveCount(0);
  await expect(page.getByTestId("onboarding-wizard")).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Mục tiêu học" })).toBeVisible();
  expect(await persistedOnboardingFlag(page)).toBe(false);

  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
  await expect(page).toHaveURL(/\/assessment$/u);
  await expect(page.getByRole("heading", { name: "Khảo Nghiệm Căn Cơ" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("hanzi-os-learning-state-v1");
    return raw ? JSON.parse(raw).profile?.name : null;
  })).toBe("Hành giả vô danh");

  await page.goto("/welcome");
  await page.locator("#landing-main").getByRole("link", {
    name: "Kích hoạt HANZI.OS",
  }).click();
  await expect(page).toHaveURL(/\/onboarding$/u);
  await expect(page.getByTestId("onboarding-wizard")).toBeVisible();
});

for (const viewport of [
  { label: "short desktop", width: 1365, height: 640 },
  { label: "short mobile", width: 360, height: 640 },
] as const) {
  test(`keeps every first-run primary action reachable on ${viewport.label}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const start = heroStartButton(page);
    await expectActionableWithoutDocumentScroll(page, start);
    await start.click();

    const next = page.getByRole("button", { name: "Tiếp tục", exact: true });
    await expectActionableWithoutDocumentScroll(page, next);
    await next.click();
    await expectActionableWithoutDocumentScroll(page, next);
    await next.click();

    await expectActionableWithoutDocumentScroll(
      page,
      page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }),
    );
  });
}

test("supports keyboard setup, back navigation and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const start = heroStartButton(page);
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", {
    name: "Bạn học tiếng Trung để làm gì?",
  })).toBeFocused();

  const goalGroup = page.getByRole("radiogroup", { name: "Mục tiêu học" });
  const conversation = goalGroup.getByRole("radio", {
    name: /^Giao tiếp hằng ngày/u,
  });
  const hsk = goalGroup.getByRole("radio", {
    name: /^Học theo lộ trình HSK/u,
  });
  await conversation.focus();
  await page.keyboard.press("ArrowRight");
  await expect(hsk).toBeFocused();
  await expect(hsk).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByRole("heading", {
    name: "Bạn muốn bắt đầu từ đâu?",
  })).toBeFocused();
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(hsk).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("heading", {
    name: "Bạn học tiếng Trung để làm gì?",
  })).toBeFocused();

  await expectReducedMotion(page);
});
