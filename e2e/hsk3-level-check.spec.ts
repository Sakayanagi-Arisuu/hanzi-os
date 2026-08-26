import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const CONTENT_VERSION = "foundation-2026.08.5";
const bridgeEvidence = JSON.parse(readFileSync(
  new URL("./fixtures/hsk3-bridge-evidence.json", import.meta.url),
  "utf8",
)) as unknown[];
const localHsk3State = {
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "HSK3 LOCAL LEARNER",
    goal: "hsk",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "hsk3",
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

const installLocalHsk3Profile = async (
  page: Page,
  bridgeComplete = false,
) => {
  const state = structuredClone(localHsk3State) as Omit<
    typeof localHsk3State,
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
    state.completedLessons["hsk2-picture-description-lesson-02"] = {
      score: 100,
      bestScore: 100,
      attempts: 1,
      completedAt: "2026-08-01T00:00:00.000Z",
    };
    state.evidence = structuredClone(bridgeEvidence);
  }
  await page.addInitScript(({ state, contentVersion }) => {
    const installationId = "hsk3-level-check-browser";
    if (!localStorage.getItem("hanzi-os-learning-state-v1")) {
      localStorage.setItem("hanzi-os-learning-state-v1", JSON.stringify(state));
      localStorage.setItem("hanzi-os-sync-installation-v1", installationId);
      localStorage.setItem(
        "hanzi-os-learning-owner-v1",
        `anonymous:${installationId}`,
      );
    }
    localStorage.setItem("hsk3-level-check-content-version", contentVersion);
  }, { state, contentVersion: CONTENT_VERSION });
};

test("opens the first HSK3 lesson with the shared rich Lesson UI", async ({
  page,
}) => {
  await installLocalHsk3Profile(page, true);
  await page.goto("/lesson/hsk3-personal-life-narratives-identity-transactions");
  await expect(page.getByText("03 · ỨNG DỤNG CHUYÊN SÂU", { exact: true }))
    .toBeVisible();
  await expect(page.getByText("小林在一家公司办公室工作，最近他决定参加一个周末汉语活动。", {
    exact: true,
  }).first()).toBeVisible();
  await expect(page.getByText("个人信息", { exact: true }))
    .toBeVisible();
  await expect(page.locator("body")).not.toContainText("humanReviewed=false");
});

test("opens, resumes and completes the 54-item HSK3 local level check without mastery", async ({
  page,
}) => {
  test.setTimeout(75_000);
  await installLocalHsk3Profile(page);
  await page.goto("/path");
  const card = page.getByTestId("hsk3-level-check-card");
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: /Bước vào Đại Khảo/u }).click();

  await expect(page.getByTestId("hsk3-level-check-intro")).toBeVisible();
  await page.getByRole("button", { name: /Bắt đầu Khảo Nghiệm/u }).click();
  await expect(page.getByText("1/54", { exact: true })).toBeVisible();

  await page.getByRole("radiogroup", {
    name: "Các lựa chọn cho câu 1",
  }).getByRole("radio").first().click();
  await expect(page.getByText("2/54", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("2/54", { exact: true })).toBeVisible();

  for (let question = 2; question <= 54; question += 1) {
    await page.getByRole("radiogroup", {
      name: `Các lựa chọn cho câu ${question}`,
    }).getByRole("radio").first().click();
  }

  await expect(page.getByTestId("hsk3-level-check-result")).toBeVisible();
  await expect(page.getByText(/\/54 câu đúng quan sát/u)).toBeVisible();
  await expect(page.getByText(/không phải điểm thi hay chứng chỉ HSK/u)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("mastery");

  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
    );
    const evidence = (state.evidence ?? []).filter(
      (item: { activityId?: string }) =>
        item.activityId?.startsWith("hsk3-level-check:"),
    );
    const resume = JSON.parse(
      localStorage.getItem("hanzi-os-hsk3-level-check-session-v1") ?? "null",
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
    evidenceCount: 54,
    allContentVersioned: true,
    allDescriptive: true,
    resumePhase: "result",
    savedAnswers: 54,
  });
});
