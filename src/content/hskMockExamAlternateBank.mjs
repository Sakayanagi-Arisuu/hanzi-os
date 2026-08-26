import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const HSK_MOCK_EXAM_ALTERNATE_BANK_RELATIVE_PATH =
  "content/runtime/hsk-mock-exam-alternate-local.json";

const readJson = (root, relativePath) => JSON.parse(
  readFileSync(resolve(root, relativePath), "utf8"),
);

const sha256Json = (value) => `sha256:${createHash("sha256")
  .update(JSON.stringify(value))
  .digest("hex")}`;

const objectiveItemIds = (assessment, formId) => {
  const form = assessment.forms.find((candidate) => candidate.formId === formId);
  if (!form) throw new Error(`Missing alternate assessment form ${formId}`);
  return new Set(form.sections
    .filter((section) => section.sectionId.endsWith("-objective"))
    .flatMap((section) => section.itemIds));
};

const projectHsk2Or3Item = (level, item) => {
  const stimulusText = item.stimulus.transcriptHanzi
    ?? item.stimulus.text
    ?? item.stimulus.lines?.map((line) => line.hanzi).join(" ")
    ?? "";
  const pinyinReference = item.stimulus.transcriptPinyin
    ?? item.stimulus.pinyinAuthoringReference
    ?? item.stimulus.lines?.map((line) => line.pinyin).join(" ")
    ?? null;
  const correct = item.options?.find((option) =>
    option.optionId === item.correctOptionId
  );
  if (
    !stimulusText
    || !item.source?.lessonId
    || !correct
    || item.options?.length !== 4
  ) throw new Error(`${item.itemId} has incomplete ${level.toUpperCase()} context`);
  return {
    id: item.itemId,
    sourceItemVersion: item.itemVersion,
    skill: item.skill,
    construct: item.construct,
    promptVi: item.promptVi,
    stimulusText,
    syntheticTtsText: item.skill === "listening" ? stimulusText : null,
    options: item.options.map((option) => ({ ...option })),
    correctOptionId: item.correctOptionId,
    explanationVi: `“${stimulusText}”${pinyinReference ? ` (${pinyinReference})` : ""}: ${correct.text}`,
    sourceLessonId: item.source.lessonId,
  };
};

const projectHsk4Items = (assessment, blueprints, ids) => {
  const sourceTextById = new Map(assessment.sources.flatMap((family) => [
    [family.readingSource.textId, family.readingSource.contentHanzi],
    [family.listeningSource.textId, family.listeningSource.contentHanzi],
  ]));
  const firstLessonByTrack = new Map();
  for (const lesson of blueprints.lessons) {
    if (!firstLessonByTrack.has(lesson.trackId)) {
      firstLessonByTrack.set(lesson.trackId, lesson.lessonId);
    }
  }
  return assessment.items.filter((item) => ids.has(item.itemId)).map((item) => {
    const stimulusText = item.stimulus.contextHanzi
      ?? sourceTextById.get(item.stimulus.sourceTextId)
      ?? "";
    const options = item.options?.map((option) => ({
      optionId: option.optionId,
      text: option.textVi ?? option.textHanzi,
    })) ?? [];
    const sourceLessonId = firstLessonByTrack.get(item.domainId);
    if (
      !sourceLessonId
      || !stimulusText
      || options.length !== 4
      || options.some((option) => !option.text)
    ) throw new Error(`${item.itemId} has incomplete HSK4 context`);
    return {
      id: item.itemId,
      sourceItemVersion: item.itemVersion,
      skill: item.skill,
      construct: item.construct,
      promptVi: item.promptVi,
      stimulusText,
      syntheticTtsText: item.skill === "listening" ? stimulusText : null,
      options,
      correctOptionId: item.correctOptionId,
      explanationVi: `${item.rationaleVi} ${item.scopeBoundaryVi}`,
      sourceLessonId,
    };
  });
};

const countsFor = (items) => Object.fromEntries([
  "listening",
  "reading",
  "vocabulary",
  "grammar",
].map((skill) => [skill, items.filter((item) => item.skill === skill).length]));

const assertAlternateItems = (level, items, expectedCounts) => {
  const errors = [];
  const ids = new Set();
  const versions = new Set();
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`${level} duplicates ${item.id}`);
    if (versions.has(item.sourceItemVersion)) {
      errors.push(`${level} duplicates ${item.sourceItemVersion}`);
    }
    ids.add(item.id);
    versions.add(item.sourceItemVersion);
    const optionIds = item.options.map((option) => option.optionId);
    const optionTexts = item.options.map((option) => option.text.trim());
    if (
      item.options.length !== 4
      || new Set(optionIds).size !== 4
      || new Set(optionTexts).size !== 4
      || optionTexts.some((text) => !text)
      || !optionIds.includes(item.correctOptionId)
      || !item.promptVi.trim()
      || !item.stimulusText.trim()
      || !item.explanationVi.trim()
      || !item.sourceLessonId.trim()
    ) errors.push(`${item.id} fails the alternate-bank content gate`);
    if (
      item.skill === "listening"
        ? item.syntheticTtsText !== item.stimulusText
        : item.syntheticTtsText !== null
    ) errors.push(`${item.id} has an invalid synthetic-TTS policy`);
  }
  const actualCounts = countsFor(items);
  if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCounts)) {
    errors.push(`${level} coverage ${JSON.stringify(actualCounts)} does not match ${JSON.stringify(expectedCounts)}`);
  }
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return actualCounts;
};

export const projectHskMockExamAlternateBank = (
  root = process.cwd(),
) => {
  const sourceRegistry = readJson(
    root,
    "content/sources/hsk-exam-source-registry-2026.08.json",
  );
  if (
    sourceRegistry.registryId !== "hsk-exam-source-registry-2026.08"
    || sourceRegistry.policy?.externalQuestionTextImported !== false
    || sourceRegistry.policy?.externalAudioImported !== false
    || sourceRegistry.sources?.length < 8
  ) throw new Error("HSK exam source registry is invalid");
  const contentVersion = readJson(
    root,
    "content/runtime/hsk2-level-check-local.json",
  ).contentVersion;
  const levels = {};
  const configs = [
    {
      level: "hsk2",
      assessmentPath: "content/drafts/hsk2-level-assessment-2026.07.json",
      formId: "hsk2-level-form-b",
      expectedCounts: { listening: 15, reading: 15, vocabulary: 15, grammar: 15 },
    },
    {
      level: "hsk3",
      assessmentPath: "content/drafts/hsk3-level-assessment-2026.07.json",
      formId: "hsk3-level-form-b",
      expectedCounts: { listening: 12, reading: 12, vocabulary: 15, grammar: 15 },
    },
    {
      level: "hsk4",
      assessmentPath: "content/drafts/hsk4-level-assessment-2026.07.json",
      formId: "hsk4-level-form-b",
      expectedCounts: { listening: 18, reading: 18, vocabulary: 18, grammar: 18 },
    },
  ];
  for (const config of configs) {
    const assessment = readJson(root, config.assessmentPath);
    const ids = objectiveItemIds(assessment, config.formId);
    const items = config.level === "hsk4"
      ? projectHsk4Items(
        assessment,
        readJson(root, "content/drafts/hsk4-lesson-blueprints-2026.07.json"),
        ids,
      )
      : assessment.items.filter((item) => ids.has(item.itemId)).map((item) =>
        projectHsk2Or3Item(config.level, item)
      );
    const counts = assertAlternateItems(
      config.level,
      items,
      config.expectedCounts,
    );
    levels[config.level] = {
      sourceBankId: assessment.bankId,
      sourceFormId: config.formId,
      counts: { items: items.length, ...counts },
      items,
    };
  }
  const totalItems = Object.values(levels)
    .reduce((sum, level) => sum + level.items.length, 0);
  const payload = {
    schemaVersion: 1,
    bankId: "hsk-mock-exam-alternate-local-2026.08",
    contentVersion,
    state: "ai-reviewed-for-personal-local-practice",
    policy: {
      humanReviewed: false,
      browserTtsPracticeOnly: true,
      officialExam: false,
      measurementEligible: false,
      masteryEligible: false,
      prerequisiteUnlockEligible: false,
    },
    provenance: {
      method: "deterministic-objective-projection-from-repository-authored-alternate-forms",
      externalQuestionTextImported: false,
      sourceRegistry: "content/sources/hsk-exam-source-registry-2026.08.json",
      sourceRegistryId: sourceRegistry.registryId,
      referenceSourceCount: sourceRegistry.sources.length,
    },
    automatedReview: {
      accuracy: true,
      levelFit: true,
      pedagogy: true,
      answerIntegrity: true,
      originality: true,
      unresolvedIssueCount: 0,
    },
    counts: {
      items: totalItems,
      levels: Object.fromEntries(Object.entries(levels).map(([level, value]) => [
        level,
        value.items.length,
      ])),
    },
    levels,
  };
  return { ...payload, integritySha256: sha256Json(payload) };
};

export const validateHskMockExamAlternateBank = (
  root = process.cwd(),
) => {
  const expected = projectHskMockExamAlternateBank(root);
  const actual = readJson(root, HSK_MOCK_EXAM_ALTERNATE_BANK_RELATIVE_PATH);
  const errors = [];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push("HSK Mock Exam alternate bank has drifted");
  }
  if (
    actual.counts?.items !== 186
    || actual.policy?.humanReviewed !== false
    || actual.policy?.officialExam !== false
    || actual.provenance?.externalQuestionTextImported !== false
    || actual.automatedReview?.unresolvedIssueCount !== 0
  ) errors.push("HSK Mock Exam alternate bank policy or coverage is invalid");
  return { valid: errors.length === 0, errors, summary: actual.counts };
};
