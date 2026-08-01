import { describe, expect, it } from "vitest";
import {
  CONTENT_VERSION,
  COURSE_UNITS,
  STORIES,
  VOCABULARY,
} from "./curriculum";
import {
  assertValidContentPackage,
  type ContentPackageInput,
  validateContentPackage,
} from "./contentValidation";
import type { Lesson, VocabularyItem } from "../types";

const makePackage = (): ContentPackageInput => structuredClone({
  contentVersion: CONTENT_VERSION,
  vocabulary: VOCABULARY,
  courseUnits: COURSE_UNITS,
  stories: STORIES,
});

const findVocabulary = (content: ContentPackageInput, id: string) => {
  const word = content.vocabulary.find((candidate) => candidate.id === id);
  if (!word) throw new Error(`Missing vocabulary fixture: ${id}`);
  return word;
};

const findLesson = (content: ContentPackageInput, id: string) => {
  const lesson = content.courseUnits
    .flatMap((unit) => unit.lessons)
    .find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Missing lesson fixture: ${id}`);
  return lesson;
};

const findStory = (content: ContentPackageInput, id: string) => {
  const story = content.stories.find((candidate) => candidate.id === id);
  if (!story) throw new Error(`Missing story fixture: ${id}`);
  return story;
};

const addSyntheticDraft = (
  content: ContentPackageInput,
  source: Lesson,
  prerequisiteIds: string[],
) => {
  const unit = content.courseUnits.find((candidate) => candidate.id === source.unitId);
  if (!unit) throw new Error(`Missing unit fixture: ${source.unitId}`);

  const draft: Lesson = {
    ...structuredClone(source),
    id: "fixture-draft",
    prerequisiteIds,
    releaseState: "draft",
  };
  unit.lessons.push(draft);
  return draft;
};

describe("content package validation", () => {
  it("accepts the checked-in package", () => {
    const content = makePackage();
    expect(validateContentPackage(content)).toEqual([]);
    expect(() => assertValidContentPackage(content)).not.toThrow();
  });

  it("keeps marked, numbered, and syllable-level pinyin consistent", () => {
    const content = makePackage();
    findVocabulary(content, "ni").pinyin = "ní";
    findVocabulary(content, "hao").syllables[0].lexicalTone = 4;

    const errors = validateContentPackage(content);
    expect(errors).toContain("ni: pinyin dấu phải là nǐ, nhận ní");
    expect(errors).toContain("hao: dữ liệu âm tiết 1 không nhất quán");
  });

  it("accepts standard tone sandhi for learner-visible pinyin", () => {
    const content = makePackage();
    findVocabulary(content, "hsk-vocab-00258").pinyin = "yíbàn";

    expect(validateContentPackage(content)).toEqual([]);
  });

  it("rejects stale derived syllables and mismatched content versions", () => {
    const content = makePackage();
    findVocabulary(content, "ni").syllables[0].surfaceTone = 4;
    findLesson(content, "boot-1").contentVersion = "stale-version";
    findStory(content, "first-day").contentVersion = "stale-version";

    expect(validateContentPackage(content)).toEqual(expect.arrayContaining([
      "ni: dữ liệu âm tiết 1 không nhất quán",
      "boot-1: contentVersion không khớp package",
      "first-day: contentVersion không khớp package",
    ]));
  });

  it("rejects duplicate ids and dangling lesson references", () => {
    const content = makePackage();
    const word = findVocabulary(content, "ni");
    const lesson = findLesson(content, "boot-1");
    const unit = content.courseUnits.find((candidate) => candidate.id === lesson.unitId);
    if (!unit) throw new Error(`Missing unit fixture: ${lesson.unitId}`);
    (content.vocabulary as VocabularyItem[]).push(structuredClone(word));
    lesson.wordIds.push("missing-word");
    unit.lessons.push(structuredClone(lesson));

    expect(validateContentPackage(content)).toEqual(expect.arrayContaining([
      "Trùng vocabulary id: ni",
      "boot-1: wordId không tồn tại: missing-word",
      "Trùng lesson id: boot-1",
    ]));
  });

  it("rejects missing, unreleased, and cyclic prerequisites", () => {
    const content = makePackage();
    const boot1 = findLesson(content, "boot-1");
    const boot2 = findLesson(content, "boot-2");
    const draft = addSyntheticDraft(content, boot2, [boot2.id]);

    boot1.prerequisiteIds = ["missing-lesson"];
    boot2.prerequisiteIds = [draft.id];

    const errors = validateContentPackage(content);
    expect(errors).toContain("boot-1: prerequisite không tồn tại: missing-lesson");
    expect(errors).toContain(`boot-2: lesson phát hành phụ thuộc lesson chưa phát hành ${draft.id}`);
    expect(errors.some((error) => error.startsWith("Chu trình prerequisite tại "))).toBe(true);
  });

  it("rejects invalid story references and answer contracts", () => {
    const content = makePackage();
    const story = findStory(content, "first-day");
    story.sentences[0].wordIds.push("missing-word");
    story.comprehension[0].correctAnswer = "Không nằm trong options";

    expect(validateContentPackage(content)).toEqual(expect.arrayContaining([
      "first-day: wordId không tồn tại: missing-word",
      "first-day/first-day-main-idea: đáp án đúng không nằm trong options",
    ]));
  });

  it("requires released stories to carry a non-duplicated comprehension check", () => {
    const withoutCheck = makePackage();
    findStory(withoutCheck, "first-day").comprehension = [];
    expect(validateContentPackage(withoutCheck)).toContain(
      "first-day: bài đọc phát hành phải có câu hỏi đọc hiểu",
    );

    const duplicateOptions = makePackage();
    const story = findStory(duplicateOptions, "first-day");
    const question = story.comprehension[0];
    question.options[1] = question.options[0];
    expect(validateContentPackage(duplicateOptions)).toContain(
      "first-day/first-day-main-idea: options bị trùng",
    );
  });
});
