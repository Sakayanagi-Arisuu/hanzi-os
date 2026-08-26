import { expect, test, type Page } from "@playwright/test";
import { completeLessonTheory } from "./helpers/lessonTheory";

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
  await expect(page.getByRole("heading", {
    name: "Khảo Nghiệm Căn Cơ",
  })).toBeVisible();
};

const expectRunnerDockInsideUsableViewport = async (
  page: Page,
  viewport: { width: number; height: number },
  target: {
    actionName: string;
    reachableSelector?: string;
    rootSelector: string;
    scrollRegionSelector: string;
  },
) => {
  await page.setViewportSize(viewport);
  await page.evaluate(() => window.scrollTo(0, 0));

  const runner = page.locator(target.rootSelector);
  const scrollRegion = runner.locator(target.scrollRegionSelector);
  const footer = runner.locator(":scope > footer");
  const action = footer.getByRole("button", { name: target.actionName });
  await expect(action).toBeVisible();

  const before = await action.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const mobileNav = document.querySelector<HTMLElement>(".mobile-nav");
    const mobileNavVisible = mobileNav
      ? getComputedStyle(mobileNav).display !== "none"
      : false;
    const usableBottom = mobileNavVisible
      ? mobileNav!.getBoundingClientRect().top
      : window.innerHeight;
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      bottom: rect.bottom,
      height: rect.height,
      hit: Boolean(hit && element.contains(hit)),
      pageScrollY: window.scrollY,
      top: rect.top,
      usableBottom,
    };
  });
  expect(before.top).toBeGreaterThanOrEqual(0);
  expect(before.bottom).toBeLessThanOrEqual(before.usableBottom + 1);
  expect(before.height).toBeGreaterThanOrEqual(44);
  expect(before.hit).toBe(true);
  expect(before.pageScrollY).toBe(0);
  await expect(scrollRegion).toHaveCSS("overflow-y", "auto");

  const footerTop = await footer.evaluate((element) =>
    element.getBoundingClientRect().top
  );
  await scrollRegion.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  if (target.reachableSelector) {
    const lastControl = runner.locator(target.reachableSelector).last();
    const controlReachable = await lastControl.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const scrollParent = element.closest<HTMLElement>(
        ".assessment-question, .exercise-stage",
      )!;
      const region = scrollParent.getBoundingClientRect();
      return rect.top >= region.top - 1 && rect.bottom <= region.bottom + 1;
    });
    expect(controlReachable).toBe(true);
  }
  await expect.poll(() => footer.evaluate((element) =>
    element.getBoundingClientRect().top
  )).toBe(footerTop);
};

test("opens a real level check and keeps answers sealed until the final result", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await finishOnboarding(page);
  await expect(page.getByTestId("placement-gateway")).toBeVisible();
  await expect(page.getByText(/chưa thể bắt đầu/iu)).toHaveCount(0);

  await page.getByRole("button", { name: "Chọn tầng Khảo Nghiệm" }).click();
  await page.getByRole("radio", { name: /HSK2 · Căn cơ sơ cấp/u }).click();
  await page.getByRole("link", { name: "Mở Khảo Nghiệm HSK2" }).click();
  await expect(page).toHaveURL(/\/assessment\/placement\/hsk2$/u);
  await expect(page.getByRole("heading", {
    name: "Khảo Nghiệm Căn Cơ HSK2",
  })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm" }).click();

  await page.getByRole("radiogroup", {
    name: "Các lựa chọn cho câu 1",
  }).getByRole("radio").first().click();
  await expect(page.getByText("2/12", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã ghi nhận", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Đáp án:/u)).toHaveCount(0);
  await expect(page.getByText("Chính xác", { exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("2/12", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Rời Khảo Nghiệm Căn Cơ" }).click();
  await page.getByRole("button", { name: "Chọn tầng Khảo Nghiệm" }).click();
  await page.getByRole("radio", { name: /HSK2 · Căn cơ sơ cấp/u }).click();
  await page.getByRole("link", { name: "Mở Khảo Nghiệm HSK2" }).click();
  await expect(page.getByText("2/12", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const resume = JSON.parse(
      localStorage.getItem("hanzi-os-hsk2-level-check-session-v1:placement-gate-v1") ?? "null",
    );
    return {
      answerCount: Object.keys(resume?.answers ?? {}).length,
      checked: resume?.checked,
      index: resume?.index,
      selected: resume?.selected,
    };
  })).toEqual({ answerCount: 1, checked: false, index: 1, selected: null });
});

test("keeps every Khảo Nghiệm choice reachable on short desktop and mobile", async ({
  page,
}) => {
  await finishOnboarding(page);
  await page.getByRole("button", { name: "Chọn tầng Khảo Nghiệm" }).click();
  await page.getByRole("link", { name: "Mở Khảo Nghiệm HSK1" }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm" }).click();

  for (const viewport of [
    { width: 1365, height: 640 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    const runner = page.getByTestId("hsk1-level-check-live");
    const question = runner.locator(".assessment-question");
    await expect(question).toHaveCSS("overflow-y", "auto");
    await question.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const lastChoice = runner.getByRole("radio").last();
    await expect(lastChoice).toBeVisible();
    await expect.poll(() => lastChoice.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const region = element.closest<HTMLElement>(".assessment-question")!
        .getBoundingClientRect();
      return rect.top >= region.top - 1
        && rect.bottom <= region.bottom + 1
        && rect.height >= 44
        && window.scrollY === 0;
    })).toBe(true);
  }
});

test("keeps the Thử Luyện action dock visible without covering activities", async ({
  page,
}) => {
  await finishOnboarding(page);
  await page.getByRole("button", {
    name: "Ta chưa biết gì · bắt đầu từ số 0",
  }).click();
  await completeLessonTheory(page);
  await page.getByRole("button", { name: /Bước vào Thử Luyện/iu }).click();

  const target = {
    actionName: "Xác nhận",
    reachableSelector: ".answer-grid button, .recall-answer input",
    rootSelector: ".lesson-live-page",
    scrollRegionSelector: ".exercise-stage",
  };
  await expectRunnerDockInsideUsableViewport(page, { width: 1365, height: 640 }, target);
  await expectRunnerDockInsideUsableViewport(page, { width: 360, height: 640 }, target);
});

test("lets a complete beginner skip Khảo Nghiệm Căn Cơ and enter HSK0", async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole("button", {
    name: "Ta chưa biết gì · bắt đầu từ số 0",
  }).click();
  await expect(page).toHaveURL(/\/lesson\/boot-1$/u);
  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
    );
    return {
      startingLevel: state.profile?.startingLevel,
      diagnosticCompleted: state.diagnostic?.completed,
      label: state.activityLog?.at(-1)?.label,
    };
  })).toEqual({
    startingLevel: "zero",
    diagnosticCompleted: true,
    label: "Bỏ qua Khảo Nghiệm Căn Cơ · bắt đầu từ số 0",
  });
});

test("splits the gateway into two screens and resumes the exact question from its invitation", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await finishOnboarding(page);

  for (const viewport of [
    { width: 1365, height: 640 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.getByTestId("placement-overview-screen")).toBeVisible();
    await expect(page.getByTestId("placement-level-screen")).toHaveCount(0);

    const next = page.getByRole("button", { name: "Chọn tầng Khảo Nghiệm" });
    await expect(next).toBeVisible();
    await expect.poll(() => next.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const mobileNav = document.querySelector<HTMLElement>(".mobile-nav");
      const usableBottom = mobileNav && getComputedStyle(mobileNav).display !== "none"
        ? mobileNav.getBoundingClientRect().top
        : window.innerHeight;
      return rect.top >= 0 && rect.bottom <= usableBottom + 1;
    })).toBe(true);

    await next.click();
    await expect(page.getByTestId("placement-level-screen")).toBeVisible();
    await expect(page.getByTestId("placement-overview-screen")).toHaveCount(0);
    const open = page.getByRole("link", { name: "Mở Khảo Nghiệm HSK1" });
    await expect(open).toBeVisible();
    await expect.poll(() => open.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const mobileNav = document.querySelector<HTMLElement>(".mobile-nav");
      const usableBottom = mobileNav && getComputedStyle(mobileNav).display !== "none"
        ? mobileNav.getBoundingClientRect().top
        : window.innerHeight;
      return rect.top >= 0 && rect.bottom <= usableBottom + 1;
    })).toBe(true);
  }

  await page.goto("/assessment");
  await page.getByRole("button", { name: "Chọn tầng Khảo Nghiệm" }).click();
  await page.getByRole("link", { name: "Mở Khảo Nghiệm HSK1" }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm" }).click();
  await page.getByRole("radiogroup", {
    name: "Các lựa chọn cho câu 1",
  }).getByRole("radio").first().click();
  await expect(page.getByText("2/12", { exact: true })).toBeVisible();

  await page.goto("/");
  const invite = page.getByRole("status", {
    name: "Lời mời Khảo Nghiệm Căn Cơ",
  });
  await expect(invite).toBeVisible();
  await expect(invite.getByRole("button", { name: "Nghe lại lời mời" })).toBeVisible();
  await expect(invite).toContainText("Tiến độ HSK1 đã lưu tại câu 2");
  await invite.getByRole("link", { name: "Tiếp tục câu 2" }).click();
  await expect(page).toHaveURL(/\/assessment\/placement\/hsk1$/u);
  await expect(page.getByText("2/12", { exact: true })).toBeVisible();
});
