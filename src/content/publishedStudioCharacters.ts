import { RELEASED_LESSONS } from "../data/curriculum";
import type { ReleasedCharacterPracticeEntry } from "../learning/richLessonContent";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";
import {
  publishedRuntimeHeader,
  publishedRuntimeItems,
  runtimeReviewPassed,
  runtimeText,
  runtimeTriple,
  type PublishedStudioLevel,
  type PublishedStudioTriple,
} from "./publishedStudioRuntimeContract";

export type PublishedStudioCharacterEntry = ReleasedCharacterPracticeEntry;

type PublishedCharacterItem = {
  stableKey: string;
  itemType: "character";
  level: PublishedStudioLevel;
  title: string;
  revision: number;
  revisionId: string;
  schemaVersion: 1;
  contentSha256: string;
  publishedAt: number;
  content: {
    hanzi: string;
    pinyin: string;
    meaningVi: string;
    context: PublishedStudioTriple;
    sourceLessonIds: string[];
    review: {
      humanReviewed: false;
      aiSelfReview: Record<"accuracy" | "levelFit" | "pedagogy" | "answerIntegrity" | "originality", true>;
    };
  };
};

const lessonById = new Map(RELEASED_LESSONS.map((lesson) => [lesson.id, lesson]));

const parseItem = (value: unknown): PublishedCharacterItem | null => {
  const header = publishedRuntimeHeader(value, "character");
  if (!header) return null;
  const { item, content, level } = header;
  const sourceLessonIds = Array.isArray(content.sourceLessonIds) ? content.sourceLessonIds : [];
  if (
    !runtimeText(content.hanzi, 4)
    || [...content.hanzi.trim()].length !== 1
    || !/\p{Script=Han}/u.test(content.hanzi)
    || !runtimeText(content.pinyin, 80)
    || !runtimeText(content.meaningVi, 600)
    || !runtimeTriple(content.context)
    || sourceLessonIds.length < 1
    || new Set(sourceLessonIds).size !== sourceLessonIds.length
    || !sourceLessonIds.every((lessonId) => {
      const lesson = typeof lessonId === "string" ? lessonById.get(lessonId) : null;
      return Boolean(lesson && studioLessonMatchesLevel(lesson.unitId, level));
    })
    || !runtimeReviewPassed(content.review)
  ) return null;
  return item as unknown as PublishedCharacterItem;
};

export const parsePublishedStudioCharacters = (value: unknown) => {
  const items = publishedRuntimeItems(value).map(parseItem);
  if (items.some((item) => item === null)) {
    throw new TypeError("Published character runtime contains an invalid item.");
  }
  const published = items as PublishedCharacterItem[];
  const hanzis = published.map((item) => item.content.hanzi.trim());
  if (new Set(hanzis).size !== hanzis.length) {
    throw new TypeError("Published character runtime contains duplicate characters.");
  }
  return published.flatMap((item) => item.content.sourceLessonIds.map((lessonId) => ({
    id: `${item.stableKey}:${lessonId}`,
    hanzi: item.content.hanzi.trim(),
    pinyin: item.content.pinyin.trim(),
    meaningVi: item.content.meaningVi.trim(),
    contextWord: item.content.context.hanzi.trim(),
    contextPinyin: item.content.context.pinyin.trim(),
    contextMeaningVi: item.content.context.meaningVi.trim(),
    level: item.level,
    lessonId,
  } satisfies ReleasedCharacterPracticeEntry)));
};
