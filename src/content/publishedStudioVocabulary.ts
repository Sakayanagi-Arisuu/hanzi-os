import { RELEASED_LESSONS } from "../data/curriculum";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";
import {
  publishedRuntimeHeader,
  publishedRuntimeItems,
  runtimeReviewPassed,
  runtimeText,
  runtimeTriple,
} from "./publishedStudioRuntimeContract";

export type DictionaryWord = {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNumbered: string;
  meaning: string;
  senses: string[];
  classifiers: string[];
  partOfSpeech: string;
  toneNumbers: number[];
  tags: string[];
  isCore: boolean;
  referenceLevel?: string;
  editorialDepth?: "reference" | "curated";
  example?: string;
  examplePinyin?: string;
  exampleMeaning?: string;
  sourceKind?: "studio";
  sourceTitle?: string;
  sourcePublishedAt?: number;
  sourceLessonIds?: string[];
};

type PublishedVocabularyRuntimeItem = {
  stableKey: string;
  itemType: "vocabulary";
  level: "hsk0" | "hsk1" | "hsk2" | "hsk3" | "hsk4";
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
    examples: Array<{ hanzi: string; pinyin: string; meaningVi: string }>;
    sourceLessonIds: string[];
    review: {
      humanReviewed: false;
      aiSelfReview: Record<"accuracy" | "levelFit" | "pedagogy" | "answerIntegrity" | "originality", true>;
    };
  };
};

const RELEASED_LESSON_IDS = new Set(RELEASED_LESSONS.map((lesson) => lesson.id));
const RELEASED_LESSON_BY_ID = new Map(RELEASED_LESSONS.map((lesson) => [lesson.id, lesson]));
const TONE_COMBINING_MARKS = new Map([
  ["\u0304", 1],
  ["\u0301", 2],
  ["\u030c", 3],
  ["\u0300", 4],
]);

const pinyinTokens = (value: string) => value
  .trim()
  .split(/[\s'’-]+/gu)
  .map((token) => token.trim())
  .filter(Boolean);

const toneOfPinyinToken = (token: string) => {
  const explicit = token.match(/[1-5](?!.*[1-5])/u)?.[0];
  if (explicit) return Number(explicit) % 5;
  const decomposed = token.normalize("NFD");
  for (const mark of decomposed) {
    const tone = TONE_COMBINING_MARKS.get(mark);
    if (tone) return tone;
  }
  return 0;
};

const numberedPinyinToken = (token: string) => {
  if (/[1-5]/u.test(token)) return token;
  const tone = toneOfPinyinToken(token);
  const spelling = [...token.normalize("NFD")]
    .filter((character) => !TONE_COMBINING_MARKS.has(character))
    .join("")
    .normalize("NFC");
  return `${spelling}${tone || 5}`;
};

const parseRuntimeItem = (value: unknown): PublishedVocabularyRuntimeItem | null => {
  const header = publishedRuntimeHeader(value, "vocabulary");
  if (!header) return null;
  const { item, content, level } = header;
  if (
    !runtimeText(content.hanzi, 32)
    || !/\p{Script=Han}/u.test(content.hanzi)
    || !runtimeText(content.pinyin, 160)
    || !runtimeText(content.meaningVi, 600)
    || !Array.isArray(content.sourceLessonIds)
    || content.sourceLessonIds.length < 1
    || new Set(content.sourceLessonIds).size !== content.sourceLessonIds.length
    || !content.sourceLessonIds.every((lessonId) => {
      const lesson = typeof lessonId === "string" ? RELEASED_LESSON_BY_ID.get(lessonId) : null;
      return Boolean(lesson && RELEASED_LESSON_IDS.has(lesson.id)
        && studioLessonMatchesLevel(lesson.unitId, level));
    })
    || !runtimeReviewPassed(content.review)
    || !Array.isArray(content.examples)
    || content.examples.length < 1
  ) return null;
  const examples = content.examples.filter((example): example is {
    hanzi: string;
    pinyin: string;
    meaningVi: string;
  } => runtimeTriple(example));
  if (examples.length !== content.examples.length) return null;
  return item as unknown as PublishedVocabularyRuntimeItem;
};

export const parsePublishedStudioVocabulary = (value: unknown): DictionaryWord[] => {
  const parsed = publishedRuntimeItems(value).map(parseRuntimeItem);
  if (parsed.some((item) => item === null)) {
    throw new TypeError("Published vocabulary runtime contains an invalid item.");
  }
  return (parsed as PublishedVocabularyRuntimeItem[]).map((item) => {
    const example = item.content.examples[0];
    const tokens = pinyinTokens(item.content.pinyin);
    const senses = item.content.meaningVi
      .split(/[;；\n]+/gu)
      .map((sense) => sense.trim())
      .filter(Boolean);
    return {
      id: item.stableKey,
      simplified: item.content.hanzi.trim(),
      traditional: item.content.hanzi.trim(),
      pinyin: item.content.pinyin.trim(),
      pinyinNumbered: tokens.map(numberedPinyinToken).join(" "),
      meaning: item.content.meaningVi.trim(),
      senses: senses.length > 0 ? senses : [item.content.meaningVi.trim()],
      classifiers: [],
      partOfSpeech: "Mục từ biên soạn",
      toneNumbers: tokens.map(toneOfPinyinToken),
      tags: [`${item.level.toUpperCase()} · Tàng Tự Khố`, "Nội dung đã phát hành"],
      isCore: false,
      referenceLevel: item.level.slice(3),
      editorialDepth: "curated",
      example: example.hanzi.trim(),
      examplePinyin: example.pinyin.trim(),
      exampleMeaning: example.meaningVi.trim(),
      sourceKind: "studio",
      sourceTitle: item.title.trim(),
      sourcePublishedAt: item.publishedAt,
      sourceLessonIds: [...item.content.sourceLessonIds],
    };
  });
};
