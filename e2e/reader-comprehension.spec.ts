import { expect, test } from "@playwright/test";

test("existing chapter exposes reading checks, keeps first attempt on reload and fits mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
  await expect(page).toHaveURL(/\/assessment$/u);
  await page.goto("/reader/series/jade-lantern-archive/chapter/jade-lantern-archive-c01");
  const cta = page.getByRole("button", { name: "Khảo Luyện 0/2" });
  await expect(cta).toBeVisible({ timeout: 60000 });
  const box = await cta.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(812);
  await cta.click();
  const quiz = page.getByRole("region", { name: "Kiểm tra điều vừa đọc" });
  await expect(quiz).toBeVisible();
  await quiz.getByRole("button", { name: "Trả lời ngay khi có người gọi tên", exact: true }).click();
  await expect(quiz.getByText("Chưa đúng, hãy đối chiếu lại đoạn đọc.")).toBeVisible();
  await quiz.getByRole("button", { name: "Dù nghe thấy gì cũng không trả lời", exact: true }).click();
  await expect(page.getByRole("button", { name: "Khảo Luyện 1/2" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Khảo Luyện 1/2" })).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Khảo Luyện 1/2" }).click();
  await quiz.getByRole("button", { name: "Tìm trang đầu tiên đã mất trước tiếng chuông thứ ba", exact: true }).click();
  await page.getByRole("button", { name: "Hoàn thành chương", exact: true }).click();
  await expect(page.getByRole("link", { name: "Mở chương tiếp", exact: true })).toBeVisible();
});
