import sourceBankJson from "../../content/drafts/hsk2-level-assessment-2026.07.json";
import blueprintJson from "../../content/drafts/hsk2-lesson-blueprints-2026.07.json";
import localReviewJson from "../../content/review/hsk2-level-batch-local-study-review.json";
import { CONTENT_VERSION } from "./curriculum";

export type Hsk2LevelCheckSkill =
  | "listening"
  | "reading"
  | "vocabulary"
  | "grammar";

type SourceOption = {
  optionId: string;
  text: string;
};

type SourceItem = {
  itemId: string;
  itemVersion: string;
  formId: string;
  sectionId: string;
  skill: Hsk2LevelCheckSkill | "speaking" | "writing";
  construct: string;
  promptVi: string;
  source: {
    entityId: string;
    lessonId: string;
  };
  stimulus: {
    text?: string;
    transcriptHanzi?: string;
    transcriptPinyin?: string;
    pinyinAuthoringReference?: string;
    officialGrammarContentAuthoringReference?: string;
  };
  options?: SourceOption[];
  correctOptionId?: string;
  measurementEligible: boolean;
  masteryEligible: boolean;
  prerequisiteWaiverEligible: boolean;
};

type SourceBank = {
  schemaVersion: number;
  bankId: string;
  forms: Array<{
    formId: string;
    sections: Array<{
      sectionId: string;
      itemIds: string[];
    }>;
  }>;
  items: SourceItem[];
};

type BlueprintCollection = {
  lessons: Array<{
    lessonId: string;
    unitId: string;
  }>;
};

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

const sourceBank = sourceBankJson as unknown as SourceBank;
const blueprints = blueprintJson as unknown as BlueprintCollection;
const unitByLessonId = new Map(blueprints.lessons.map((lesson) => [
  lesson.lessonId,
  lesson.unitId,
]));
const objectiveIds = new Set(sourceBank.forms.find(
  (form) => form.formId === "hsk2-level-form-a",
)?.sections.filter((section) => section.sectionId.endsWith("-objective"))
  .flatMap((section) => section.itemIds) ?? []);

const explanationFor = (item: SourceItem, correct: SourceOption) => {
  const hanzi = item.stimulus.transcriptHanzi ?? item.stimulus.text ?? "";
  const pinyin = item.stimulus.transcriptPinyin
    ?? item.stimulus.pinyinAuthoringReference;
  const grammar = item.stimulus.officialGrammarContentAuthoringReference;
  if (item.skill === "listening") {
    return `Bạn vừa nghe “${hanzi}”${pinyin ? ` (${pinyin})` : ""}. Nghĩa phù hợp là “${correct.text}”.`;
  }
  if (item.skill === "vocabulary") {
    return `“${hanzi}”${pinyin ? ` đọc là ${pinyin}` : ""}; nghĩa phù hợp trong HSK2 là “${correct.text}”.`;
  }
  if (item.skill === "grammar") {
    return `Câu “${hanzi}”${pinyin ? ` (${pinyin})` : ""}${grammar ? ` minh họa điểm ${grammar}` : ""}; nghĩa phù hợp là “${correct.text}”.`;
  }
  return `Đoạn “${hanzi}”${pinyin ? ` (${pinyin})` : ""} có nghĩa phù hợp là “${correct.text}”.`;
};

const projectItem = (item: SourceItem): Hsk2LevelCheckItem => {
  if (
    !["listening", "reading", "vocabulary", "grammar"].includes(item.skill)
    || !item.options
    || !item.correctOptionId
  ) {
    throw new Error(`${item.itemId} is not an objective HSK2 item`);
  }
  const correct = item.options.find((option) =>
    option.optionId === item.correctOptionId
  );
  const sourceUnitId = unitByLessonId.get(item.source.lessonId);
  if (!correct || !sourceUnitId) {
    throw new Error(`${item.itemId} has incomplete local-check context`);
  }
  const stimulusText = item.stimulus.transcriptHanzi
    ?? item.stimulus.text
    ?? "";
  const skill = item.skill as Hsk2LevelCheckSkill;
  return {
    id: item.itemId,
    sourceItemVersion: item.itemVersion,
    activityVersion: `${CONTENT_VERSION}:hsk2-level-check:${item.itemId}:1`,
    skill,
    construct: item.construct,
    promptVi: item.promptVi,
    stimulusText,
    pinyinReference: item.stimulus.transcriptPinyin
      ?? item.stimulus.pinyinAuthoringReference
      ?? null,
    syntheticTtsText: skill === "listening" ? stimulusText : null,
    options: item.options.map((option) => ({ ...option })),
    correctOptionId: item.correctOptionId,
    explanationVi: explanationFor(item, correct),
    sourceLessonId: item.source.lessonId,
    sourceUnitId,
    measurementEligible: false,
    masteryEligible: false,
    prerequisiteWaiverEligible: false,
  };
};

export const HSK2_LEVEL_CHECK_FORM_VERSION =
  `${CONTENT_VERSION}:hsk2-level-check-local-form-a:1`;
export const HSK2_LEVEL_CHECK_BANK_ID = sourceBank.bankId;
export const HSK2_LEVEL_CHECK_ITEMS = sourceBank.items
  .filter((item) => objectiveIds.has(item.itemId))
  .map(projectItem);

const skillCounts = Object.fromEntries(
  (["listening", "reading", "vocabulary", "grammar"] as const).map(
    (skill) => [
      skill,
      HSK2_LEVEL_CHECK_ITEMS.filter((item) => item.skill === skill).length,
    ],
  ),
) as Record<Hsk2LevelCheckSkill, number>;

if (
  sourceBank.schemaVersion !== 1
  || sourceBank.bankId !== "hsk2-level-assessment-2026.07"
  || (localReviewJson as { reviewer?: { humanReviewed?: boolean } })
    .reviewer?.humanReviewed !== false
  || (localReviewJson as { reviewResult?: { unresolvedIssueCount?: number } })
    .reviewResult?.unresolvedIssueCount !== 0
  || HSK2_LEVEL_CHECK_ITEMS.length !== 60
  || Object.values(skillCounts).some((count) => count !== 15)
  || HSK2_LEVEL_CHECK_ITEMS.some((item) =>
    item.options.length !== 4
    || new Set(item.options.map((option) => option.optionId)).size !== 4
    || item.stimulusText.length === 0
    || item.measurementEligible !== false
    || item.masteryEligible !== false
    || item.prerequisiteWaiverEligible !== false
  )
) {
  throw new Error("HSK2 local level-check projection is invalid");
}

export const HSK2_LEVEL_CHECK_SKILL_COUNTS = skillCounts;

export const HSK2_LEVEL_CHECK_DISCLOSURE = {
  reviewVi:
    "Nội dung đã được AI tự rà soát năm pass cho mục đích tự học local; humanReviewed=false.",
  listeningVi:
    "Phần nghe dùng giọng TTS tổng hợp của trình duyệt chỉ để luyện tập.",
  resultVi:
    "Kết quả chỉ mô tả độ chính xác quan sát, không cấp mastery, miễn prerequisite hay chứng nhận HSK.",
} as const;
