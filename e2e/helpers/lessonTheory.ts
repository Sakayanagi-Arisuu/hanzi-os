import type { Page } from "@playwright/test";

/** Completes the required learn-before-practice briefing for a fresh lesson. */
export const completeLessonTheory = async (page: Page) => {
  await page.getByRole("button", {
    name: "Tiếp: học từ trọng tâm",
    exact: true,
  }).click();
  const contextBridge = page.getByRole("button", {
    name: "Tiếp: gặp trong ngữ cảnh",
    exact: true,
  });
  if (await contextBridge.isVisible().catch(() => false)) {
    await contextBridge.click();
  }
  await page.getByRole("button", {
    name: "Tiếp: xem cách làm",
    exact: true,
  }).click();
  await page.getByRole("button", {
    name: "Đã hiểu · sẵn sàng thử",
    exact: true,
  }).click();
};
