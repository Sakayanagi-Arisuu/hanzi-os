import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const CONTENT_VERSION = "foundation-2026.08.5";
const bridgeEvidence = JSON.parse(readFileSync(
  new URL("./fixtures/hsk2-bridge-evidence.json", import.meta.url),
  "utf8",
)) as unknown[];

const localHsk2State = {
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "HSK2 LOCAL LEARNER",
    goal: "hsk",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "hsk2",
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
};

const installLocalHsk2Profile = async (
  page: Page,
  bridgeComplete = false,
) => {
  const state = structuredClone(localHsk2State) as Omit<
    typeof localHsk2State,
    "completedLessons" | "evidence"
  > & {
    completedLessons: Record<string, {
      score: number;
      bestScore: number;
      attempts: number;
      completedAt: string;
    }>;
    evidence: unknown[];
  };
  if (bridgeComplete) {
    state.completedLessons["characters-15"] = {
      score: 100,
      bestScore: 100,
      attempts: 1,
      completedAt: "2026-08-01T00:00:00.000Z",
    };
    state.evidence = structuredClone(bridgeEvidence);
  }
  await page.addInitScript(({ state, contentVersion }) => {
    const installationId = "hsk2-level-check-browser";
    if (!localStorage.getItem("hanzi-os-learning-state-v1")) {
      localStorage.setItem("hanzi-os-learning-state-v1", JSON.stringify(state));
      localStorage.setItem("hanzi-os-sync-installation-v1", installationId);
      localStorage.setItem(
        "hanzi-os-learning-owner-v1",
        `anonymous:${installationId}`,
      );
    }
    localStorage.setItem("hsk2-level-check-content-version", contentVersion);
  }, { state, contentVersion: CONTENT_VERSION });
};

test("opens the first HSK2 lesson with the shared rich Lesson UI", async ({
  page,
}) => {
  await installLocalHsk2Profile(page, true);
  await page.goto("/lesson/hsk2-person-events-environment-lesson-01");
  await expect(page.getByText("03 · ỨNG DỤNG CHUYÊN SÂU", { exact: true }))
    .toBeVisible();
  await expect(page.getByText("你个子很高，你小时候也这么高吗？", {
    exact: true,
  }).first()).toBeVisible();
  await expect(page.getByText("外貌、穿着、生日等", { exact: true }))
    .toBeVisible();
  await expect(page.getByText(/humanReviewed=false/u)).toBeVisible();
});

test("opens, resumes and completes the 60-item HSK2 local level check without mastery", async ({
  page,
}) => {
  test.setTimeout(75_000);
  await installLocalHsk2Profile(page);
  await page.goto("/path");
  const card = page.getByTestId("hsk2-level-check-card");
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: /Bước vào Đại Khảo/u }).click();

  await expect(page.getByTestId("hsk2-level-check-intro")).toBeVisible();
  await page.getByRole("button", { name: /Bắt đầu tự kiểm tra/u }).click();
  await expect(page.getByText("1/60", { exact: true })).toBeVisible();

  await page.getByRole("radiogroup", {
    name: "Các lựa chọn cho câu 1",
  }).getByRole("radio").first().click();
  await page.getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("button", { name: "Câu tiếp theo" }))
    .toBeVisible();

  await page.reload();
  await expect(page.getByText("1/60", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Câu tiếp theo" }))
    .toBeVisible();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();

  for (let question = 2; question <= 60; question += 1) {
    await page.getByRole("radiogroup", {
      name: `Các lựa chọn cho câu ${question}`,
    }).getByRole("radio").first().click();
    await page.getByRole("button", { name: "Xác nhận" }).click();
    const continuation = question === 60
      ? "Xem kết quả"
      : "Câu tiếp theo";
    await page.getByRole("button", { name: continuation }).click();
  }

  await expect(page.getByTestId("hsk2-level-check-result")).toBeVisible();
  await expect(page.getByText(/\/60 câu đúng quan sát/u)).toBeVisible();
  await expect(page.getByText(/không cấp mastery/u)).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
    );
    const evidence = (state.evidence ?? []).filter(
      (item: { activityId?: string }) =>
        item.activityId?.startsWith("hsk2-level-check:"),
    );
    const resume = JSON.parse(
      localStorage.getItem("hanzi-os-hsk2-level-check-session-v1") ?? "null",
    );
    return {
      completedLessons: state.completedLessons,
      diagnosticCompleted: state.diagnostic?.completed,
      evidenceCount: evidence.length,
      allContentVersioned: evidence.every(
        (item: { contentVersion?: string; activityVersion?: string }) =>
          item.contentVersion === "foundation-2026.08.5"
          && item.activityVersion?.startsWith("foundation-2026.08.5:"),
      ),
      allDescriptive: evidence.every(
        (item: {
          masteryEligible?: boolean;
          metadata?: { measurementEligible?: boolean };
        }) => item.masteryEligible === false
          && item.metadata?.measurementEligible === false,
      ),
      resumePhase: resume?.phase,
      savedAnswers: Object.keys(resume?.answers ?? {}).length,
    };
  })).toEqual({
    completedLessons: {},
    diagnosticCompleted: false,
    evidenceCount: 60,
    allContentVersioned: true,
    allDescriptive: true,
    resumePhase: "result",
    savedAnswers: 60,
  });
});
