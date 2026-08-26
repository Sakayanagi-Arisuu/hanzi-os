import { expect, test, type Page } from "@playwright/test";

const CONTENT_VERSION = "foundation-2026.08.5";

const localHsk1State = {
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "HSK1 LOCAL LEARNER",
    goal: "hsk",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "hsk1",
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

const installLocalHsk1Profile = async (page: Page) => {
  await page.addInitScript(({ state, contentVersion }) => {
    const installationId = "hsk1-level-check-browser";
    if (!localStorage.getItem("hanzi-os-learning-state-v1")) {
      localStorage.setItem("hanzi-os-learning-state-v1", JSON.stringify(state));
      localStorage.setItem("hanzi-os-sync-installation-v1", installationId);
      localStorage.setItem(
        "hanzi-os-learning-owner-v1",
        `anonymous:${installationId}`,
      );
    }
    localStorage.setItem("hsk1-level-check-content-version", contentVersion);
  }, { state: localHsk1State, contentVersion: CONTENT_VERSION });
};

test("opens, resumes and completes the 50-item HSK1 local level check without mastery", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await installLocalHsk1Profile(page);
  await page.goto("/path");
  const card = page.getByTestId("hsk1-level-check-card");
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: /Bước vào Đại Khảo/u }).click();

  await expect(page.getByTestId("hsk1-level-check-intro")).toBeVisible();
  await page.getByRole("button", { name: /Bắt đầu Khảo Nghiệm/u }).click();
  await expect(page.getByText("1/50", { exact: true })).toBeVisible();

  await page.getByRole("radiogroup", {
    name: "Các lựa chọn cho câu 1",
  }).getByRole("radio").first().click();
  await expect(page.getByText("2/50", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("2/50", { exact: true })).toBeVisible();

  for (let question = 2; question <= 50; question += 1) {
    await page.getByRole("radiogroup", {
      name: `Các lựa chọn cho câu ${question}`,
    }).getByRole("radio").first().click();
  }

  await expect(page.getByTestId("hsk1-level-check-result")).toBeVisible();
  await expect(page.getByText(/\/50 câu đúng quan sát/u)).toBeVisible();
  await expect(page.getByText(/không phải điểm thi hay chứng chỉ HSK/u)).toBeVisible();
  await expect(page.locator("body")).not.toContainText("mastery");

  await expect.poll(() => page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
    );
    const evidence = (state.evidence ?? []).filter(
      (item: { activityId?: string }) =>
        item.activityId?.startsWith("hsk1-level-check:"),
    );
    const resume = JSON.parse(
      localStorage.getItem("hanzi-os-hsk1-level-check-session-v1") ?? "null",
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
    evidenceCount: 50,
    allContentVersioned: true,
    allDescriptive: true,
    resumePhase: "result",
    savedAnswers: 50,
  });
});
