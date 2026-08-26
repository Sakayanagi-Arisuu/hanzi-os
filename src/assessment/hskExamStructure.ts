export const HSK_EXAM_LEVELS = ["hsk1", "hsk2", "hsk3", "hsk4"] as const;

export const HSK_EXAM_FORM_KEYS = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l",
] as const;

export type HskExamLevel = typeof HSK_EXAM_LEVELS[number];
export type HskExamFormKey = typeof HSK_EXAM_FORM_KEYS[number];
export type HskStandardExamSkill = "listening" | "reading" | "writing";

export type HskStandardExamSection = {
  skill: HskStandardExamSkill;
  label: string;
  itemCount: number;
  minutes: number;
};

export type HskStandardExamStructure = {
  timeLimitMinutes: number;
  sections: readonly HskStandardExamSection[];
};

export const HSK_BUILT_IN_EXAM_FORM_KEYS = [
  "a", "b", "c", "d", "e", "f",
] as const satisfies readonly HskExamFormKey[];

/**
 * Product-wide HSK1-4 simulated-exam contract. Keep learner catalog, runner,
 * validators and Studio authoring on this single source of truth.
 */
export const HSK_STANDARD_EXAM_STRUCTURE = {
  hsk1: {
    timeLimitMinutes: 40,
    sections: [
      { skill: "listening", label: "Nghe hiểu", itemCount: 20, minutes: 15 },
      { skill: "reading", label: "Đọc hiểu", itemCount: 20, minutes: 17 },
    ],
  },
  hsk2: {
    timeLimitMinutes: 55,
    sections: [
      { skill: "listening", label: "Nghe hiểu", itemCount: 35, minutes: 25 },
      { skill: "reading", label: "Đọc hiểu", itemCount: 25, minutes: 22 },
    ],
  },
  hsk3: {
    timeLimitMinutes: 90,
    sections: [
      { skill: "listening", label: "Nghe hiểu", itemCount: 40, minutes: 35 },
      { skill: "reading", label: "Đọc hiểu", itemCount: 30, minutes: 30 },
      { skill: "writing", label: "Viết", itemCount: 10, minutes: 15 },
    ],
  },
  hsk4: {
    timeLimitMinutes: 105,
    sections: [
      { skill: "listening", label: "Nghe hiểu", itemCount: 45, minutes: 30 },
      { skill: "reading", label: "Đọc hiểu", itemCount: 40, minutes: 40 },
      { skill: "writing", label: "Viết", itemCount: 15, minutes: 25 },
    ],
  },
} as const satisfies Record<HskExamLevel, HskStandardExamStructure>;

export const hskStandardItemCount = (level: HskExamLevel) =>
  HSK_STANDARD_EXAM_STRUCTURE[level].sections.reduce(
    (sum, section) => sum + section.itemCount,
    0,
  );

export const isHskExamLevel = (value: unknown): value is HskExamLevel =>
  typeof value === "string"
  && HSK_EXAM_LEVELS.includes(value as HskExamLevel);

export const isHskExamFormKey = (value: unknown): value is HskExamFormKey =>
  typeof value === "string"
  && HSK_EXAM_FORM_KEYS.includes(value.toLowerCase() as HskExamFormKey);
