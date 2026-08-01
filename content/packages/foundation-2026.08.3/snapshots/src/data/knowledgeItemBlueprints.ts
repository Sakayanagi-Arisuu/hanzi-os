import type { ContentItemReference } from "../content/types";

type LessonDerivedKnowledgeBlueprint = {
  itemId: string;
  sourceLessonId: string;
  prerequisites: ContentItemReference[];
};

export type GrammarKnowledgeBlueprint = LessonDerivedKnowledgeBlueprint & {
  itemType: "grammar";
};

export type PronunciationKnowledgeBlueprint =
  LessonDerivedKnowledgeBlueprint & {
    itemType: "pronunciation";
    targetKind: "tone-system" | "initial-contrast" | "tone-sandhi";
    targets: string[];
  };

export type CommunicativeFunctionKnowledgeBlueprint =
  LessonDerivedKnowledgeBlueprint & {
    itemType: "communicative-function";
  };

export type CharacterKnowledgeBlueprint = {
  itemType: "character";
  itemId: string;
  sourceLexemeId: string;
  sourceLessonId: string;
  prerequisites: ContentItemReference[];
};

export type KnowledgeItemBlueprint =
  | GrammarKnowledgeBlueprint
  | PronunciationKnowledgeBlueprint
  | CommunicativeFunctionKnowledgeBlueprint
  | CharacterKnowledgeBlueprint;

const priorLesson = (itemId: string): ContentItemReference => ({
  itemType: "lesson",
  itemId,
});

export const KNOWLEDGE_ITEM_BLUEPRINTS: KnowledgeItemBlueprint[] = [
  {
    itemType: "pronunciation",
    itemId: "mandarin-tone-system",
    sourceLessonId: "boot-1",
    targetKind: "tone-system",
    targets: ["neutral", "1", "2", "3", "4"],
    prerequisites: [],
  },
  {
    itemType: "pronunciation",
    itemId: "initial-contrast-jqx-zhchsh-zcs",
    sourceLessonId: "boot-3",
    targetKind: "initial-contrast",
    targets: ["j/q/x", "zh/ch/sh", "z/c/s"],
    prerequisites: [priorLesson("boot-2")],
  },
  {
    itemType: "pronunciation",
    itemId: "sandhi-third-third",
    sourceLessonId: "boot-4",
    targetKind: "tone-sandhi",
    targets: ["3+3 -> 2+3"],
    prerequisites: [priorLesson("boot-3")],
  },
  {
    itemType: "pronunciation",
    itemId: "sandhi-bu-before-fourth",
    sourceLessonId: "boot-4",
    targetKind: "tone-sandhi",
    targets: ["bu4+4 -> 2+4"],
    prerequisites: [priorLesson("boot-3")],
  },
  {
    itemType: "pronunciation",
    itemId: "sandhi-yi-before-1-2-3",
    sourceLessonId: "boot-4",
    targetKind: "tone-sandhi",
    targets: ["yi1+1/2/3 -> 4+1/2/3"],
    prerequisites: [priorLesson("boot-3")],
  },
  {
    itemType: "grammar",
    itemId: "shi-nominal-predicate",
    sourceLessonId: "survival-1",
    prerequisites: [priorLesson("boot-4")],
  },
  {
    itemType: "grammar",
    itemId: "ma-polar-question",
    sourceLessonId: "survival-2",
    prerequisites: [priorLesson("survival-1")],
  },
  {
    itemType: "grammar",
    itemId: "you-quantity-ge",
    sourceLessonId: "daily-1",
    prerequisites: [priorLesson("survival-4")],
  },
  {
    itemType: "grammar",
    itemId: "time-expression-position",
    sourceLessonId: "daily-3",
    prerequisites: [priorLesson("daily-2")],
  },
  {
    itemType: "grammar",
    itemId: "de-possession",
    sourceLessonId: "daily-4",
    prerequisites: [priorLesson("daily-3")],
  },
  {
    itemType: "communicative-function",
    itemId: "greet-and-self-reference",
    sourceLessonId: "boot-2",
    prerequisites: [priorLesson("boot-1")],
  },
  {
    itemType: "communicative-function",
    itemId: "introduce-and-deny-role",
    sourceLessonId: "survival-1",
    prerequisites: [priorLesson("boot-4")],
  },
  {
    itemType: "communicative-function",
    itemId: "ask-and-answer-polar-question",
    sourceLessonId: "survival-2",
    prerequisites: [priorLesson("survival-1")],
  },
  {
    itemType: "communicative-function",
    itemId: "thank-and-close-turn",
    sourceLessonId: "survival-3",
    prerequisites: [priorLesson("survival-2")],
  },
  {
    itemType: "communicative-function",
    itemId: "state-nationality-and-origin",
    sourceLessonId: "survival-4",
    prerequisites: [priorLesson("survival-3")],
  },
  {
    itemType: "communicative-function",
    itemId: "state-and-ask-family-size",
    sourceLessonId: "daily-1",
    prerequisites: [priorLesson("survival-4")],
  },
  {
    itemType: "communicative-function",
    itemId: "state-and-ask-food-drink",
    sourceLessonId: "daily-2",
    prerequisites: [priorLesson("daily-1")],
  },
  {
    itemType: "communicative-function",
    itemId: "identify-possession",
    sourceLessonId: "daily-4",
    prerequisites: [priorLesson("daily-3")],
  },
  {
    itemType: "character",
    itemId: "u4e00",
    sourceLexemeId: "yi",
    sourceLessonId: "characters-1",
    prerequisites: [priorLesson("daily-4")],
  },
  {
    itemType: "character",
    itemId: "u4e8c",
    sourceLexemeId: "er",
    sourceLessonId: "characters-1",
    prerequisites: [priorLesson("daily-4")],
  },
  {
    itemType: "character",
    itemId: "u4e09",
    sourceLexemeId: "san",
    sourceLessonId: "characters-1",
    prerequisites: [priorLesson("daily-4")],
  },
  {
    itemType: "character",
    itemId: "u4eba",
    sourceLexemeId: "ren",
    sourceLessonId: "characters-1",
    prerequisites: [priorLesson("daily-4")],
  },
  {
    itemType: "character",
    itemId: "u4f60",
    sourceLexemeId: "ni",
    sourceLessonId: "characters-2",
    prerequisites: [priorLesson("characters-1")],
  },
  {
    itemType: "character",
    itemId: "u597d",
    sourceLexemeId: "hao",
    sourceLessonId: "characters-2",
    prerequisites: [priorLesson("characters-1")],
  },
  {
    itemType: "character",
    itemId: "u5bb6",
    sourceLexemeId: "jia",
    sourceLessonId: "characters-2",
    prerequisites: [priorLesson("characters-1")],
  },
];
