import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const CONTENT_VERSION = "foundation-2026.08.5";
const bridgeEvidence = JSON.parse(readFileSync(
  new URL("./fixtures/hsk4-bridge-evidence.json", import.meta.url),
  "utf8",
)) as unknown[];
const localHsk4State = {
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "HSK4 LOCAL LEARNER",
    goal: "hsk",
    dailyMinutes: 30,
    script: "simplified",
    startingLevel: "hsk4",
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

const installLocalHsk4Profile = async (
  page: Page,
  bridgeComplete = false,
) => {
  const state = structuredClone(localHsk4State) as Omit<
    typeof localHsk4State,
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
    state.completedLessons["hsk3-structured-explanation-lesson-03"] = {
      score: 100,
      bestScore: 100,
      attempts: 1,
      completedAt: "2026-08-01T00:00:00.000Z",
    };
    state.evidence = structuredClone(bridgeEvidence);
  }
  await page.addInitScript(({ state }) => {
    const installationId = "hsk4-level-check-browser";
    if (!localStorage.getItem("hanzi-os-learning-state-v1")) {
      localStorage.setItem("hanzi-os-learning-state-v1", JSON.stringify(state));
      localStorage.setItem("hanzi-os-sync-installation-v1", installationId);
      localStorage.setItem(
        "hanzi-os-learning-owner-v1",
        `anonymous:${installationId}`,
      );
    }
  }, { state });
};

test("opens the first HSK4 lesson with the shared rich Lesson UI", async ({
  page,
}) => {
  await installLocalHsk4Profile(page, true);
  await page.goto("/lesson/hsk4-personal-community-analysis-concept-actor-map");
  await expect(page.getByText("03 · ỨNG DỤNG CHUYÊN SÂU", { exact: true }))
    .toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(
    "新居民搬进明河社区后，常常不知道该去哪里办事。社区中心把医疗、修理、交通咨询和老人照顾等服务列成一张表，并在每项服务后写明负责人的姓名和联系方式。居民可以先查找需要的项目，再决定在线留言还是到服务台说明情况。",
    { exact: true },
  ).first()).toBeVisible();
  await expect(page.getByText("个人信息", { exact: true })).toBeVisible();
  await expect(page.getByText(/humanReviewed=false/u)).toBeVisible();
});

test("shows the complete HSK4 path and completes its 72-item local level check without mastery", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await installLocalHsk4Profile(page);
  await page.goto("/path");

  await expect(page.getByText(
    "Đời sống cá nhân và cộng đồng: Khái niệm, nhân vật và vai trò",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByText(
    "Luyện nói–viết tích hợp",
    { exact: true },
  )).toBeVisible();
  const card = page.getByTestId("hsk4-level-check-card");
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: /Bước vào Đại Khảo/u }).click();

  await expect(page.getByTestId("hsk4-level-check-intro")).toBeVisible();
  await page.getByRole("button", { name: /Bắt đầu tự kiểm tra/u }).click();
  await expect(page.getByText("1/72", { exact: true })).toBeVisible();

  await page.getByRole("radiogroup", {
    name: "Các lựa chọn cho câu 1",
  }).getByRole("radio").first().click();
  await page.getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByRole("button", { name: "Câu tiếp theo" }))
    .toBeVisible();

  await page.reload();
  await expect(page.getByText("1/72", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();

  for (let question = 2; question <= 72; question += 1) {
    await page.getByRole("radiogroup", {
      name: `Các lựa chọn cho câu ${question}`,
    }).getByRole("radio").first().click();
    await page.getByRole("button", { name: "Xác nhận" }).click();
    await page.getByRole("button", {
      name: question === 72 ? "Xem kết quả" : "Câu tiếp theo",
    }).click();
  }

  await expect(page.getByTestId("hsk4-level-check-result")).toBeVisible();
  await expect(page.getByText(/\/72 câu đúng quan sát/u)).toBeVisible();
  await expect(page.getByText(/không cấp mastery/u)).toBeVisible();

  await expect.poll(() => page.evaluate((contentVersion) => {
    const state = JSON.parse(
      localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
    );
    const evidence = (state.evidence ?? []).filter(
      (item: { activityId?: string }) =>
        item.activityId?.startsWith("hsk4-level-check:"),
    );
    const resume = JSON.parse(
      localStorage.getItem("hanzi-os-hsk4-level-check-session-v1") ?? "null",
    );
    return {
      completedLessons: state.completedLessons,
      evidenceCount: evidence.length,
      allContentVersioned: evidence.every(
        (item: { contentVersion?: string; activityVersion?: string }) =>
          item.contentVersion === contentVersion
          && item.activityVersion?.startsWith(`${contentVersion}:`),
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
  }, CONTENT_VERSION)).toEqual({
    completedLessons: {},
    evidenceCount: 72,
    allContentVersioned: true,
    allDescriptive: true,
    resumePhase: "result",
    savedAnswers: 72,
  });
});
