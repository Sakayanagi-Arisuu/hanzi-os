import { formatMarkedPinyin, parseNumberedPinyin, stripPinyinMarks } from "../lib/pinyin";
import type { CourseUnit, Story, VocabularyItem } from "../types";

export type ContentPackageInput = {
  contentVersion: string;
  vocabulary: readonly VocabularyItem[];
  courseUnits: readonly CourseUnit[];
  stories: readonly Story[];
};

const RELEASED_STATES = new Set(["beta", "published"]);
const CONTENT_RELEASE_STATES = new Set([
  "draft",
  "review",
  "beta",
  "published",
  "retired",
]);

export const validateContentPackage = (content: ContentPackageInput) => {
  const errors: string[] = [];
  const wordIds = new Set<string>();

  if (!content.contentVersion.trim()) errors.push("contentVersion không được để trống");

  content.vocabulary.forEach((word) => {
    if (wordIds.has(word.id)) errors.push(`Trùng vocabulary id: ${word.id}`);
    wordIds.add(word.id);
    try {
      const parsed = parseNumberedPinyin(word.pinyinNumbered);
      const generatedMarked = formatMarkedPinyin(parsed);
      if (stripPinyinMarks(generatedMarked) !== stripPinyinMarks(word.pinyin)) {
        errors.push(`${word.id}: pinyin dấu và pinyin số không cùng âm tiết`);
      }
      if (generatedMarked.toLocaleLowerCase("en") !== word.pinyin.toLocaleLowerCase("en")) {
        errors.push(`${word.id}: pinyin dấu phải là ${generatedMarked}, nhận ${word.pinyin}`);
      }
      if (parsed.length !== word.syllables.length) {
        errors.push(`${word.id}: số âm tiết không nhất quán`);
      }
      parsed.forEach((syllable, index) => {
        const stored = word.syllables[index];
        if (
          !stored ||
          stored.index !== syllable.index ||
          stored.spelling !== syllable.spelling ||
          stored.marked !== syllable.marked ||
          stored.numbered !== syllable.numbered ||
          stored.initial !== syllable.initial ||
          stored.final !== syllable.final ||
          stored.lexicalTone !== syllable.lexicalTone ||
          stored.surfaceTone !== syllable.surfaceTone ||
          stored.neutralTone !== syllable.neutralTone
        ) {
          errors.push(`${word.id}: dữ liệu âm tiết ${index + 1} không nhất quán`);
        }
      });
    } catch (error) {
      errors.push(`${word.id}: ${error instanceof Error ? error.message : "pinyin không hợp lệ"}`);
    }
  });

  const lessons = content.courseUnits.flatMap((unit) => unit.lessons);
  const lessonById = new Map<string, (typeof lessons)[number]>();
  lessons.forEach((lesson) => {
    if (lessonById.has(lesson.id)) errors.push(`Trùng lesson id: ${lesson.id}`);
    lessonById.set(lesson.id, lesson);
    if (!CONTENT_RELEASE_STATES.has(lesson.releaseState)) {
      errors.push(`${lesson.id}: releaseState không hợp lệ: ${lesson.releaseState}`);
    }
    if (lesson.contentVersion !== content.contentVersion) {
      errors.push(`${lesson.id}: contentVersion không khớp package`);
    }
    lesson.wordIds.forEach((wordId) => {
      if (!wordIds.has(wordId)) errors.push(`${lesson.id}: wordId không tồn tại: ${wordId}`);
    });
  });

  lessons.forEach((lesson) => {
    lesson.prerequisiteIds.forEach((prerequisiteId) => {
      const prerequisite = lessonById.get(prerequisiteId);
      if (!prerequisite) {
        errors.push(`${lesson.id}: prerequisite không tồn tại: ${prerequisiteId}`);
        return;
      }
      if (RELEASED_STATES.has(lesson.releaseState) && !RELEASED_STATES.has(prerequisite.releaseState)) {
        errors.push(`${lesson.id}: lesson phát hành phụ thuộc lesson chưa phát hành ${prerequisiteId}`);
      }
    });
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (lessonId: string) => {
    if (visiting.has(lessonId)) {
      errors.push(`Chu trình prerequisite tại ${lessonId}`);
      return;
    }
    if (visited.has(lessonId)) return;
    visiting.add(lessonId);
    lessonById.get(lessonId)?.prerequisiteIds.forEach(visit);
    visiting.delete(lessonId);
    visited.add(lessonId);
  };
  lessons.forEach((lesson) => visit(lesson.id));

  const storyIds = new Set<string>();
  content.stories.forEach((story) => {
    if (storyIds.has(story.id)) errors.push(`Trùng story id: ${story.id}`);
    storyIds.add(story.id);
    if (!CONTENT_RELEASE_STATES.has(story.releaseState)) {
      errors.push(`${story.id}: releaseState không hợp lệ: ${story.releaseState}`);
    }
    if (story.contentVersion !== content.contentVersion) {
      errors.push(`${story.id}: contentVersion không khớp package`);
    }
    if (RELEASED_STATES.has(story.releaseState) && story.comprehension.length === 0) {
      errors.push(`${story.id}: bài đọc phát hành phải có câu hỏi đọc hiểu`);
    }
    story.sentences.forEach((sentence) => sentence.wordIds.forEach((wordId) => {
      if (!wordIds.has(wordId)) errors.push(`${story.id}: wordId không tồn tại: ${wordId}`);
    }));
    story.comprehension.forEach((question) => {
      if (new Set(question.options).size !== question.options.length) {
        errors.push(`${story.id}/${question.id}: options bị trùng`);
      }
      if (!question.options.includes(question.correctAnswer)) {
        errors.push(`${story.id}/${question.id}: đáp án đúng không nằm trong options`);
      }
    });
  });

  return errors;
};

export const assertValidContentPackage = (content: ContentPackageInput) => {
  const errors = validateContentPackage(content);
  if (errors.length) {
    throw new Error(`Content package không hợp lệ:\n- ${errors.join("\n- ")}`);
  }
};
