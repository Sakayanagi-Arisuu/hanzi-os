import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  readIndexedDbStore,
  type OwnerScopedCacheRecord,
} from "./indexedDb";

type DemoManifest = {
  runtimeCatalogBinding: {
    schemaVersion: number;
    catalogId: string;
    compilerVersion: string;
    runtimeContentVersion: string;
    importIdempotencyKey: string;
    integritySha256: string;
    sourceBindings: {
      curriculumGraph: {
        graphId: string;
      };
      contentPackage: {
        packageId: string;
        contentSchemaVersion: number;
        itemCatalogSchemaVersion: number;
      };
    };
  };
  scenario: {
    profileSelection: {
      startingLevel: "hsk1";
      goal: "hsk";
      script: "simplified";
    };
    targetPathId: "hsk1";
    bridgePathId: "hsk0";
    entryLessonId: string;
    bridgeLessonIds: string[];
    boundaryUnlockLessonId: string;
    stillLockedLessonIds: string[];
    blockedLessonIds: string[];
    unavailablePathIds: string[];
  };
  walkthrough: {
    intentionalErrorSelection: "first-non-required-after-resume";
    reloadAfterCheckedActivityPosition: number;
    minimumPassingScore: number;
  };
  expectations: {
    lessonActivityCount: number;
    intentionalIncorrectCount: number;
    passingScore: number;
    remediationAttempts: number;
    totalLessonEvidence: number;
    totalRemediationEvidence: number;
  };
  policy: {
    learnerVisible: false;
    testContractOnly: true;
    storageMutationMode: "real-ui-only";
    exactRuntimeProvenanceRequired: true;
    skillSeparatedEvidenceRequired: true;
    remediationGrantsMastery: false;
    prerequisiteWaiverAllowed: false;
    completionClaim: false;
  };
};

type ResumeExercise = {
  id: string;
  activityVersion: string;
  kind: string;
  skill: string;
  options: string[];
  correct: string;
  requiredForPass?: boolean;
};

type LessonResumeSnapshot = {
  version: number;
  contentVersion: string;
  sessionId: string;
  lessonId: string;
  phase: string;
  exercises: ResumeExercise[];
  index: number;
  checked: boolean;
  answers: Array<{
    exerciseId: string;
    selectedAnswer: string;
  }>;
  finished: boolean;
};

type EvidenceSnapshot = {
  id: string;
  idempotencyKey: string;
  contentVersion: string;
  activityVersion: string;
  source: string;
  method: string;
  activityId: string;
  skill: string;
  outcome: string;
  score: number | null;
  verified: boolean;
  masteryEligible: boolean;
  metadata?: Record<string, string | number | boolean | null>;
};

type LearningStateSnapshot = {
  profile: {
    goal: string;
    startingLevel: string;
    script: string;
    onboarded: boolean;
  };
  xp: number;
  streak: number;
  completedLessons: Record<string, {
    score: number;
    bestScore: number;
    attempts: number;
  }>;
  skillMastery: Record<string, number>;
  mistakes: Array<{
    id: string;
    lessonId: string;
    questionId: string;
    skill: string;
    correctAnswer: string;
    correctedStreak: number;
    resolved: boolean;
  }>;
  evidence: EvidenceSnapshot[];
};

const demo = JSON.parse(readFileSync(
  new URL("../content/demo/hsk0-1-local-demo.json", import.meta.url),
  "utf8",
)) as DemoManifest;

const EXPECTED_ACTIVITY_COUNT = demo.expectations.lessonActivityCount;
const SKILLS = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
] as const;

const readLearningState = (page: Page) =>
  page.evaluate(() => JSON.parse(
    localStorage.getItem("hanzi-os-learning-state-v1") ?? "{}",
  )) as Promise<LearningStateSnapshot>;

const readLessonResume = async (
  page: Page,
  lessonId: string,
): Promise<LessonResumeSnapshot | null> => {
  const records = await readIndexedDbStore<
    OwnerScopedCacheRecord<LessonResumeSnapshot>
  >(page, "lesson-resumes");
  return records.find((record) =>
    record.value?.lessonId === lessonId
  )?.value ?? null;
};

const finishHsk1TargetOnboarding = async (page: Page) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    name: /Đánh thức một ngôn ngữ mới/i,
  })).toBeVisible();
  await page.getByRole("radiogroup", { name: "Mục tiêu thức tỉnh" })
    .getByRole("radio", { name: /^Hướng tới HSK/u })
    .click();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("radiogroup", { name: "Điểm xuất phát" })
    .getByRole("radio", { name: /^HSK1/u })
    .click();
  await page.getByRole("button", { name: "Tiếp tục thiết lập" }).click();
  await page.getByRole("button", { name: "Kích hoạt HANZI.OS" }).click();
  await expect(page.getByRole("heading", {
    name: /Đánh thức tiếng Trung trong bạn/i,
  })).toBeVisible();
};

const expectLessonNodeState = async (
  page: Page,
  position: number,
  lessonId: string,
  unlocked: boolean,
) => {
  const node = page.locator(".lesson-node").nth(position);
  if (unlocked) {
    await expect(node).toHaveAttribute("href", `/lesson/${lessonId}`);
    await expect(node).not.toHaveAttribute("aria-disabled", "true");
  } else {
    await expect(node).toHaveAttribute("aria-disabled", "true");
    await expect(node).not.toHaveAttribute("href", /.+/u);
  }
};

const startLesson = async (page: Page, lessonId: string) => {
  await page.goto(`/lesson/${lessonId}`);
  await expect(page.getByText(
    /Âm thanh trong bài là TTS tổng hợp của trình duyệt/i,
  )).toBeVisible();
  await page.getByRole("button", {
    name: /Bước vào Thử Luyện/i,
  }).click();
  await expect(page.getByText(
    `1 / ${EXPECTED_ACTIVITY_COUNT}`,
    { exact: true },
  )).toBeVisible();
  await expect.poll(async () => {
    const resume = await readLessonResume(page, lessonId);
    return resume && {
      version: resume.version,
      contentVersion: resume.contentVersion,
      phase: resume.phase,
      activityCount: resume.exercises.length,
      index: resume.index,
      checked: resume.checked,
      answerCount: resume.answers.length,
    };
  }).toEqual({
    version: 5,
    contentVersion: demo.runtimeCatalogBinding.runtimeContentVersion,
    phase: "exercise",
    activityCount: EXPECTED_ACTIVITY_COUNT,
    index: 0,
    checked: false,
    answerCount: 0,
  });
  return (await readLessonResume(page, lessonId))!;
};

const selectExerciseAnswer = async (
  page: Page,
  exercise: ResumeExercise,
  correct: boolean,
) => {
  if (exercise.kind === "recall") {
    await page.getByLabel("Hán tự bạn tự gọi lại").fill(
      correct ? exercise.correct : "__demo_intentional_error__",
    );
    return;
  }

  const selectedAnswer = correct
    ? exercise.correct
    : exercise.options.find((option) => option !== exercise.correct);
  expect(selectedAnswer).toBeTruthy();
  const optionButtons = page.locator(".answer-grid button");
  const optionCount = await optionButtons.count();
  for (let optionIndex = 0; optionIndex < optionCount; optionIndex += 1) {
    const button = optionButtons.nth(optionIndex);
    if (
      (await button.locator("strong").textContent())?.trim()
        === selectedAnswer
    ) {
      await button.click();
      return;
    }
  }
  throw new Error(`UI option is unavailable: ${selectedAnswer}`);
};

const answerCurrentExercise = async (
  page: Page,
  lessonId: string,
  correct: boolean,
) => {
  const before = await readLessonResume(page, lessonId);
  if (!before || before.checked) {
    throw new Error(`Lesson ${lessonId} is not ready for an answer`);
  }
  const exercise = before.exercises[before.index];
  if (!exercise) throw new Error(`Lesson ${lessonId} form is incomplete`);

  await selectExerciseAnswer(page, exercise, correct);
  await page.getByRole("button", { name: "Xác nhận" }).click();
  const nextButtonName = before.index === before.exercises.length - 1
    ? "Hoàn tất thử luyện"
    : "Câu tiếp theo";
  await expect(page.getByRole("button", {
    name: nextButtonName,
  })).toBeVisible();
  await expect.poll(async () => {
    const after = await readLessonResume(page, lessonId);
    return after && {
      sessionId: after.sessionId,
      index: after.index,
      checked: after.checked,
      answerCount: after.answers.length,
    };
  }).toEqual({
    sessionId: before.sessionId,
    index: before.index,
    checked: true,
    answerCount: before.index + 1,
  });
  return exercise;
};

const finishLiveLesson = async (
  page: Page,
  lessonId: string,
  incorrectPosition: number | null = null,
) => {
  for (
    let transition = 0;
    transition < EXPECTED_ACTIVITY_COUNT * 2 + 2;
    transition += 1
  ) {
    const resume = await readLessonResume(page, lessonId);
    if (!resume) throw new Error(`Lesson ${lessonId} resume disappeared`);
    if (resume.checked) {
      if (resume.index === resume.exercises.length - 1) {
        await page.getByRole("button", {
          name: "Hoàn tất thử luyện",
        }).click();
        await expect(page.getByRole("heading", {
          name: "Đã hoàn tất tự kiểm cục bộ",
        })).toBeVisible();
        return;
      }
      await page.getByRole("button", { name: "Câu tiếp theo" }).click();
      await expect(page.getByText(
        `${resume.index + 2} / ${EXPECTED_ACTIVITY_COUNT}`,
        { exact: true },
      )).toBeVisible();
      await expect.poll(async () => {
        const next = await readLessonResume(page, lessonId);
        return next && {
          index: next.index,
          checked: next.checked,
        };
      }).toEqual({
        index: resume.index + 1,
        checked: false,
      });
      continue;
    }
    await answerCurrentExercise(
      page,
      lessonId,
      resume.index !== incorrectPosition,
    );
  }
  throw new Error(`Lesson ${lessonId} did not reach its result screen`);
};

const continueToPath = async (page: Page) => {
  await page.getByRole("link", {
    name: "Tiếp tục Thiên Lộ",
  }).click();
  await expect(page).toHaveURL(/\/path$/u);
};

test("walks the real local UI from the HSK0 bridge into rich HSK1 study", async ({
  page,
}) => {
  test.setTimeout(360_000);
  expect(demo.scenario.profileSelection.startingLevel).toBe("hsk1");
  expect(demo.policy).toMatchObject({
    learnerVisible: false,
    testContractOnly: true,
    storageMutationMode: "real-ui-only",
    exactRuntimeProvenanceRequired: true,
    skillSeparatedEvidenceRequired: true,
    remediationGrantsMastery: false,
    prerequisiteWaiverAllowed: false,
    completionClaim: false,
  });

  await finishHsk1TargetOnboarding(page);
  await expect.poll(async () => {
    const state = await readLearningState(page);
    return {
      profile: state.profile,
      evidenceCount: state.evidence.length,
      completedLessonCount: Object.keys(state.completedLessons).length,
      mistakeCount: state.mistakes.length,
      masteryTotal: Object.values(state.skillMastery)
        .reduce((sum, value) => sum + value, 0),
      xp: state.xp,
      streak: state.streak,
    };
  }).toMatchObject({
    profile: {
      goal: "hsk",
      startingLevel: demo.scenario.profileSelection.startingLevel,
      script: demo.scenario.profileSelection.script,
      onboarded: true,
    },
    evidenceCount: 0,
    completedLessonCount: 0,
    mistakeCount: 0,
    masteryTotal: 0,
    xp: 0,
    streak: 0,
  });

  await page.goto("/path");
  await expect(page.getByText(
    "Tự khai cấp độ không tự miễn prerequisite.",
    { exact: false },
  )).toBeVisible();
  const allVisibleLessonIds = [
    ...demo.scenario.bridgeLessonIds,
    demo.scenario.boundaryUnlockLessonId,
    ...demo.scenario.stillLockedLessonIds,
  ];
  await expect(page.locator(".lesson-node"))
    .toHaveCount(allVisibleLessonIds.length);
  for (
    let position = 0;
    position < allVisibleLessonIds.length;
    position += 1
  ) {
    await expectLessonNodeState(
      page,
      position,
      allVisibleLessonIds[position]!,
      position === 0,
    );
  }

  const firstLessonId = demo.scenario.entryLessonId;
  const initialResume = await startLesson(page, firstLessonId);
  expect(initialResume.exercises).toHaveLength(EXPECTED_ACTIVITY_COUNT);
  expect(initialResume.exercises.filter((exercise) =>
    exercise.requiredForPass
  ).length).toBeGreaterThan(0);

  const firstExercise = await answerCurrentExercise(
    page,
    firstLessonId,
    true,
  );
  const resumedSessionId = initialResume.sessionId;
  await expect.poll(async () =>
    (await readLearningState(page)).evidence.length
  ).toBe(1);

  await page.reload();
  await expect(page.getByText(
    `${demo.walkthrough.reloadAfterCheckedActivityPosition + 1} / ${EXPECTED_ACTIVITY_COUNT}`,
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Câu tiếp theo",
  })).toBeVisible();
  await expect.poll(async () => {
    const resumed = await readLessonResume(page, firstLessonId);
    return resumed && {
      sessionId: resumed.sessionId,
      index: resumed.index,
      checked: resumed.checked,
      answerCount: resumed.answers.length,
      firstExerciseId: resumed.exercises[0]?.id,
    };
  }).toEqual({
    sessionId: resumedSessionId,
    index: demo.walkthrough.reloadAfterCheckedActivityPosition,
    checked: true,
    answerCount: 1,
    firstExerciseId: firstExercise.id,
  });
  expect((await readLearningState(page)).evidence).toHaveLength(1);

  const resumedForm = (await readLessonResume(page, firstLessonId))!;
  const intentionalErrorPosition = resumedForm.exercises.findIndex(
    (exercise, position) =>
      position > demo.walkthrough.reloadAfterCheckedActivityPosition
      && exercise.requiredForPass !== true,
  );
  expect(intentionalErrorPosition).toBeGreaterThan(
    demo.walkthrough.reloadAfterCheckedActivityPosition,
  );
  await finishLiveLesson(
    page,
    firstLessonId,
    intentionalErrorPosition,
  );

  let state = await readLearningState(page);
  expect(state.completedLessons[firstLessonId]).toMatchObject({
    score: demo.expectations.passingScore,
    bestScore: demo.expectations.passingScore,
    attempts: 1,
  });
  const firstSessionEvidence = state.evidence.filter((item) =>
    item.metadata?.lessonId === firstLessonId
    && item.metadata?.sessionId === resumedSessionId
  );
  const firstAnswerEvidence = firstSessionEvidence.filter(
    (item) => item.method !== "lesson-completion",
  );
  const firstCompletionEvidence = firstSessionEvidence.filter(
    (item) => item.method === "lesson-completion",
  );
  expect(firstSessionEvidence).toHaveLength(EXPECTED_ACTIVITY_COUNT + 1);
  expect(firstAnswerEvidence).toHaveLength(EXPECTED_ACTIVITY_COUNT);
  expect(firstCompletionEvidence).toHaveLength(1);
  expect(new Set(
    firstSessionEvidence.map((item) => item.idempotencyKey),
  ).size).toBe(firstSessionEvidence.length);

  for (const evidence of firstSessionEvidence) {
    expect(SKILLS).toContain(evidence.skill);
    expect(evidence).toMatchObject({
      contentVersion: demo.runtimeCatalogBinding.runtimeContentVersion,
      source: "lesson",
      verified: true,
      metadata: {
        localRuntimeSchemaVersion: 1,
        activitySchemaVersion: 1,
        runtimeCatalogSchemaVersion:
          demo.runtimeCatalogBinding.schemaVersion,
        runtimeCatalogId: demo.runtimeCatalogBinding.catalogId,
        runtimeCompilerVersion:
          demo.runtimeCatalogBinding.compilerVersion,
        runtimeCatalogImportKey:
          demo.runtimeCatalogBinding.importIdempotencyKey,
        runtimeCatalogIntegrity:
          demo.runtimeCatalogBinding.integritySha256,
        runtimeGraphId:
          demo.runtimeCatalogBinding.sourceBindings.curriculumGraph.graphId,
        runtimePackageId:
          demo.runtimeCatalogBinding.sourceBindings.contentPackage.packageId,
        contentSchemaVersion:
          demo.runtimeCatalogBinding.sourceBindings.contentPackage
            .contentSchemaVersion,
        itemCatalogSchemaVersion:
          demo.runtimeCatalogBinding.sourceBindings.contentPackage
            .itemCatalogSchemaVersion,
        lessonId: firstLessonId,
        lessonVersion:
          demo.runtimeCatalogBinding.runtimeContentVersion,
        sessionId: resumedSessionId,
        script: demo.scenario.profileSelection.script,
      },
    });
  }
  for (const evidence of firstAnswerEvidence) {
    expect(evidence.idempotencyKey).toBe(
      `${resumedSessionId}:answer:${evidence.metadata?.exerciseId}`,
    );
    expect(evidence.activityId).toBe(
      `${firstLessonId}:${evidence.metadata?.exerciseId}`,
    );
    expect(evidence.metadata?.activityPosition).toEqual(expect.any(Number));
  }
  expect(firstCompletionEvidence[0]).toMatchObject({
    idempotencyKey: `${resumedSessionId}:complete`,
    activityId: firstLessonId,
    outcome: "completed",
    score: demo.expectations.passingScore,
    masteryEligible: false,
    metadata: {
      passed: true,
      clientScore: demo.expectations.passingScore,
      rawScore: demo.expectations.passingScore,
      evidenceCount: EXPECTED_ACTIVITY_COUNT,
    },
  });
  expect(firstAnswerEvidence.filter((item) =>
    item.outcome === "incorrect"
  )).toHaveLength(demo.expectations.intentionalIncorrectCount);
  expect(state.mistakes).toHaveLength(1);
  expect(state.mistakes[0]).toMatchObject({
    lessonId: firstLessonId,
    questionId:
      resumedForm.exercises[intentionalErrorPosition]!.id,
    skill: resumedForm.exercises[intentionalErrorPosition]!.skill,
    correctedStreak: 0,
    resolved: false,
  });

  const mistakeId = state.mistakes[0]!.id;
  const mistakeSkill = state.mistakes[0]!.skill;
  const mistakeAnswer = state.mistakes[0]!.correctAnswer;
  await continueToPath(page);
  await page.goto("/mistakes");
  for (
    let attempt = 1;
    attempt <= demo.expectations.remediationAttempts;
    attempt += 1
  ) {
    await page.getByLabel("Câu trả lời của bạn").fill(mistakeAnswer);
    await page.getByRole("button", { name: "Kiểm tra local" }).click();
    await expect(page.getByText(
      "Hoàn thành một lượt tự gọi local",
      { exact: true },
    )).toBeVisible();
    await expect.poll(async () => {
      const current = await readLearningState(page);
      const mistake = current.mistakes.find((item) =>
        item.id === mistakeId
      );
      const remediation = current.evidence.filter((item) =>
        item.source === "mistake" && item.activityId === mistakeId
      );
      return {
        correctedStreak: mistake?.correctedStreak,
        resolved: mistake?.resolved,
        evidenceCount: remediation.length,
        policies: remediation.map((item) => ({
          skill: item.skill,
          verified: item.verified,
          masteryEligible: item.masteryEligible,
          usedHint: item.metadata?.usedHint,
        })),
      };
    }).toEqual({
      correctedStreak: attempt,
      resolved:
        attempt === demo.expectations.remediationAttempts,
      evidenceCount: attempt,
      policies: Array.from({ length: attempt }, () => ({
        skill: mistakeSkill,
        verified: false,
        masteryEligible: false,
        usedHint: false,
      })),
    });
    if (attempt < demo.expectations.remediationAttempts) {
      await page.getByRole("button", {
        name: "Củng cố lần tiếp theo",
      }).click();
    }
  }

  for (
    let bridgeIndex = 1;
    bridgeIndex < demo.scenario.bridgeLessonIds.length;
    bridgeIndex += 1
  ) {
    const lessonId = demo.scenario.bridgeLessonIds[bridgeIndex]!;
    const resume = await startLesson(page, lessonId);
    expect(resume.exercises).toHaveLength(EXPECTED_ACTIVITY_COUNT);
    await finishLiveLesson(page, lessonId);
    await continueToPath(page);
    await expectLessonNodeState(
      page,
      bridgeIndex,
      lessonId,
      true,
    );
    if (bridgeIndex + 1 < demo.scenario.bridgeLessonIds.length) {
      await expectLessonNodeState(
        page,
        bridgeIndex + 1,
        demo.scenario.bridgeLessonIds[bridgeIndex + 1]!,
        true,
      );
    }
  }

  await expect(page.locator(".lesson-node"))
    .toHaveCount(allVisibleLessonIds.length);
  await expectLessonNodeState(
    page,
    demo.scenario.bridgeLessonIds.length,
    demo.scenario.boundaryUnlockLessonId,
    true,
  );
  for (
    let targetIndex = 0;
    targetIndex < demo.scenario.stillLockedLessonIds.length;
    targetIndex += 1
  ) {
    await expectLessonNodeState(
      page,
      demo.scenario.bridgeLessonIds.length + targetIndex + 1,
      demo.scenario.stillLockedLessonIds[targetIndex]!,
      false,
    );
  }

  state = await readLearningState(page);
  expect(Object.keys(state.completedLessons).sort()).toEqual(
    [...demo.scenario.bridgeLessonIds].sort(),
  );
  for (const lessonId of demo.scenario.bridgeLessonIds) {
    expect(state.completedLessons[lessonId]).toMatchObject({
      bestScore: lessonId === firstLessonId
        ? demo.expectations.passingScore
        : 100,
      attempts: 1,
    });
  }
  expect(state.completedLessons[demo.scenario.boundaryUnlockLessonId])
    .toBeUndefined();
  const lessonEvidence = state.evidence.filter((item) =>
    item.source === "lesson"
  );
  const remediationEvidence = state.evidence.filter((item) =>
    item.source === "mistake"
  );
  expect(lessonEvidence)
    .toHaveLength(demo.expectations.totalLessonEvidence);
  expect(remediationEvidence)
    .toHaveLength(demo.expectations.totalRemediationEvidence);
  expect(new Set(state.evidence.map((item) => item.idempotencyKey)).size)
    .toBe(state.evidence.length);
  expect(state.evidence.every((item) =>
    SKILLS.includes(item.skill as (typeof SKILLS)[number])
  )).toBe(true);

  const expectedSkillMastery = Object.fromEntries(
    SKILLS.map((skill) => [skill, 0]),
  ) as Record<string, number>;
  for (const evidence of state.evidence) {
    if (!evidence.masteryEligible) continue;
    const delta = evidence.outcome === "correct"
      ? 1
      : evidence.outcome === "incorrect"
        ? -1
        : 0;
    expectedSkillMastery[evidence.skill] = Math.max(
      0,
      Math.min(100, expectedSkillMastery[evidence.skill]! + delta),
    );
  }
  expect(state.skillMastery).toEqual(expectedSkillMastery);
  expect(state.mistakes).toEqual([
    expect.objectContaining({
      id: mistakeId,
      skill: mistakeSkill,
      correctedStreak: demo.expectations.remediationAttempts,
      resolved: true,
    }),
  ]);

  for (const lessonId of demo.scenario.stillLockedLessonIds) {
    await page.goto(`/lesson/${lessonId}`);
    await expect(page.getByRole("heading", {
      name: "Bài tự luyện cục bộ này chưa mở",
    })).toBeVisible();
  }
  for (const lessonId of demo.scenario.blockedLessonIds) {
    await page.goto(`/lesson/${lessonId}`);
    await expect(page.getByRole("heading", {
      name: "Nội dung này chưa được phát hành",
    })).toBeVisible();
  }
  const stateAfterDeniedRoutes = await readLearningState(page);
  expect(stateAfterDeniedRoutes.evidence).toHaveLength(
    state.evidence.length,
  );
  expect(stateAfterDeniedRoutes.completedLessons)
    .toEqual(state.completedLessons);

  const richLessonId = demo.scenario.stillLockedLessonIds.find((lessonId) =>
    lessonId.startsWith("hsk1-time-place-events-")
  );
  expect(richLessonId).toBeTruthy();
  const richLessonPrerequisites = [
    demo.scenario.boundaryUnlockLessonId,
    ...demo.scenario.stillLockedLessonIds.filter((lessonId) =>
      lessonId.startsWith("survival-")
    ),
  ];
  for (const lessonId of richLessonPrerequisites) {
    await startLesson(page, lessonId);
    await finishLiveLesson(page, lessonId);
    await continueToPath(page);
  }

  await page.goto(`/lesson/${richLessonId}`);
  await expect(page.getByText(
    "03 · ỨNG DỤNG CHUYÊN SÂU",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Hội thoại mẫu",
  })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Nghe câu 你家有几个人？",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Ngữ pháp trong ngữ cảnh",
  })).toBeVisible();
  await expect(page.getByText(
    /Codex rà soát bằng AI cho mục đích tự học/i,
  )).toBeVisible();

  const timeLessonIds = demo.scenario.stillLockedLessonIds.filter(
    (lessonId) => lessonId.startsWith("hsk1-time-place-events-"),
  );
  expect(timeLessonIds).toHaveLength(6);
  for (const lessonId of timeLessonIds) {
    await startLesson(page, lessonId);
    await finishLiveLesson(page, lessonId);
    await continueToPath(page);
  }

  await page.goto("/lesson/daily-1");
  await expect(page.getByText(
    "03 · ỨNG DỤNG CHUYÊN SÂU",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Nghe câu 这个多少钱？",
  })).toBeVisible();
  await expect(page.getByRole("button", {
    name: "Nghe câu 我要三个。",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Nhiệm vụ giao tiếp",
  })).toBeVisible();
});
