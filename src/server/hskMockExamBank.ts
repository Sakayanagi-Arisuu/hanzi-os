import type { Skill } from "../types";
import { CONTENT_VERSION, LESSONS } from "../data/curriculum";
import { HSK1_LEVEL_CHECK_ITEMS } from "../data/hsk1LevelCheck";
import { HSK2_LEVEL_CHECK_ITEMS } from "../data/hsk2LevelCheck";
import { HSK3_LEVEL_CHECK_ITEMS } from "../data/hsk3LevelCheck";
import { HSK4_LEVEL_CHECK_ITEMS } from "../data/hsk4LevelCheck";
import type {
  AuthoritativeAssessmentBlueprint,
  AuthoritativeAssessmentItem,
} from "./authoritativeAssessmentItemBank";

export const HSK_MOCK_EXAM_LEVELS = ["hsk1", "hsk2", "hsk3", "hsk4"] as const;
export const HSK_MOCK_EXAM_FORMS = ["a", "b"] as const;
export const HSK_MOCK_EXAM_SKILLS = [
  "listening",
  "reading",
  "vocabulary",
  "grammar",
] as const satisfies readonly Skill[];

export type HskMockExamLevel = typeof HSK_MOCK_EXAM_LEVELS[number];
export type HskMockExamFormKey = typeof HSK_MOCK_EXAM_FORMS[number];
export type HskMockExamSkill = typeof HSK_MOCK_EXAM_SKILLS[number];

type SourceOption = { optionId: string; text: string };
type SourceItem = {
  id: string;
  sourceItemVersion: string;
  skill: HskMockExamSkill;
  construct: string;
  promptVi: string;
  stimulusText: string;
  syntheticTtsText: string | null;
  options: SourceOption[];
  correctOptionId: string;
  explanationVi: string;
  sourceLessonId: string;
};

export type HskMockExamItem = AuthoritativeAssessmentItem & {
  examLevel: HskMockExamLevel;
  formKey: HskMockExamFormKey;
  explanationVi: string;
  sourceLessonId: string;
  humanReviewed: false;
  aiReview: {
    accuracy: true;
    levelFit: true;
    pedagogy: true;
    answerIntegrity: true;
    originality: true;
  };
};

export type HskMockExamDefinition = {
  examLevel: HskMockExamLevel;
  formKey: HskMockExamFormKey;
  title: string;
  timeLimitMinutes: number;
  contentVersion: typeof CONTENT_VERSION;
  humanReviewed: false;
  browserTtsPracticeOnly: true;
  officialExam: false;
  certificationEligible: false;
  masteryEligible: false;
  prerequisiteUnlockEligible: false;
  blueprint: AuthoritativeAssessmentBlueprint;
  bank: readonly HskMockExamItem[];
};

const sourceByLevel = {
  hsk1: HSK1_LEVEL_CHECK_ITEMS,
  hsk2: HSK2_LEVEL_CHECK_ITEMS,
  hsk3: HSK3_LEVEL_CHECK_ITEMS,
  hsk4: HSK4_LEVEL_CHECK_ITEMS,
} as unknown as Record<HskMockExamLevel, readonly SourceItem[]>;

const runtimeLessonIds = new Set(LESSONS.map((lesson) => lesson.id));
const runtimeLessonsByLevel: Record<HskMockExamLevel, string[]> = {
  hsk1: LESSONS.filter((lesson) =>
    !lesson.id.startsWith("hsk2-")
    && !lesson.id.startsWith("hsk3-")
    && !lesson.id.startsWith("hsk4-")
    && !lesson.id.startsWith("boot-")
  ).map((lesson) => lesson.id),
  hsk2: LESSONS.filter((lesson) => lesson.id.startsWith("hsk2-")).map((lesson) => lesson.id),
  hsk3: LESSONS.filter((lesson) => lesson.id.startsWith("hsk3-")).map((lesson) => lesson.id),
  hsk4: LESSONS.filter((lesson) => lesson.id.startsWith("hsk4-")).map((lesson) => lesson.id),
};

const timeLimitByLevel: Record<HskMockExamLevel, number> = {
  hsk1: 18,
  hsk2: 22,
  hsk3: 28,
  hsk4: 35,
};

const titleByLevel: Record<HskMockExamLevel, string> = {
  hsk1: "Luyện nhanh HSK1",
  hsk2: "Luyện nhanh HSK2",
  hsk3: "Luyện nhanh HSK3",
  hsk4: "Luyện nhanh HSK4",
};

const levelNumber = (level: HskMockExamLevel) => level.slice(-1);

const sourceItemsForForm = (
  level: HskMockExamLevel,
  formKey: HskMockExamFormKey,
) => HSK_MOCK_EXAM_SKILLS.flatMap((skill) => {
  const matching = sourceByLevel[level].filter((item) => item.skill === skill);
  const start = formKey === "a" ? 0 : 3;
  return matching.slice(start, start + 3);
});

const correctText = (item: SourceItem) => {
  const option = item.options.find((candidate) =>
    candidate.optionId === item.correctOptionId
  );
  if (!option) throw new Error(`Mock exam source ${item.id} has no answer.`);
  return option.text;
};

const recommendationLessonId = (
  level: HskMockExamLevel,
  item: SourceItem,
) => {
  if (runtimeLessonIds.has(item.sourceLessonId)) return item.sourceLessonId;
  const normalized = item.sourceLessonId.replaceAll(":", "-");
  if (runtimeLessonIds.has(normalized)) return normalized;
  const candidates = runtimeLessonsByLevel[level];
  const checksum = [...item.id].reduce((sum, character) =>
    sum + character.codePointAt(0)!, 0);
  const candidate = candidates[checksum % candidates.length];
  if (!candidate) throw new Error(`Mock Exam ${level} has no lesson recommendation.`);
  return candidate;
};

const toMockItem = (
  level: HskMockExamLevel,
  formKey: HskMockExamFormKey,
  formFamilyId: string,
  item: SourceItem,
): HskMockExamItem => {
  const listening = item.skill === "listening";
  const id = `mock-${level}-${formKey}-${item.id}`;
  return {
    id,
    itemVersion: `${CONTENT_VERSION}:${id}:1`,
    contentVersion: CONTENT_VERSION,
    skill: item.skill,
    construct: item.construct,
    modality: listening ? "synthetic-tts-selection" : "visual-selection",
    equivalentGroupId: `${formFamilyId}:${item.sourceItemVersion}`,
    exposureGroupId: `${formFamilyId}:${item.sourceItemVersion}`,
    formFamilyId,
    reviewStatus: "approved",
    calibrationStatus: "uncalibrated",
    answerExposure: "server-confidential",
    difficulty: null,
    discrimination: null,
    measurementEligible: !listening,
    prompt: listening
      ? item.promptVi
      : `${item.promptVi}\n${item.stimulusText}`,
    meta: `HSK${levelNumber(level)} · ${item.skill.toUpperCase()} · FORM ${formKey.toUpperCase()}`,
    options: item.options.map((option) => option.text),
    correctAnswer: correctText(item),
    ...(listening
      ? { stimulusText: item.syntheticTtsText ?? item.stimulusText }
      : {}),
    examLevel: level,
    formKey,
    explanationVi: item.explanationVi,
    sourceLessonId: recommendationLessonId(level, item),
    humanReviewed: false,
    aiReview: {
      accuracy: true,
      levelFit: true,
      pedagogy: true,
      answerIntegrity: true,
      originality: true,
    },
  };
};

const createDefinition = (
  examLevel: HskMockExamLevel,
  formKey: HskMockExamFormKey,
): HskMockExamDefinition => {
  const formFamilyId = `hsk-mock-${examLevel}-${formKey}`;
  const blueprint: AuthoritativeAssessmentBlueprint = {
    id: `${formFamilyId}-v1`,
    formVersion: `${CONTENT_VERSION}:${formFamilyId}:1`,
    formFamilyId,
    scoringPolicyVersion: "hsk-mock-observed-server-v1",
    itemCount: 12,
    skillTargets: {
      listening: 3,
      reading: 3,
      vocabulary: 3,
      grammar: 3,
    },
    requiredReviewStatus: "approved",
  };
  return {
    examLevel,
    formKey,
    title: `${titleByLevel[examLevel]} · Form ${formKey.toUpperCase()}`,
    timeLimitMinutes: timeLimitByLevel[examLevel],
    contentVersion: CONTENT_VERSION,
    humanReviewed: false,
    browserTtsPracticeOnly: true,
    officialExam: false,
    certificationEligible: false,
    masteryEligible: false,
    prerequisiteUnlockEligible: false,
    blueprint,
    bank: sourceItemsForForm(examLevel, formKey).map((item) =>
      toMockItem(examLevel, formKey, formFamilyId, item)
    ),
  };
};

export const HSK_MOCK_EXAM_DEFINITIONS = HSK_MOCK_EXAM_LEVELS.flatMap(
  (level) => HSK_MOCK_EXAM_FORMS.map((form) => createDefinition(level, form)),
);

export const isHskMockExamLevel = (value: unknown): value is HskMockExamLevel =>
  typeof value === "string"
  && HSK_MOCK_EXAM_LEVELS.includes(value as HskMockExamLevel);

export const isHskMockExamFormKey = (
  value: unknown,
): value is HskMockExamFormKey => typeof value === "string"
  && HSK_MOCK_EXAM_FORMS.includes(value.toLowerCase() as HskMockExamFormKey);

export const getHskMockExamDefinition = (
  level: unknown,
  form: unknown,
) => {
  if (!isHskMockExamLevel(level) || !isHskMockExamFormKey(form)) return null;
  const normalizedForm = form.toLowerCase() as HskMockExamFormKey;
  return HSK_MOCK_EXAM_DEFINITIONS.find((definition) =>
    definition.examLevel === level && definition.formKey === normalizedForm
  ) ?? null;
};

export const validateHskMockExamDefinitions = (
  definitions: readonly HskMockExamDefinition[] = HSK_MOCK_EXAM_DEFINITIONS,
) => {
  const errors: string[] = [];
  const lessonIds = runtimeLessonIds;
  if (definitions.length !== 8) errors.push("Mock Exam phải có đúng 8 form.");
  const formIds = new Set<string>();
  const itemVersions = new Set<string>();
  for (const definition of definitions) {
    const formId = `${definition.examLevel}:${definition.formKey}`;
    if (formIds.has(formId)) errors.push(`Trùng form ${formId}.`);
    formIds.add(formId);
    if (definition.bank.length !== 12 || definition.blueprint.itemCount !== 12) {
      errors.push(`${formId} phải có đúng 12 câu.`);
    }
    for (const skill of HSK_MOCK_EXAM_SKILLS) {
      if (definition.bank.filter((item) => item.skill === skill).length !== 3) {
        errors.push(`${formId} thiếu coverage ${skill}.`);
      }
    }
    for (const item of definition.bank) {
      if (itemVersions.has(item.itemVersion)) errors.push(`Trùng ${item.itemVersion}.`);
      itemVersions.add(item.itemVersion);
      if (
        item.contentVersion !== CONTENT_VERSION
        || item.examLevel !== definition.examLevel
        || item.formKey !== definition.formKey
        || item.formFamilyId !== definition.blueprint.formFamilyId
        || item.reviewStatus !== "approved"
        || item.answerExposure !== "server-confidential"
        || item.humanReviewed !== false
        || Object.values(item.aiReview).some((pass) => pass !== true)
        || item.options.length !== 4
        || new Set(item.options).size !== 4
        || !item.options.includes(item.correctAnswer)
        || !item.explanationVi.trim()
        || !lessonIds.has(item.sourceLessonId)
      ) errors.push(`${item.itemVersion} không đạt content gate Mock Exam.`);
      if (
        item.modality === "synthetic-tts-selection"
          ? item.measurementEligible !== false || !item.stimulusText
          : item.measurementEligible !== true || item.stimulusText !== undefined
      ) errors.push(`${item.itemVersion} có modality/evidence policy sai.`);
    }
  }
  for (const level of HSK_MOCK_EXAM_LEVELS) {
    for (const form of HSK_MOCK_EXAM_FORMS) {
      if (!formIds.has(`${level}:${form}`)) errors.push(`Thiếu ${level}:${form}.`);
    }
  }
  return { ok: errors.length === 0, errors } as const;
};

const validation = validateHskMockExamDefinitions();
if (!validation.ok) {
  throw new Error(`HSK Mock Exam bank invalid:\n${validation.errors.join("\n")}`);
}
