import { expect, test, type Page } from "@playwright/test";
import { completeLessonTheory } from "./helpers/lessonTheory";

const finishOnboarding = async (page: Page) => {
  await page.goto("/onboarding");
  const wizard = page.getByTestId("onboarding-wizard");
  await wizard.waitFor({ timeout: 20_000 }).catch(() => undefined);
  if (!await wizard.isVisible().catch(() => false)) return;
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
};

test("light lesson briefing stays readable and keeps one mobile scroll region", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await finishOnboarding(page);
  await page.goto("/lesson/boot-1");

  const closeInvite = page.getByRole("button", {
    name: "Đóng lời mời Khảo Nghiệm Căn Cơ",
  });
  if (await closeInvite.isVisible().catch(() => false)) await closeInvite.click();

  await expect(page.getByRole("heading", { name: "Bốn thanh điệu" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".system-voice-beacon")).toHaveCount(0);

  const initialGeometry = await page.evaluate(() => {
    const theoryStage = document.querySelector(".lesson-theory-stage")!;
    const footer = document.querySelector(".briefing-actions")!.getBoundingClientRect();
    const guideCards = [...document.querySelectorAll<HTMLElement>(
      ".lesson-theory-panel .guide-examples button",
    )];
    const parseRgb = (value: string) => value.match(/\d+/gu)?.slice(0, 3)
      .map(Number) ?? [0, 0, 0];
    return {
      horizontalOverflow: document.documentElement.scrollWidth
        - document.documentElement.clientWidth,
      nestedTheoryScroll: theoryStage.scrollHeight > theoryStage.clientHeight + 2,
      footerInsideViewport: footer.top >= 0 && footer.bottom <= innerHeight,
      guideBrightness: guideCards.map((card) => parseRgb(
        getComputedStyle(card).backgroundColor,
      ).reduce((sum, channel) => sum + channel, 0)),
      smallestControl: Math.min(...[...document.querySelectorAll<HTMLElement>(
        ".lesson-theory-panel button",
      )].filter((control) => control.offsetParent !== null)
        .map((control) => control.getBoundingClientRect().height)),
    };
  });

  expect(initialGeometry).toMatchObject({
    horizontalOverflow: 0,
    nestedTheoryScroll: false,
    footerInsideViewport: true,
  });
  expect(initialGeometry.guideBrightness.every((brightness) => brightness > 360)).toBe(true);
  expect(initialGeometry.smallestControl).toBeGreaterThanOrEqual(44);

  await completeLessonTheory(page);
  await expect(page.getByRole("button", { name: /Bước vào Thử Luyện/iu })).toBeEnabled();
  await expect(page.locator(".system-voice-beacon")).toHaveCount(0);
});
