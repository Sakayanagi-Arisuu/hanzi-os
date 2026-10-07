import { expect, test } from "@playwright/test";

test("dark-only appearance survives device preferences, navigation and reload", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    // A retired appearance preference must never override the dark-only shell.
    localStorage.setItem("hanzi-os-color-theme-v1", "light");
  });
  await page.goto("/onboarding");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#030708");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ", exact: true }).click();
  await expect(page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ", exact: true })).toBeHidden();
  await page.goto("/lesson/boot-1");
  const reader = page.locator(".lesson-page-reader");
  await expect(reader.getByRole("combobox", { name: "Chọn trang học" })).toBeVisible({ timeout: 60_000 });
  const invitation = page.getByRole("button", { name: "Đóng lời mời Khảo Nghiệm Căn Cơ" });
  if (await invitation.isVisible()) await invitation.click();
  await expect(page.locator(".sys-atmosphere")).toHaveCount(0);
  await expect(page.locator(".app-frame")).toHaveCSS("background-image", "none");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveCSS("background-color", "rgb(3, 7, 8)");
    await expect.poll(() => reader.locator("footer").evaluate(el => {
      const box = el.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
    })).toBe(true);
  }
  await reader.getByRole("combobox", { name: "Chọn trang học" }).selectOption("boot-1:v2:recognize");
  await reader.getByRole("button", { name: "Thanh 4", exact: true }).click();
  await reader.getByRole("button", { name: "Kiểm tra câu trả lời", exact: true }).click();
  await expect(reader.getByRole("status")).toContainText("Đúng với đáp án");
  await page.reload();
  await expect(reader.getByRole("button", { name: "Thanh 4", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

