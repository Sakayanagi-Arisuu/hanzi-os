import { LESSON_BY_ID } from "../data/curriculum";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";
import {
  publishedRuntimeHeader,
  publishedRuntimeItems,
  runtimeReviewPassed,
  runtimeText,
  runtimeTriple,
  type PublishedStudioTriple,
} from "./publishedStudioRuntimeContract";

export type PublishedStudioPronunciationGuide = {
  id: string;
  title: string;
  targetKind: "tone-system" | "initial-contrast" | "tone-sandhi";
  targets: string[];
  conceptVi: string;
  ruleVi: string;
  examples: PublishedStudioTriple[];
  pitfallVi: string;
  checkpointVi: string;
  audioSource: "browser-tts" | "native-audio" | null;
};

export const parsePublishedStudioPronunciation = (value: unknown) => {
  const guides = new Map<string, PublishedStudioPronunciationGuide[]>();
  for (const valueItem of publishedRuntimeItems(value)) {
    const header = publishedRuntimeHeader(valueItem, "pronunciation");
    if (!header) throw new TypeError("Published pronunciation runtime contains an invalid item.");
    const { item, content, level } = header;
    const sourceLessonIds = Array.isArray(content.sourceLessonIds) ? content.sourceLessonIds : [];
    const examples = Array.isArray(content.examples) ? content.examples : [];
    if (
      !["tone-system", "initial-contrast", "tone-sandhi"].includes(String(content.targetKind))
      || !Array.isArray(content.targets)
      || content.targets.length < 1
      || !content.targets.every((target) => runtimeText(target, 240))
      || !runtimeText(content.conceptVi, 1_200)
      || !runtimeText(content.ruleVi, 2_400)
      || examples.length < 2
      || !examples.every(runtimeTriple)
      || !runtimeText(content.pitfallVi, 1_200)
      || !runtimeText(content.checkpointVi, 1_200)
      || ![undefined, "browser-tts", "native-audio"].includes(content.audioSource as string | undefined)
      || sourceLessonIds.length < 1
      || new Set(sourceLessonIds).size !== sourceLessonIds.length
      || !sourceLessonIds.every((lessonId) => {
        const lesson = typeof lessonId === "string" ? LESSON_BY_ID.get(lessonId) : null;
        return Boolean(lesson && studioLessonMatchesLevel(lesson.unitId, level));
      })
      || !runtimeReviewPassed(content.review)
    ) throw new TypeError("Published pronunciation runtime contains an invalid item.");
    const guide: PublishedStudioPronunciationGuide = {
      id: String(item.revisionId),
      title: String(item.title).trim(),
      targetKind: content.targetKind as PublishedStudioPronunciationGuide["targetKind"],
      targets: (content.targets as string[]).map((target) => target.trim()),
      conceptVi: String(content.conceptVi).trim(),
      ruleVi: String(content.ruleVi).trim(),
      examples: (examples as PublishedStudioTriple[]).map((example) => ({
        hanzi: example.hanzi.trim(),
        pinyin: example.pinyin.trim(),
        meaningVi: example.meaningVi.trim(),
      })),
      pitfallVi: String(content.pitfallVi).trim(),
      checkpointVi: String(content.checkpointVi).trim(),
      audioSource: content.audioSource === "browser-tts" || content.audioSource === "native-audio"
        ? content.audioSource
        : null,
    };
    for (const lessonId of sourceLessonIds as string[]) {
      guides.set(lessonId, [...(guides.get(lessonId) ?? []), guide]);
    }
  }
  return guides;
};
