import { expect, test, type Page } from "@playwright/test";
import { completeLessonTheory } from "./helpers/lessonTheory";
import {
  readIndexedDbStore,
  type OwnerScopedCacheRecord,
} from "./indexedDb";

type LessonExercise = {
  kind: string;
  correct: string;
  options: string[];
};

type LessonResume = {
  lessonId: string;
  index: number;
  checked: boolean;
  exercises: LessonExercise[];
};

const finishOnboarding = async (page: Page) => {
  await page.goto("/onboarding");
  const wizard = page.getByTestId("onboarding-wizard");
  await wizard.waitFor({ timeout: 20_000 }).catch(() => undefined);
  if (!await wizard.isVisible().catch(() => false)) return;
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu Khảo Nghiệm Căn Cơ" }).click();
};

const readResume = async (page: Page) => {
  const records = await readIndexedDbStore<OwnerScopedCacheRecord<LessonResume>>(
    page,
    "lesson-resumes",
  );
  return records.find((record) => record.value?.lessonId === "boot-1")?.value ?? null;
};

const chooseCorrectAnswer = async (page: Page, exercise: LessonExercise) => {
  if (exercise.kind === "recall") {
    await page.getByLabel("Hán tự bạn tự gọi lại").fill(exercise.correct);
    return;
  }
  const options = page.locator(".answer-grid button");
  for (let index = 0; index < await options.count(); index += 1) {
    const option = options.nth(index);
    if ((await option.locator("strong").textContent())?.trim() === exercise.correct) {
      await option.click();
      return;
    }
  }
  throw new Error(`Không tìm thấy đáp án đúng trong UI: ${exercise.correct}`);
};

const clearFirstLesson = async (page: Page) => {
  await page.goto("/lesson/boot-1");
  const closeInvite = page.getByRole("button", {
    name: "Đóng lời mời Khảo Nghiệm Căn Cơ",
  });
  if (await closeInvite.isVisible().catch(() => false)) await closeInvite.click();
  await completeLessonTheory(page);
  await page.getByRole("button", { name: /Bước vào Thử Luyện/iu }).click();

  for (let transition = 0; transition < 30; transition += 1) {
    const resume = await readResume(page);
    if (!resume) throw new Error("Phiên boot-1 không tồn tại trong IndexedDB");
    if (resume.checked) {
      const last = resume.index === resume.exercises.length - 1;
      await page.getByRole("button", {
        name: last ? "Hoàn tất thử luyện" : "Câu tiếp theo",
      }).click({ force: true });
      if (last) return;
      await expect.poll(async () => {
        const next = await readResume(page);
        return next ? { index: next.index, checked: next.checked } : null;
      }).toEqual({ index: resume.index + 1, checked: false });
      continue;
    }
    const exercise = resume.exercises[resume.index];
    if (!exercise) throw new Error("Phiên boot-1 thiếu hoạt động");
    await chooseCorrectAnswer(page, exercise);
    await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect.poll(async () => {
      const checked = await readResume(page);
      return checked ? { index: checked.index, checked: checked.checked } : null;
    }).toEqual({ index: resume.index, checked: true });
  }
  throw new Error("boot-1 không đi tới màn hoàn thành");
};

test("Thiên Lộ clear claims its chest once and stays inside the viewport", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1365, height: 640 });
  await finishOnboarding(page);
  await clearFirstLesson(page);

  const clear = page.getByTestId("lesson-quest-result");
  await expect(clear).toBeVisible();
  await expect(clear).toContainText("RƯƠNG CỬA ẢI");
  await expect(clear).toContainText("+40 EXP");
  const chest = clear.getByRole("button", { name: "Mở rương nhận 40 EXP" });
  await expect(chest).toBeVisible();
  await chest.click();
  await expect(clear).toContainText("ĐÃ NHẬN");
  await expect(chest).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("hanzi-os-learning-state-v1");
    return raw ? (JSON.parse(raw) as { xp?: number }).xp : null;
  })).toBe(40);
  await expect(clear.getByRole("button", { name: "Làm lại bài này" })).toBeVisible();
  await expect(page.locator(".path-clear-node")).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const screen = document.querySelector(".path-clear-screen")?.getBoundingClientRect();
    const actions = document.querySelector(".path-clear-actions")?.getBoundingClientRect();
    const portal = document.querySelector(".path-clear-portal");
    const portalRect = portal?.getBoundingClientRect();
    return {
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
      screen: screen ? { top: screen.top, bottom: screen.bottom } : null,
      actions: actions ? { top: actions.top, bottom: actions.bottom } : null,
      portal: portalRect ? {
        width: portalRect.width,
        height: portalRect.height,
        transform: getComputedStyle(portal!).transform,
      } : null,
    };
  });

  await testInfo.attach("geometry", {
    body: Buffer.from(JSON.stringify(geometry, null, 2)),
    contentType: "application/json",
  });

  expect(geometry.screen?.top).toBeGreaterThanOrEqual(0);
  expect(geometry.screen?.bottom).toBeLessThanOrEqual(geometry.clientHeight);
  expect(geometry.actions?.bottom).toBeLessThanOrEqual(geometry.clientHeight);
  expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1);
  expect(geometry.portal).toMatchObject({ transform: "none" });
  expect(geometry.portal!.width).toBeLessThan(150);
  expect(geometry.portal!.height).toBeLessThan(100);

  await testInfo.attach("thien-lo-clear", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});
