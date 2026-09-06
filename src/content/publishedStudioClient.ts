import type { ReleasedCharacterPracticeEntry } from "../learning/richLessonContent";
import type {
  PublishedStudioLearningProjection,
  PublishedStudioLesson,
  PublishedStudioLessonEnhancement,
} from "./publishedStudioLessons";
import type { PublishedStudioPronunciationGuide } from "./publishedStudioPronunciation";
import type { DictionaryWord } from "./publishedStudioVocabulary";

const projection = async <T,>(
  name: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
) => {
  const response = await fetcher(`/api/content/runtime?projection=${name}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Published Studio projection is unavailable.");
  const value = await response.json() as Record<string, unknown>;
  if (value.schemaVersion !== 1 || value.projection !== name || !Array.isArray(value.items)) {
    throw new TypeError("Published Studio projection is invalid.");
  }
  return value.items as T;
};

export const loadPublishedStudioVocabulary = (
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
) => projection<DictionaryWord[]>("vocabulary", fetcher, signal);

export const mergePublishedStudioVocabulary = (
  current: readonly DictionaryWord[],
  published: readonly DictionaryWord[],
) => {
  const merged = current.map((word) => ({ ...word }));
  const indexById = new Map(merged.map((word, index) => [word.id, index]));
  for (const word of published) {
    const index = indexById.get(word.id);
    if (index === undefined) {
      indexById.set(word.id, merged.length);
      merged.push({ ...word });
    } else {
      const existing = merged[index]!;
      merged[index] = {
        ...existing,
        ...word,
        traditional: existing.traditional || word.traditional,
        classifiers: existing.classifiers,
        partOfSpeech: existing.partOfSpeech || word.partOfSpeech,
        isCore: existing.isCore,
        referenceLevel: existing.referenceLevel ?? word.referenceLevel,
      };
    }
  }
  return merged;
};

export const loadPublishedStudioCharacters = (
  fetcher: typeof fetch = fetch,
) => projection<ReleasedCharacterPracticeEntry[]>("character", fetcher);

export const mergePublishedStudioCharacters = (
  current: readonly ReleasedCharacterPracticeEntry[],
  published: readonly ReleasedCharacterPracticeEntry[],
) => {
  const replaced = new Set(published.map((entry) => entry.hanzi));
  return [...current.filter((entry) => !replaced.has(entry.hanzi)), ...published];
};

export const loadPublishedStudioPronunciation = async (
  fetcher: typeof fetch = fetch,
) => new Map(await projection<Array<[
  string,
  PublishedStudioPronunciationGuide[],
]>>("pronunciation", fetcher));

export const loadPublishedStudioLessons = async (
  fetcher: typeof fetch = fetch,
) => {
  const [lessons = [], enhancements = []] = await projection<[
    Array<[string, PublishedStudioLesson]>,
    Array<[string, PublishedStudioLessonEnhancement]>,
  ]>("learning", fetcher);
  return {
    lessons: new Map(lessons),
    enhancements: new Map(enhancements),
  } satisfies PublishedStudioLearningProjection;
};

export const mergePublishedStudioLessonEnhancement = (
  current: PublishedStudioLesson["richContent"] | null,
  enhancement?: PublishedStudioLessonEnhancement,
  targetLessonId = current?.lessonId ?? "studio-enhancement",
) => enhancement ? {
  lessonId: current?.lessonId ?? targetLessonId,
  authoringLessonId: current?.authoringLessonId ?? `studio:${targetLessonId}`,
  dialogue: [...(current?.dialogue ?? []), ...enhancement.dialogue],
  grammar: [...(current?.grammar ?? []), ...enhancement.grammar],
  topics: [...(current?.topics ?? []), ...enhancement.topics],
  tasks: [...(current?.tasks ?? []), ...enhancement.tasks],
  characters: current?.characters ?? [],
} : current;
