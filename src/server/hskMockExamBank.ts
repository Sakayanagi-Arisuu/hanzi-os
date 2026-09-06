import alternateBankJson from "../../content/runtime/hsk-mock-exam-alternate-local.json";
import type { Skill } from "../types";
import {
  HSK_EXAM_FORM_KEYS,
  HSK_EXAM_LEVELS,
  HSK_BUILT_IN_EXAM_FORM_KEYS,
  HSK_STANDARD_EXAM_STRUCTURE,
  isHskExamFormKey,
  isHskExamLevel,
  type HskExamFormKey,
  type HskExamLevel,
} from "../assessment/hskExamStructure";
import { CONTENT_VERSION, LESSONS } from "../data/curriculum";
import { HSK1_LEVEL_CHECK_ITEMS } from "../data/hsk1LevelCheck";
import { HSK2_LEVEL_CHECK_ITEMS } from "../data/hsk2LevelCheck";
import { HSK3_LEVEL_CHECK_ITEMS } from "../data/hsk3LevelCheck";
import { HSK4_LEVEL_CHECK_ITEMS } from "../data/hsk4LevelCheck";
import type {
  AuthoritativeAssessmentBlueprint,
  AuthoritativeAssessmentItem,
} from "./authoritativeAssessmentItemBank";

export const HSK_MOCK_EXAM_LEVELS = HSK_EXAM_LEVELS;
export const HSK_MOCK_EXAM_FORMS = HSK_EXAM_FORM_KEYS;
export const HSK_MOCK_EXAM_SKILLS = [
  "listening",
  "reading",
  "vocabulary",
  "grammar",
  "writing",
] as const satisfies readonly Skill[];
const LEGACY_MOCK_EXAM_SKILLS = [
  "listening", "reading", "vocabulary", "grammar",
] as const;

export type HskMockExamLevel = HskExamLevel;
export type HskMockExamFormKey = HskExamFormKey;
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
  sourceItemVersion: string;
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
  legacy: boolean;
  standardStructure: boolean;
  sections: readonly {
    skill: HskMockExamSkill;
    label: string;
    itemCount: number;
    minutes: number;
  }[];
  blueprint: AuthoritativeAssessmentBlueprint;
  bank: readonly HskMockExamItem[];
};

type AlternateBank = {
  schemaVersion: 1;
  contentVersion: string;
  counts: {
    items: number;
    levels: Record<"hsk2" | "hsk3" | "hsk4", number>;
  };
  levels: Record<"hsk2" | "hsk3" | "hsk4", {
    items: SourceItem[];
  }>;
};

const alternateBank = alternateBankJson as unknown as AlternateBank;
if (
  alternateBank.schemaVersion !== 1
  || alternateBank.contentVersion !== CONTENT_VERSION
  || alternateBank.counts.items !== 186
) throw new Error("HSK Mock Exam alternate source bank is invalid.");

const sourceByLevel = {
  hsk1: HSK1_LEVEL_CHECK_ITEMS,
  hsk2: [...HSK2_LEVEL_CHECK_ITEMS, ...alternateBank.levels.hsk2.items],
  hsk3: [...HSK3_LEVEL_CHECK_ITEMS, ...alternateBank.levels.hsk3.items],
  hsk4: [...HSK4_LEVEL_CHECK_ITEMS, ...alternateBank.levels.hsk4.items],
} as unknown as Record<HskMockExamLevel, readonly SourceItem[]>;

const legacyFormCountByLevel = {
  hsk1: 3,
  hsk2: 10,
  hsk3: 8,
  hsk4: 12,
} as const satisfies Record<HskMockExamLevel, number>;

export const HSK_MOCK_EXAM_LEGACY_FORM_KEYS_BY_LEVEL = {
  hsk1: HSK_MOCK_EXAM_FORMS.slice(0, legacyFormCountByLevel.hsk1),
  hsk2: HSK_MOCK_EXAM_FORMS.slice(0, legacyFormCountByLevel.hsk2),
  hsk3: HSK_MOCK_EXAM_FORMS.slice(0, legacyFormCountByLevel.hsk3),
  hsk4: HSK_MOCK_EXAM_FORMS.slice(0, legacyFormCountByLevel.hsk4),
} satisfies Record<HskMockExamLevel, readonly HskMockExamFormKey[]>;

// Six complete standards-sized arrangements are learner-visible on each
// level. G-L stay reserved for governed Studio releases. Legacy 12-item doors
// remain resolvable for durable resume and are never relabelled as full exams.
export const HSK_MOCK_EXAM_FORM_KEYS_BY_LEVEL = {
  hsk1: HSK_BUILT_IN_EXAM_FORM_KEYS,
  hsk2: HSK_BUILT_IN_EXAM_FORM_KEYS,
  hsk3: HSK_BUILT_IN_EXAM_FORM_KEYS,
  hsk4: HSK_BUILT_IN_EXAM_FORM_KEYS,
} as const satisfies Record<HskMockExamLevel, readonly HskMockExamFormKey[]>;

export const HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS = Object.fromEntries(
  HSK_MOCK_EXAM_LEVELS.map((level) => [level, sourceByLevel[level].length]),
) as Record<HskMockExamLevel, number>;

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

const timeLimitByLevel = Object.fromEntries(
  HSK_MOCK_EXAM_LEVELS.map((level) => [
    level,
    HSK_STANDARD_EXAM_STRUCTURE[level].timeLimitMinutes,
  ]),
) as Record<HskMockExamLevel, number>;

const titleByLevel: Record<HskMockExamLevel, string> = {
  hsk1: "Mô phỏng thi HSK1",
  hsk2: "Mô phỏng thi HSK2",
  hsk3: "Mô phỏng thi HSK3",
  hsk4: "Mô phỏng thi HSK4",
};

const standardSections: Record<
  HskMockExamLevel,
  HskMockExamDefinition["sections"]
> = {
  hsk1: HSK_STANDARD_EXAM_STRUCTURE.hsk1.sections,
  hsk2: HSK_STANDARD_EXAM_STRUCTURE.hsk2.sections,
  hsk3: HSK_STANDARD_EXAM_STRUCTURE.hsk3.sections,
  hsk4: HSK_STANDARD_EXAM_STRUCTURE.hsk4.sections,
};

const levelNumber = (level: HskMockExamLevel) => level.slice(-1);

const legacySourceItemsForForm = (
  level: HskMockExamLevel,
  formKey: HskMockExamFormKey,
) => LEGACY_MOCK_EXAM_SKILLS.flatMap((skill) => {
  const matching = sourceByLevel[level].filter((item) => item.skill === skill);
  const formIndex = HSK_MOCK_EXAM_LEGACY_FORM_KEYS_BY_LEVEL[level].indexOf(formKey);
  if (formIndex < 0) return [];
  const start = formIndex * 3;
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
  projectedSkill: HskMockExamSkill = item.skill,
  version = 1,
): HskMockExamItem => {
  const listening = projectedSkill === "listening";
  const id = `mock-${level}-${formKey}-${item.id}`;
  return {
    id,
    itemVersion: `${CONTENT_VERSION}:${id}:${version}`,
    contentVersion: CONTENT_VERSION,
    skill: projectedSkill,
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
    meta: `HSK${levelNumber(level)} · ${projectedSkill.toUpperCase()} · CỬA ${formKey.toUpperCase()}`,
    options: item.options.map((option) => option.text),
    correctAnswer: correctText(item),
    ...(listening
      ? { stimulusText: item.syntheticTtsText ?? item.stimulusText }
      : {}),
    examLevel: level,
    formKey,
    sourceItemVersion: item.sourceItemVersion,
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

const itemsBySourceSkill = (level: HskMockExamLevel) => Object.fromEntries(
  LEGACY_MOCK_EXAM_SKILLS.map((skill) => [
    skill,
    sourceByLevel[level].filter((item) => item.skill === skill),
  ]),
) as Record<typeof LEGACY_MOCK_EXAM_SKILLS[number], SourceItem[]>;

const circularSlice = <T,>(items: readonly T[], start: number, count: number) => {
  if (count > items.length) {
    throw new Error(`Mock Exam source pool needs ${count} items but only has ${items.length}.`);
  }
  return Array.from({ length: count }, (_value, offset) =>
    items[(start + offset) % items.length]!
  );
};

const standardSourcePlan = (
  level: HskMockExamLevel,
  formKey: HskMockExamFormKey,
): Array<{ item: SourceItem; skill: HskMockExamSkill }> => {
  const source = itemsBySourceSkill(level);
  const as = (items: SourceItem[], skill: HskMockExamSkill) =>
    items.map((item) => ({ item, skill }));
  const formIndex = Math.max(
    0,
    HSK_MOCK_EXAM_FORMS.indexOf(formKey),
  );
  if (level === "hsk1") return [
    ...as(circularSlice(source.listening, formIndex * 7, 15), "listening"),
    ...as(circularSlice(source.vocabulary, formIndex * 5, 5), "listening"),
    ...as(circularSlice(source.reading, formIndex * 7, 15), "reading"),
    ...as(circularSlice(source.vocabulary, formIndex * 5 + 5, 5), "reading"),
  ];
  if (level === "hsk2") {
    const start = formIndex * 15;
    return [
      ...as(circularSlice(source.listening, start, 15), "listening"),
      ...as(circularSlice(source.vocabulary, start, 15), "listening"),
      ...as(circularSlice(source.grammar, start, 5), "listening"),
      ...as(circularSlice(source.reading, start, 15), "reading"),
      ...as(circularSlice(source.grammar, start + 5, 10), "reading"),
    ];
  }
  if (level === "hsk3") return [
    ...as(circularSlice(source.listening, formIndex * 13, 24), "listening"),
    ...as(circularSlice(source.vocabulary, formIndex * 11, 16), "listening"),
    ...as(circularSlice(source.reading, formIndex * 13, 24), "reading"),
    ...as(circularSlice(source.vocabulary, formIndex * 11 + 16, 6), "reading"),
    ...as(circularSlice(source.grammar, formIndex * 7, 10), "writing"),
  ];
  return [
    ...as(circularSlice(source.listening, formIndex * 17, 36), "listening"),
    ...as(circularSlice(source.vocabulary, formIndex * 9, 9), "listening"),
    ...as(circularSlice(source.reading, formIndex * 17, 36), "reading"),
    ...as(circularSlice(source.vocabulary, formIndex * 9 + 9, 4), "reading"),
    ...as(circularSlice(source.grammar, formIndex * 11, 15), "writing"),
  ];
};

const createStandardDefinition = (
  examLevel: HskMockExamLevel,
  formKey: HskMockExamFormKey,
): HskMockExamDefinition => {
  const formFamilyId = `hsk-mock-${examLevel}-${formKey}-standard`;
  const sections = standardSections[examLevel];
  const itemCount = sections.reduce((sum, section) => sum + section.itemCount, 0);
  const blueprint: AuthoritativeAssessmentBlueprint = {
    id: `hsk-mock-${examLevel}-${formKey}-v2`,
    formVersion: `${CONTENT_VERSION}:hsk-mock-${examLevel}-${formKey}:2`,
    formFamilyId,
    scoringPolicyVersion: "hsk-mock-standard-observed-server-v2",
    itemCount,
    skillTargets: Object.fromEntries(
      sections.map((section) => [section.skill, section.itemCount]),
    ),
    requiredReviewStatus: "approved",
  };
  return {
    examLevel,
    formKey,
    title: `${titleByLevel[examLevel]} · Cửa ${formKey.toUpperCase()}`,
    timeLimitMinutes: timeLimitByLevel[examLevel],
    contentVersion: CONTENT_VERSION,
    humanReviewed: false,
    browserTtsPracticeOnly: true,
    officialExam: false,
    certificationEligible: false,
    masteryEligible: false,
    prerequisiteUnlockEligible: false,
    legacy: false,
    standardStructure: true,
    sections,
    blueprint,
    bank: standardSourcePlan(examLevel, formKey).map(({ item, skill }) =>
      toMockItem(examLevel, formKey, formFamilyId, item, skill, 2)
    ),
  };
};

export type HskMockExamEditorialPublication = {
  stableKey: string;
  itemType?: string;
  level?: string;
  title: string;
  revision: number;
  revisionId: string;
  contentSha256: string;
  content: Record<string, unknown>;
};

const asEditorialSourceItem = (
  publication: HskMockExamEditorialPublication,
): { level: HskMockExamLevel; source: SourceItem } | null => {
  const content = publication.content;
  if (
    publication.itemType !== "exam_item"
    || !isHskMockExamLevel(publication.level)
    || !HSK_MOCK_EXAM_SKILLS.includes(content.skill as HskMockExamSkill)
    || typeof content.promptVi !== "string"
    || typeof content.explanationVi !== "string"
    || !Array.isArray(content.options)
    || content.options.length < 3
    || !content.options.every((option) => typeof option === "string" && option.trim())
    || !Number.isInteger(content.answerIndex)
    || Number(content.answerIndex) < 0
    || Number(content.answerIndex) >= content.options.length
    || !Array.isArray(content.sourceLessonIds)
    || typeof content.sourceLessonIds[0] !== "string"
  ) return null;
  const stimulus = typeof content.passageHanzi === "string" && content.passageHanzi.trim()
    ? content.passageHanzi
    : typeof content.hanzi === "string"
      ? content.hanzi
      : "";
  if (!stimulus.trim()) return null;
  const skill = content.skill as HskMockExamSkill;
  return {
    level: publication.level,
    source: {
      id: publication.revisionId,
      sourceItemVersion: publication.revisionId,
      skill,
      construct: `studio-${skill}`,
      promptVi: content.promptVi,
      stimulusText: stimulus,
      syntheticTtsText: skill === "listening" ? stimulus : null,
      options: content.options.map((option, index) => ({
        optionId: `option-${index + 1}`,
        text: String(option),
      })),
      correctOptionId: `option-${Number(content.answerIndex) + 1}`,
      explanationVi: content.explanationVi,
      sourceLessonId: content.sourceLessonIds[0],
    },
  };
};

const editorialSourcePlan = (
  level: HskMockExamLevel,
  formKey: HskMockExamFormKey,
  publications: readonly HskMockExamEditorialPublication[],
) => {
  const plan = standardSourcePlan(level, formKey).map((entry) => ({ ...entry }));
  const custom = publications
    .map(asEditorialSourceItem)
    .filter((entry): entry is NonNullable<typeof entry> => entry?.level === level)
    .sort((left, right) => left.source.sourceItemVersion.localeCompare(
      right.source.sourceItemVersion,
    ));
  const claimed = new Set<number>();
  const formOffset = HSK_MOCK_EXAM_FORMS.indexOf(formKey);
  for (const [customIndex, entry] of custom.entries()) {
    const start = (formOffset + customIndex) % plan.length;
    const position = Array.from({ length: plan.length }, (_value, offset) =>
      (start + offset) % plan.length
    ).find((index) => !claimed.has(index) && (
      plan[index]!.item.skill === entry.source.skill
      || plan[index]!.skill === entry.source.skill
    ));
    if (position === undefined) continue;
    plan[position] = { ...plan[position]!, item: entry.source };
    claimed.add(position);
  }
  return plan;
};

const projectedSkillAtPosition = (
  sections: HskMockExamDefinition["sections"],
  position: number,
) => {
  let offset = 0;
  for (const section of sections) {
    offset += section.itemCount;
    if (position < offset) return section.skill;
  }
  return null;
};

export const createEditorialHskMockExamDefinition = (
  publication: HskMockExamEditorialPublication,
  editorialItems: readonly HskMockExamEditorialPublication[] = [],
): HskMockExamDefinition | null => {
  const { content } = publication;
  if (
    !isHskMockExamLevel(content.examLevel)
    || !isHskMockExamFormKey(content.formKey)
  ) return null;
  const examLevel = content.examLevel;
  const formKey = content.formKey.toLowerCase() as HskMockExamFormKey;
  if (HSK_BUILT_IN_EXAM_FORM_KEYS.includes(
    formKey as typeof HSK_BUILT_IN_EXAM_FORM_KEYS[number],
  )) return null;
  const sections = standardSections[examLevel];
  const expectedItemCount = sections.reduce(
    (sum, section) => sum + section.itemCount,
    0,
  );
  const coverage = content.coverage;
  const hasExactCoverage = coverage !== null
    && typeof coverage === "object"
    && sections.every((section) =>
      (coverage as Record<string, unknown>)[section.skill] === section.itemCount
    )
    && Number((coverage as Record<string, unknown>).writing ?? 0) === (
      sections.find((section) => section.skill === "writing")?.itemCount ?? 0
    )
    && Object.keys(coverage as Record<string, unknown>).every((skill) =>
      skill === "listening" || skill === "reading" || skill === "writing"
    );
  if (
    content.timeLimitMinutes !== timeLimitByLevel[examLevel]
    || !hasExactCoverage
    || !Array.isArray(content.itemStableKeys)
    || content.itemStableKeys.length !== expectedItemCount
    || !content.itemStableKeys.every((key) => typeof key === "string")
    || new Set(content.itemStableKeys).size !== expectedItemCount
  ) return null;
  const sourceIndex = new Map<string, SourceItem>();
  for (const source of sourceByLevel[examLevel]) {
    sourceIndex.set(source.id, source);
    sourceIndex.set(source.sourceItemVersion, source);
  }
  for (const entry of editorialItems.map(asEditorialSourceItem)) {
    if (!entry || entry.level !== examLevel) continue;
    sourceIndex.set(entry.source.id, entry.source);
    sourceIndex.set(entry.source.sourceItemVersion, entry.source);
  }
  const selected = content.itemStableKeys.map((key) => sourceIndex.get(String(key)));
  if (selected.some((item) => !item)) return null;
  const formFamilyId = `hsk-mock-editorial-${publication.stableKey}`;
  const blueprint: AuthoritativeAssessmentBlueprint = {
    id: `hsk-mock-editorial-${publication.revisionId}`,
    formVersion: `${CONTENT_VERSION}:hsk-mock-editorial:${publication.revisionId}:${publication.contentSha256}`,
    formFamilyId,
    scoringPolicyVersion: "hsk-mock-standard-observed-server-v2",
    itemCount: expectedItemCount,
    skillTargets: Object.fromEntries(
      sections.map((section) => [section.skill, section.itemCount]),
    ),
    requiredReviewStatus: "approved",
  };
  return {
    examLevel,
    formKey,
    title: publication.title,
    timeLimitMinutes: timeLimitByLevel[examLevel],
    contentVersion: CONTENT_VERSION,
    humanReviewed: false,
    browserTtsPracticeOnly: true,
    officialExam: false,
    certificationEligible: false,
    masteryEligible: false,
    prerequisiteUnlockEligible: false,
    legacy: false,
    standardStructure: true,
    sections,
    blueprint,
    bank: selected.map((item, position) => toMockItem(
      examLevel,
      formKey,
      formFamilyId,
      item!,
      projectedSkillAtPosition(sections, position) ?? "reading",
      publication.revision + 2,
    )),
  };
};

export type HskMockExamEditorialSuggestions = Record<
  HskMockExamLevel,
  Partial<Record<HskMockExamFormKey, readonly string[]>>
>;

export const hskMockExamEditorialSuggestions = (
  editorialItems: readonly HskMockExamEditorialPublication[] = [],
): HskMockExamEditorialSuggestions =>
  Object.fromEntries(HSK_MOCK_EXAM_LEVELS.map((level) => [
    level,
    Object.fromEntries(HSK_MOCK_EXAM_FORMS
      .filter((form) => !HSK_BUILT_IN_EXAM_FORM_KEYS.includes(
        form as typeof HSK_BUILT_IN_EXAM_FORM_KEYS[number],
      ))
      .map((form) => [
        form,
        editorialSourcePlan(level, form, editorialItems)
          .map(({ item }) => item.sourceItemVersion),
      ])),
  ])) as unknown as HskMockExamEditorialSuggestions;

const legacyTimeLimitByLevel: Record<HskMockExamLevel, number> = {
  hsk1: 18, hsk2: 22, hsk3: 28, hsk4: 35,
};

const createLegacyDefinition = (
  examLevel: HskMockExamLevel,
  formKey: HskMockExamFormKey,
): HskMockExamDefinition => {
  const formFamilyId = `hsk-mock-${examLevel}-${formKey}`;
  const sections = LEGACY_MOCK_EXAM_SKILLS.map((skill) => ({
    skill,
    label: skill,
    itemCount: 3,
    minutes: Math.floor(legacyTimeLimitByLevel[examLevel] / 4),
  }));
  const blueprint: AuthoritativeAssessmentBlueprint = {
    id: `${formFamilyId}-v1`,
    formVersion: `${CONTENT_VERSION}:${formFamilyId}:1`,
    formFamilyId,
    scoringPolicyVersion: "hsk-mock-observed-server-v1",
    itemCount: 12,
    skillTargets: { listening: 3, reading: 3, vocabulary: 3, grammar: 3 },
    requiredReviewStatus: "approved",
  };
  return {
    examLevel,
    formKey,
    title: `Luyện nhanh HSK${levelNumber(examLevel)} · Cửa ${formKey.toUpperCase()}`,
    timeLimitMinutes: legacyTimeLimitByLevel[examLevel],
    contentVersion: CONTENT_VERSION,
    humanReviewed: false,
    browserTtsPracticeOnly: true,
    officialExam: false,
    certificationEligible: false,
    masteryEligible: false,
    prerequisiteUnlockEligible: false,
    legacy: true,
    standardStructure: false,
    sections,
    blueprint,
    bank: legacySourceItemsForForm(examLevel, formKey).map((item) =>
      toMockItem(examLevel, formKey, formFamilyId, item)
    ),
  };
};

export const HSK_MOCK_EXAM_DEFINITIONS = HSK_MOCK_EXAM_LEVELS.flatMap(
  (level) => HSK_MOCK_EXAM_FORM_KEYS_BY_LEVEL[level].map((form) =>
    createStandardDefinition(level, form)
  ),
);

export const HSK_MOCK_EXAM_LEGACY_DEFINITIONS = HSK_MOCK_EXAM_LEVELS.flatMap(
  (level) => HSK_MOCK_EXAM_LEGACY_FORM_KEYS_BY_LEVEL[level].map((form) =>
    createLegacyDefinition(level, form)
  ),
);

export const HSK_MOCK_EXAM_PLAYABLE_ITEM_COUNTS = Object.fromEntries(
  HSK_MOCK_EXAM_LEVELS.map((level) => [
    level,
    HSK_MOCK_EXAM_DEFINITIONS
      .filter((definition) => definition.examLevel === level)
      .reduce((sum, definition) => sum + definition.blueprint.itemCount, 0),
  ]),
) as Record<HskMockExamLevel, number>;

export const isHskMockExamLevel = (value: unknown): value is HskMockExamLevel =>
  isHskExamLevel(value);

export const isHskMockExamFormKey = (
  value: unknown,
): value is HskMockExamFormKey => typeof value === "string"
  && isHskExamFormKey(value);

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

export const getLegacyHskMockExamDefinition = (
  level: unknown,
  form: unknown,
) => {
  if (!isHskMockExamLevel(level) || !isHskMockExamFormKey(form)) return null;
  const normalizedForm = form.toLowerCase() as HskMockExamFormKey;
  return HSK_MOCK_EXAM_LEGACY_DEFINITIONS.find((definition) =>
    definition.examLevel === level && definition.formKey === normalizedForm
  ) ?? null;
};

export const getHskMockExamDefinitionByBlueprint = (blueprintId: string) =>
  [...HSK_MOCK_EXAM_DEFINITIONS, ...HSK_MOCK_EXAM_LEGACY_DEFINITIONS]
    .find((definition) => definition.blueprint.id === blueprintId) ?? null;

export const validateHskMockExamDefinitions = (
  definitions: readonly HskMockExamDefinition[] = HSK_MOCK_EXAM_DEFINITIONS,
) => {
  const errors: string[] = [];
  const lessonIds = runtimeLessonIds;
  const expectedFormCount = Object.values(HSK_MOCK_EXAM_FORM_KEYS_BY_LEVEL)
    .reduce((sum, forms) => sum + forms.length, 0);
  if (definitions.length !== expectedFormCount) {
    errors.push(`Mock Exam phải có đúng ${expectedFormCount} cửa.`);
  }
  const formIds = new Set<string>();
  const itemVersions = new Set<string>();
  for (const definition of definitions) {
    const formId = `${definition.examLevel}:${definition.formKey}`;
    if (formIds.has(formId)) errors.push(`Trùng form ${formId}.`);
    formIds.add(formId);
    const expectedSections = standardSections[definition.examLevel];
    const expectedItemCount = expectedSections
      .reduce((sum, section) => sum + section.itemCount, 0);
    if (
      definition.legacy
      || !definition.standardStructure
      || definition.timeLimitMinutes !== timeLimitByLevel[definition.examLevel]
      || definition.bank.length !== expectedItemCount
      || definition.blueprint.itemCount !== expectedItemCount
    ) {
      errors.push(`${formId} không khớp quy mô/thời lượng cấu trúc HSK.`);
    }
    for (const section of expectedSections) {
      if (definition.bank.filter((item) => item.skill === section.skill).length
          !== section.itemCount) {
        const skill = section.skill;
        errors.push(`${formId} thiếu coverage ${skill}.`);
      }
    }
    const sourceItemVersions = new Set<string>();
    for (const item of definition.bank) {
      if (itemVersions.has(item.itemVersion)) errors.push(`Trùng ${item.itemVersion}.`);
      if (sourceItemVersions.has(item.sourceItemVersion)) {
        errors.push(`${formId} lặp câu nguồn ${item.sourceItemVersion}.`);
      }
      itemVersions.add(item.itemVersion);
      sourceItemVersions.add(item.sourceItemVersion);
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
    for (const form of HSK_MOCK_EXAM_FORM_KEYS_BY_LEVEL[level]) {
      if (!formIds.has(`${level}:${form}`)) errors.push(`Thiếu ${level}:${form}.`);
    }
  }
  return { ok: errors.length === 0, errors } as const;
};

const validation = validateHskMockExamDefinitions();
if (!validation.ok) {
  throw new Error(`HSK Mock Exam bank invalid:\n${validation.errors.join("\n")}`);
}

if (HSK_MOCK_EXAM_LEGACY_DEFINITIONS.some((definition) =>
  !definition.legacy
  || definition.bank.length !== 12
  || definition.blueprint.itemCount !== 12
  || LEGACY_MOCK_EXAM_SKILLS.some((skill) =>
    definition.bank.filter((item) => item.skill === skill).length !== 3
  )
)) throw new Error("Legacy HSK Mock Exam resume bank is invalid.");
