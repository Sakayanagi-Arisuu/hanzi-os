import type { Skill } from "../types";
import type { StartingLevel } from "../learning/startingLevels";

export type HskLearningPathId = "hsk0" | "hsk1" | "hsk2" | "hsk3" | "hsk4";

export type HskActivityMode =
  | "tone-discrimination"
  | "shadowing"
  | "micro-dialogue"
  | "controlled-recall"
  | "sentence-building"
  | "short-dictation"
  | "graded-reading"
  | "paragraph-dictation"
  | "guided-writing"
  | "paraphrase"
  | "summary"
  | "structured-speaking"
  | "timed-mock";

export type HskPathExitEvidence = {
  skill: Skill;
  evidenceKind: "objective-items" | "reviewed-rubric";
  minimumAttempts: number;
  minimumObservedAccuracy: number;
};

export type HskLearningPath = {
  id: HskLearningPathId;
  startingLevel: Exclude<StartingLevel, "basic">;
  stageIndex: 0 | 1 | 2 | 3 | 4;
  officialExamLevel: 1 | 2 | 3 | 4 | null;
  label: string;
  title: string;
  description: string;
  availability: "foundation" | "planned";
  availabilityNote: string;
  skillWeights: Record<Skill, number>;
  activityModes: readonly HskActivityMode[];
  exitEvidence: readonly HskPathExitEvidence[];
  assessmentMode:
    | "phonology-diagnostic"
    | "level-check"
    | "level-check-and-timed-mock";
};

export const HSK_LEARNING_PATHS = [
  {
    id: "hsk0",
    startingLevel: "zero",
    stageIndex: 0,
    officialExamLevel: null,
    label: "HSK0 · Từ số 0",
    title: "Khởi âm và sinh tồn",
    description:
      "Pinyin, khẩu hình, nghe-phân biệt, thanh điệu và những lượt thoại đầu tiên.",
    availability: "foundation",
    availabilityNote:
      "Foundation hiện có một phần bootcamp; coverage HSK0 đầy đủ đang được mở rộng.",
    skillWeights: {
      pronunciation: 0.28,
      listening: 0.24,
      speaking: 0.18,
      reading: 0.08,
      writing: 0.04,
      vocabulary: 0.1,
      grammar: 0.08,
    },
    activityModes: [
      "tone-discrimination",
      "shadowing",
      "micro-dialogue",
      "controlled-recall",
    ],
    exitEvidence: [
      { skill: "pronunciation", evidenceKind: "reviewed-rubric", minimumAttempts: 24, minimumObservedAccuracy: 80 },
      { skill: "listening", evidenceKind: "objective-items", minimumAttempts: 24, minimumObservedAccuracy: 80 },
      { skill: "speaking", evidenceKind: "reviewed-rubric", minimumAttempts: 12, minimumObservedAccuracy: 75 },
    ],
    assessmentMode: "phonology-diagnostic",
  },
  {
    id: "hsk1",
    startingLevel: "hsk1",
    stageIndex: 1,
    officialExamLevel: 1,
    label: "HSK1 · Sơ cấp I",
    title: "Câu ngắn và giao tiếp cá nhân",
    description:
      "Từ và câu tần suất cao, hỏi đáp cá nhân, thời gian, số lượng và đọc câu.",
    availability: "foundation",
    availabilityNote:
      "40 bài local đã phủ inventory HSK1; level check vẫn là tự kiểm tra chưa hiệu chuẩn, không phải chứng nhận HSK.",
    skillWeights: {
      pronunciation: 0.14,
      listening: 0.2,
      speaking: 0.16,
      reading: 0.16,
      writing: 0.08,
      vocabulary: 0.16,
      grammar: 0.1,
    },
    activityModes: [
      "micro-dialogue",
      "controlled-recall",
      "sentence-building",
      "short-dictation",
    ],
    exitEvidence: [
      { skill: "listening", evidenceKind: "objective-items", minimumAttempts: 40, minimumObservedAccuracy: 80 },
      { skill: "reading", evidenceKind: "objective-items", minimumAttempts: 40, minimumObservedAccuracy: 80 },
      { skill: "vocabulary", evidenceKind: "objective-items", minimumAttempts: 60, minimumObservedAccuracy: 85 },
    ],
    assessmentMode: "level-check",
  },
  {
    id: "hsk2",
    startingLevel: "hsk2",
    stageIndex: 2,
    officialExamLevel: 2,
    label: "HSK2 · Sơ cấp II",
    title: "Đời sống và chuỗi câu",
    description:
      "Hội thoại tình huống, aspect và bổ ngữ nền, sentence building và dictation ngắn.",
    availability: "foundation",
    availabilityNote:
      "40 bài local đã phủ inventory HSK2; level check 60 câu vẫn là tự kiểm tra chưa hiệu chuẩn, không phải chứng nhận HSK.",
    skillWeights: {
      pronunciation: 0.08,
      listening: 0.19,
      speaking: 0.13,
      reading: 0.2,
      writing: 0.12,
      vocabulary: 0.16,
      grammar: 0.12,
    },
    activityModes: [
      "micro-dialogue",
      "sentence-building",
      "short-dictation",
      "graded-reading",
    ],
    exitEvidence: [
      { skill: "listening", evidenceKind: "objective-items", minimumAttempts: 60, minimumObservedAccuracy: 80 },
      { skill: "reading", evidenceKind: "objective-items", minimumAttempts: 60, minimumObservedAccuracy: 80 },
      { skill: "grammar", evidenceKind: "objective-items", minimumAttempts: 45, minimumObservedAccuracy: 80 },
      { skill: "writing", evidenceKind: "reviewed-rubric", minimumAttempts: 24, minimumObservedAccuracy: 75 },
    ],
    assessmentMode: "level-check",
  },
  {
    id: "hsk3",
    startingLevel: "hsk3",
    stageIndex: 3,
    officialExamLevel: 3,
    label: "HSK3 · Trung cấp I",
    title: "Đoạn văn và tường thuật",
    description:
      "Đọc/nghe đoạn, kể lại, dictation, grammar production và viết đoạn có hướng dẫn.",
    availability: "foundation",
    availabilityNote:
      "55 bài local đã phủ inventory HSK3; level check 54 câu vẫn là tự kiểm tra chưa hiệu chuẩn, không phải chứng nhận HSK.",
    skillWeights: {
      pronunciation: 0.05,
      listening: 0.2,
      speaking: 0.11,
      reading: 0.22,
      writing: 0.15,
      vocabulary: 0.14,
      grammar: 0.13,
    },
    activityModes: [
      "graded-reading",
      "paragraph-dictation",
      "guided-writing",
      "structured-speaking",
    ],
    exitEvidence: [
      { skill: "listening", evidenceKind: "objective-items", minimumAttempts: 80, minimumObservedAccuracy: 80 },
      { skill: "reading", evidenceKind: "objective-items", minimumAttempts: 80, minimumObservedAccuracy: 80 },
      { skill: "writing", evidenceKind: "reviewed-rubric", minimumAttempts: 40, minimumObservedAccuracy: 75 },
      { skill: "grammar", evidenceKind: "objective-items", minimumAttempts: 60, minimumObservedAccuracy: 80 },
    ],
    assessmentMode: "level-check",
  },
  {
    id: "hsk4",
    startingLevel: "hsk4",
    stageIndex: 4,
    officialExamLevel: 4,
    label: "HSK4 · Trung cấp II",
    title: "Đọc sâu, tóm tắt và lập luận",
    description:
      "Văn bản dài hơn, chủ đề xã hội, paraphrase, tóm tắt, viết/nói có cấu trúc và timed mock.",
    availability: "foundation",
    availabilityNote:
      "78 bài local đã phủ inventory HSK4; level check 72 câu vẫn là tự kiểm tra chưa hiệu chuẩn, không phải chứng nhận HSK.",
    skillWeights: {
      pronunciation: 0.04,
      listening: 0.2,
      speaking: 0.1,
      reading: 0.24,
      writing: 0.18,
      vocabulary: 0.11,
      grammar: 0.13,
    },
    activityModes: [
      "graded-reading",
      "paraphrase",
      "summary",
      "structured-speaking",
      "timed-mock",
    ],
    exitEvidence: [
      { skill: "listening", evidenceKind: "objective-items", minimumAttempts: 100, minimumObservedAccuracy: 80 },
      { skill: "reading", evidenceKind: "objective-items", minimumAttempts: 100, minimumObservedAccuracy: 80 },
      { skill: "writing", evidenceKind: "reviewed-rubric", minimumAttempts: 60, minimumObservedAccuracy: 75 },
      { skill: "speaking", evidenceKind: "reviewed-rubric", minimumAttempts: 40, minimumObservedAccuracy: 75 },
    ],
    assessmentMode: "level-check-and-timed-mock",
  },
] as const satisfies readonly HskLearningPath[];

const HSK_PATH_BY_STARTING_LEVEL = new Map<StartingLevel, HskLearningPath>([
  ["zero", HSK_LEARNING_PATHS[0]],
  ["basic", HSK_LEARNING_PATHS[1]],
  ["hsk1", HSK_LEARNING_PATHS[1]],
  ["hsk2", HSK_LEARNING_PATHS[2]],
  ["hsk3", HSK_LEARNING_PATHS[3]],
  ["hsk4", HSK_LEARNING_PATHS[4]],
]);

export const HSK_STARTING_LEVEL_OPTIONS = HSK_LEARNING_PATHS.map((path) => ({
  id: path.startingLevel,
  title: path.label,
  description: path.description,
}));

export const getHskLearningPath = (startingLevel: StartingLevel) =>
  HSK_PATH_BY_STARTING_LEVEL.get(startingLevel) ?? HSK_LEARNING_PATHS[0];
