import { devices, expect, test } from "@playwright/test";

const finishOnboarding = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    name: /Đánh thức một ngôn ngữ mới/i,
  })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Kích hoạt HANZI.OS" }).click();
  await expect(page.getByRole("heading", {
    name: /Đánh thức tiếng Trung trong bạn/i,
  })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xác nhận trạng thái" })).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận trạng thái" }).click();
};

test.use({ ...devices["Pixel 7"] });

test("keeps the mobile command sheet keyboard-safe and routes without overflow", async ({
  page,
}) => {
  await finishOnboarding(page);

  const mobileNavigation = page.getByRole("navigation", {
    name: "Điều hướng di động",
  });
  const moreButton = mobileNavigation.getByRole("button", { name: "Khác" });
  await expect(mobileNavigation).toBeVisible();
  await moreButton.click();

  const menu = page.getByRole("dialog", { name: "Mở rộng điều hướng" });
  const closeButton = menu.getByRole("button", {
    name: "Đóng bảng chức năng",
  });
  const profileLink = menu.getByRole("link", { name: "Bảng Thuộc Tính" });
  await expect(menu).toBeVisible();
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(profileLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(moreButton).toBeFocused();

  await moreButton.click();
  await page.getByRole("dialog", {
    name: "Mở rộng điều hướng",
  }).getByRole("link", { name: "Vạn Quyển Các" }).click();
  await expect(page).toHaveURL(/\/reader$/u);
  await expect(page.getByRole("heading", {
    name: "Vạn Quyển Các",
  })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();

  const routes = [
    {
      path: "/path",
      ready: () => page.getByRole("heading", { name: /Thiên Lộ/u }),
    },
    {
      path: "/lesson/boot-1",
      ready: () => page.getByRole("button", { name: /Bước vào Thử Luyện/i }),
    },
    {
      path: "/reader",
      ready: () => page.getByRole("heading", { name: "Vạn Quyển Các" }),
    },
    {
      path: "/profile",
      ready: () => page.getByRole("heading", { name: /Bảng Thuộc Tính/i }),
    },
  ];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(route.ready()).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `${route.path} overflows horizontally`).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
  }
});

test("exposes single-select state and supports arrow navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    name: /Đánh thức một ngôn ngữ mới/i,
  })).toBeVisible();

  const goalGroup = page.getByRole("radiogroup", {
    name: "Thiên Mệnh, mục tiêu học",
  });
  const conversation = goalGroup.getByRole("radio", { name: /^Giao tiếp/u });
  const hsk = goalGroup.getByRole("radio", { name: /^Hướng tới HSK/u });
  await expect(conversation).toHaveAttribute("aria-checked", "true");
  await conversation.focus();
  await page.keyboard.press("ArrowRight");
  await expect(hsk).toBeFocused();
  await expect(hsk).toHaveAttribute("aria-checked", "true");
  await expect(conversation).toHaveAttribute("aria-checked", "false");

  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  const startingGroup = page.getByRole("radiogroup", {
    name: /Căn Cơ Tự Khai · điểm xuất phát/u,
  });
  const zero = startingGroup.getByRole("radio", { name: /^HSK0/u });
  const hsk1 = startingGroup.getByRole("radio", { name: /^HSK1/u });
  await zero.focus();
  await page.keyboard.press("ArrowDown");
  await expect(hsk1).toBeFocused();
  await expect(hsk1).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Kích hoạt HANZI.OS" }).click();
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
  await page.getByRole("button", { name: /Bắt đầu khảo nghiệm/u }).click();
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
  const readerGroup = page.locator(".reader-check").getByRole("radiogroup");
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
    }).getByRole("button", { name: "Khác" });
    await moreButton.click();

    const menu = page.getByRole("dialog", { name: "Mở rộng điều hướng" });
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
