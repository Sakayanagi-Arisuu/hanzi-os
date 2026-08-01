import localBankJson from "../../content/runtime/hsk2-level-check-local.json";
import { CONTENT_VERSION } from "./contentIdentity";

export type Hsk2LevelCheckSkill =
  | "listening"
  | "reading"
  | "vocabulary"
  | "grammar";

type SourceOption = { optionId: string; text: string };
export type Hsk2LevelCheckItem = {
  id: string;
  sourceItemVersion: string;
  activityVersion: string;
  skill: Hsk2LevelCheckSkill;
  construct: string;
  promptVi: string;
  stimulusText: string;
  pinyinReference: string | null;
  syntheticTtsText: string | null;
  options: SourceOption[];
  correctOptionId: string;
  explanationVi: string;
  sourceLessonId: string;
  sourceUnitId: string;
  measurementEligible: false;
  masteryEligible: false;
  prerequisiteWaiverEligible: false;
};

type LocalBank = {
  schemaVersion: number;
  bankId: string;
  formId: string;
  contentVersion: string;
  state: string;
  disclosure: {
    humanReviewed: boolean;
    browserTtsPracticeOnly: boolean;
    measurementEligible: boolean;
    masteryEligible: boolean;
    prerequisiteWaiverEligible: boolean;
  };
  counts: Record<Hsk2LevelCheckSkill, number> & { items: number };
  items: Array<Omit<Hsk2LevelCheckItem, "activityVersion">>;
};

const localBank = localBankJson as unknown as LocalBank;
export const HSK2_LEVEL_CHECK_FORM_VERSION =
  `${CONTENT_VERSION}:hsk2-level-check-local-form-a:1`;
export const HSK2_LEVEL_CHECK_BANK_ID = localBank.bankId;
export const HSK2_LEVEL_CHECK_ITEMS: Hsk2LevelCheckItem[] = localBank.items.map(
  (item) => ({
    ...item,
    activityVersion: `${CONTENT_VERSION}:hsk2-level-check:${item.id}:1`,
  }),
);

if (
  localBank.schemaVersion !== 1
  || localBank.bankId !== "hsk2-level-assessment-2026.07"
  || localBank.formId !== "hsk2-level-form-a"
  || localBank.contentVersion !== CONTENT_VERSION
  || localBank.state !== "ai-reviewed-for-personal-local-self-check"
  || localBank.disclosure.humanReviewed !== false
  || localBank.disclosure.browserTtsPracticeOnly !== true
  || localBank.disclosure.measurementEligible !== false
  || localBank.disclosure.masteryEligible !== false
  || localBank.disclosure.prerequisiteWaiverEligible !== false
  || localBank.counts.items !== 60
  || localBank.counts.listening !== 15
  || localBank.counts.reading !== 15
  || localBank.counts.vocabulary !== 15
  || localBank.counts.grammar !== 15
  || HSK2_LEVEL_CHECK_ITEMS.some((item) =>
    item.options.length !== 4
    || new Set(item.options.map((option) => option.optionId)).size !== 4
    || !item.stimulusText
    || item.measurementEligible !== false
    || item.masteryEligible !== false
    || item.prerequisiteWaiverEligible !== false
  )
) throw new Error("HSK2 local level-check projection is invalid");

export const HSK2_LEVEL_CHECK_SKILL_COUNTS = {
  listening: localBank.counts.listening,
  reading: localBank.counts.reading,
  vocabulary: localBank.counts.vocabulary,
  grammar: localBank.counts.grammar,
} satisfies Record<Hsk2LevelCheckSkill, number>;

export const HSK2_LEVEL_CHECK_DISCLOSURE = {
  reviewVi:
    "Nội dung đã được AI tự rà soát năm pass cho mục đích tự học local; humanReviewed=false.",
  listeningVi:
    "Phần nghe dùng giọng TTS tổng hợp của trình duyệt chỉ để luyện tập.",
  resultVi:
    "Kết quả chỉ mô tả độ chính xác quan sát, không cấp mastery, miễn prerequisite hay chứng nhận HSK.",
} as const;
