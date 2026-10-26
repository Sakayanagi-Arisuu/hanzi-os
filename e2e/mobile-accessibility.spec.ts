import { devices, expect, test } from "@playwright/test";

const finishOnboarding = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await expect(page.getByTestId("product-overview")).toBeVisible();
  await page.locator("#landing-main").getByRole("button", {
    name: "Bắt đầu hành trình",
  }).click();
  await expect(page.getByTestId("onboarding-wizard")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
  await expect(page).toHaveURL(/\/assessment$/u);
  await expect(page.getByRole("heading", {
    name: "Tìm điểm khởi hành",
  })).toBeVisible();
  await page.goto("/");
};

test.use({ ...devices["Pixel 7"] });

test("keeps the mobile command sheet keyboard-safe and routes without overflow", async ({
  page,
}) => {
  await finishOnboarding(page);

  const mobileNavigation = page.getByRole("navigation", {
    name: "Điều hướng di động",
  });
  const moreButton = mobileNavigation.getByRole("button", { name: "Luyện · chọn công cụ" });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.locator(':scope > a, :scope > button')).toHaveText(['Học', 'Ôn', 'Nói', 'Luyện', 'Hồ sơ']);
  await moreButton.click();

  const menu = page.getByRole("dialog", { name: "Công cụ học và luyện tập" });
  const closeButton = menu.getByRole("button", {
    name: "Đóng công cụ học",
  });
  await expect(menu).toBeVisible();
  await expect(closeButton).toBeFocused();
  await expect(page.getByRole('status', { name: 'Lời mời Khảo Nghiệm Căn Cơ' })).toHaveCount(0);
  await page.keyboard.press('Alt+s');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(moreButton).toBeFocused();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("opens the selected mobile tool and focuses its content without overflow", async ({ page }) => {
  await finishOnboarding(page);
  const moreButton = page.getByRole("navigation", { name: "Điều hướng di động" })
    .getByRole("button", { name: "Luyện · chọn công cụ" });
  await moreButton.click();
  const menu = page.getByRole("dialog", { name: "Công cụ học và luyện tập" });
  const closeButton = menu.getByRole("button", { name: "Đóng công cụ học" });
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(menu.getByRole("link", { name: "Bảng Thuộc Tính" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.getByRole("dialog", {
    name: "Công cụ học và luyện tập",
  }).getByRole("link", { name: "Vạn Quyển Các" }).click();
  await expect(page).toHaveURL(/\/reader$/u);
  await expect(page.getByRole("heading", {
    name: "Chọn một thế giới để khai quyển",
  })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
  const readerWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(readerWidth.scrollWidth, "Reader selected from menu overflows horizontally").toBeLessThanOrEqual(readerWidth.clientWidth);
});

const mobileRoutes = [
    {
      path: "/path",
      role: "heading", name: /Thiên Lộ/u,
    },
    {
      path: "/lesson/boot-1",
      role: "navigation", name: "3 chặng học trước khi làm bài",
    },
    {
      path: "/reader",
      role: "heading", name: "Chọn một thế giới để khai quyển",
    },
    {
      path: "/profile",
      role: "heading", name: "Cấu hình hệ thống",
    },
  ] as const;

for (const route of mobileRoutes) {
  test(`keeps mobile route ${route.path} within the viewport`, async ({ page }) => {
    await finishOnboarding(page);
    await page.goto(route.path);
    await expect(page.getByRole(route.role, { name: route.name, exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `${route.path} overflows horizontally`).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
  });
}

test("summons a keyboard-safe status hologram backed by live learning signals", async ({
  page,
}) => {
  await finishOnboarding(page);

  const summon = page.getByRole("button", {
    name: /(TRIỆU HỒI|Triệu hồi Bảng Hệ Thống)/iu,
  });
  await summon.click();

  const status = page.getByRole("dialog", { name: "Hành giả vô danh" });
  const close = status.getByRole("button", { name: "Thu hồi Bảng Hệ Thống" });
  await expect(status).toBeVisible();
  await expect(close).toBeFocused();
  await expect(status.getByRole("heading", { name: "Nhiệm vụ hiện tại" })).toBeVisible();
  await expect(status.getByRole("heading", { name: "Ma trận thuộc tính" })).toBeVisible();
  await expect(status.getByText("0/4")).toBeVisible();

  const bounds = await page.locator(".sys-holo-console").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: window.innerWidth };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);

  await page.keyboard.press("Escape");
  await expect(status).toHaveCount(0);
  await expect(summon).toBeFocused();

  await page.keyboard.press("Alt+s");
  await expect(page.getByRole("dialog", { name: "Hành giả vô danh" })).toBeVisible();
});

test("plays every built-in system voice without a device voice", async ({ page }) => {
  await finishOnboarding(page);
  await page.goto("/profile");
  const persona = page.getByRole("combobox", { name: "Nhân cách xướng lệnh" });
  await expect(persona).toHaveValue("mechanical");
  await expect(persona.locator("option")).toHaveCount(4);

  await page.getByRole("button", { name: /Giọng hệ thống · Đang ngủ/u }).click();
  for (const profile of [
    { id: "mechanical", directory: "mechanical-core-v1", label: "Cơ Linh · Mechanical Core" },
    { id: "oracle", directory: "oracle-v2", label: "Thiên cơ · trầm tĩnh" },
    { id: "executor", directory: "executor-v2", label: "Chấp hành · uy nghiêm" },
    { id: "guide", directory: "guide-v2", label: "Dẫn lộ · sáng rõ" },
  ]) {
    await persona.selectOption(profile.id);
    await expect(page.locator(".sys-voice-identity strong")).toHaveText(profile.label);
    const voiceResponse = page.waitForResponse((response) =>
      response.url().endsWith(`/assets/system-voice/${profile.directory}/profile-preview.mp3`)
    );
    await page.getByRole("button", { name: "Nghe thử giọng đang chọn" }).click();
    const response = await voiceResponse;
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("audio/mpeg");
    await expect(page.locator('.voice-reactor[data-phase="playing"]').first()).toBeVisible();
  }
});

test("exposes single-select state and supports arrow navigation", async ({ page }) => {
  await page.goto("/");
  await page.locator("#landing-main").getByRole("button", {
    name: "Kích hoạt HANZI.OS",
  }).click();
  await expect(page.getByTestId("onboarding-wizard")).toBeVisible();

  const goalGroup = page.getByRole("radiogroup", {
    name: "Mục tiêu học",
  });
  const conversation = goalGroup.getByRole("radio", { name: /^Giao tiếp hằng ngày/u });
  const hsk = goalGroup.getByRole("radio", { name: /^Học theo lộ trình HSK/u });
  await expect(conversation).toHaveAttribute("aria-checked", "true");
  await conversation.focus();
  await page.keyboard.press("ArrowRight");
  await expect(hsk).toBeFocused();
  await expect(hsk).toHaveAttribute("aria-checked", "true");
  await expect(conversation).toHaveAttribute("aria-checked", "false");

  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  const startingGroup = page.getByRole("radiogroup", {
    name: "Trình độ hiện tại",
  });
  const zero = startingGroup.getByRole("radio", { name: /^Mới bắt đầu/u });
  const hsk1 = startingGroup.getByRole("radio", { name: /^Đã học khoảng HSK1/u });
  await zero.focus();
  await page.keyboard.press("ArrowDown");
  await expect(hsk1).toBeFocused();
  await expect(hsk1).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
  await page.goto("/profile");

  const profileGoalGroup = page.getByRole("radiogroup", {
    name: /Thiên Mệnh · mục tiêu chính/u,
  });
  const profileHsk = profileGoalGroup.getByRole("radio", {
    name: /^Hướng tới HSK/u,
  });
  const career = profileGoalGroup.getByRole("radio", { name: /^Công việc/u });
  await expect(profileHsk).toHaveAttribute("aria-checked", "true");
  await profileHsk.focus();
  await page.keyboard.press("ArrowRight");
  await expect(career).toBeFocused();
  await expect(career).toHaveAttribute("aria-checked", "true");

  await page.goto("/assessment");
  await page.getByRole("button", { name: "Chọn tầng Khảo Nghiệm" }).click();
  await page.getByRole("link", { name: "Mở Khảo Nghiệm HSK1" }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm" }).click();
  const assessmentGroup = page.getByRole("radiogroup", {
    name: "Các lựa chọn cho câu 1",
  });
  const assessmentOptions = assessmentGroup.getByRole("radio");
  const firstAssessmentOption = assessmentOptions.nth(0);
  const secondAssessmentOption = assessmentOptions.nth(1);
  await expect(firstAssessmentOption).toHaveAttribute("tabindex", "0");
  await firstAssessmentOption.focus();
  await page.keyboard.press("ArrowRight");
  await expect(secondAssessmentOption).toBeFocused();
  await expect(secondAssessmentOption).toHaveAttribute("aria-checked", "true");

  await page.goto("/reader");
  await page.getByRole("button", { name: /Mở quyển Ngày đầu ở lớp tiếng Trung/u }).click();
  await page.getByRole("button", { name: "Bước vào trang sách" }).click();
  await page.getByRole("button", { name: "Đã đọc xong" }).click();
  const readerGroup = page.getByRole("radiogroup", {
    name: "Các lựa chọn đọc hiểu",
  });
  const readerOptions = readerGroup.getByRole("radio");
  const firstReaderOption = readerOptions.nth(0);
  const secondReaderOption = readerOptions.nth(1);
  await firstReaderOption.focus();
  await page.keyboard.press("ArrowDown");
  await expect(secondReaderOption).toBeFocused();
  await expect(secondReaderOption).toHaveAttribute("aria-checked", "true");
});

test.describe("reduced motion", () => {
  test("short-circuits decorative motion without blocking interaction", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await finishOnboarding(page);
    const moreButton = page.getByRole("navigation", {
      name: "Điều hướng di động",
    }).getByRole("button", { name: "Luyện · chọn công cụ" });
    await moreButton.click();

    const menu = page.getByRole("dialog", { name: "Công cụ học và luyện tập" });
    await expect(menu).toBeVisible();
    const motion = await menu.evaluate((element) => {
      const style = getComputedStyle(element);
      const toMilliseconds = (duration: string) => duration.endsWith("ms")
        ? Number.parseFloat(duration)
        : Number.parseFloat(duration) * 1000;
      return {
        durationMs: Math.max(
          ...style.animationDuration.split(",").map((duration) =>
            toMilliseconds(duration.trim())
          ),
        ),
        iterations: style.animationIterationCount,
      };
    });
    expect(motion.durationMs).toBeLessThanOrEqual(0.02);
    expect(motion.iterations).toBe("1");

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(moreButton).toBeFocused();
  });
});
