import sourceBankJson from "../../content/drafts/hsk1-level-check-items-2026.07.json";
import { CONTENT_VERSION } from "./curriculum";

export type Hsk1LevelCheckSkill =
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
  skill: Hsk1LevelCheckSkill;
  construct: string;
  promptVi: string;
  source: {
    entityId: string;
    lessonId: string;
    unitId: string;
  };
  stimulus: {
    text?: string;
    transcriptHanzi?: string;
    transcriptPinyin?: string;
    pinyinAuthoringReference?: string;
    officialGrammarContentAuthoringReference?: string;
  };
  options: SourceOption[];
  correctOptionId: string;
  measurementEligible: boolean;
  masteryEligible: boolean;
  prerequisiteWaiverEligible: boolean;
};

type SourceBank = {
  schemaVersion: number;
  bankId: string;
  blueprintId: string;
  items: SourceItem[];
};

export type Hsk1LevelCheckItem = {
  id: string;
  sourceItemVersion: string;
  activityVersion: string;
  skill: Hsk1LevelCheckSkill;
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

const explanationFor = (item: SourceItem, correct: SourceOption) => {
  const hanzi = item.stimulus.transcriptHanzi ?? item.stimulus.text ?? "";
  const pinyin = item.stimulus.transcriptPinyin
    ?? item.stimulus.pinyinAuthoringReference;
  const grammar = item.stimulus.officialGrammarContentAuthoringReference;
  if (item.skill === "listening") {
    return `Bạn vừa nghe “${hanzi}”${pinyin ? ` (${pinyin})` : ""}. Nghĩa phù hợp là “${correct.text}”.`;
  }
  if (item.skill === "vocabulary") {
    return `“${hanzi}”${pinyin ? ` đọc là ${pinyin}` : ""}; nghĩa phù hợp trong HSK1 là “${correct.text}”.`;
  }
  if (item.skill === "grammar") {
    return `Câu “${hanzi}”${pinyin ? ` (${pinyin})` : ""}${grammar ? ` minh họa điểm ${grammar}` : ""}; nghĩa phù hợp là “${correct.text}”.`;
  }
  return `Câu “${hanzi}”${pinyin ? ` (${pinyin})` : ""} có nghĩa phù hợp là “${correct.text}”.`;
};

const projectItem = (item: SourceItem): Hsk1LevelCheckItem => {
  const correct = item.options.find((option) =>
    option.optionId === item.correctOptionId
  );
  if (!correct) throw new Error(`${item.itemId} has no valid answer`);
  const listening = item.skill === "listening";
  const stimulusText = item.stimulus.transcriptHanzi
    ?? item.stimulus.text
    ?? "";
  return {
    id: item.itemId,
    sourceItemVersion: item.itemVersion,
    activityVersion: `${CONTENT_VERSION}:hsk1-level-check:${item.itemId}:1`,
    skill: item.skill,
    construct: item.construct,
    promptVi: item.promptVi,
    stimulusText,
    pinyinReference: item.stimulus.transcriptPinyin
      ?? item.stimulus.pinyinAuthoringReference
      ?? null,
    syntheticTtsText: listening ? stimulusText : null,
    options: item.options.map((option) => ({ ...option })),
    correctOptionId: item.correctOptionId,
    explanationVi: explanationFor(item, correct),
    sourceLessonId: item.source.lessonId,
    sourceUnitId: item.source.unitId,
    measurementEligible: false,
    masteryEligible: false,
    prerequisiteWaiverEligible: false,
  };
};

export const HSK1_LEVEL_CHECK_FORM_VERSION =
  `${CONTENT_VERSION}:hsk1-level-check-local:1`;
export const HSK1_LEVEL_CHECK_BANK_ID = sourceBank.bankId;
export const HSK1_LEVEL_CHECK_ITEMS = sourceBank.items.map(projectItem);

const skillCounts = Object.fromEntries(
  (["listening", "reading", "vocabulary", "grammar"] as const).map(
    (skill) => [
      skill,
      HSK1_LEVEL_CHECK_ITEMS.filter((item) => item.skill === skill).length,
    ],
  ),
) as Record<Hsk1LevelCheckSkill, number>;

if (
  sourceBank.schemaVersion !== 1
  || sourceBank.blueprintId !== "hsk1-level-check-2026.07"
  || HSK1_LEVEL_CHECK_ITEMS.length !== 50
  || skillCounts.listening !== 15
  || skillCounts.reading !== 15
  || skillCounts.vocabulary !== 10
  || skillCounts.grammar !== 10
  || HSK1_LEVEL_CHECK_ITEMS.some((item) =>
    item.options.length !== 4
    || new Set(item.options.map((option) => option.optionId)).size !== 4
    || item.stimulusText.length === 0
    || item.measurementEligible !== false
    || item.masteryEligible !== false
    || item.prerequisiteWaiverEligible !== false
  )
) {
  throw new Error("HSK1 local level-check projection is invalid");
}

export const HSK1_LEVEL_CHECK_SKILL_COUNTS = skillCounts;

export const HSK1_LEVEL_CHECK_DISCLOSURE = {
  reviewVi:
    "Nội dung đã được AI tự rà soát năm pass; humanReviewed=false.",
  listeningVi:
    "Phần nghe dùng giọng TTS tổng hợp của trình duyệt chỉ để luyện tập.",
  resultVi:
    "Kết quả chỉ mô tả độ chính xác quan sát, không cấp mastery, miễn prerequisite hay chứng nhận HSK.",
} as const;
