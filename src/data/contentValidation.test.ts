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
import type { VocabularyItem } from "../types";

const makePackage = (): ContentPackageInput => structuredClone({
  contentVersion: CONTENT_VERSION,
  vocabulary: VOCABULARY,
  courseUnits: COURSE_UNITS,
  stories: STORIES,
});

describe("content package validation", () => {
  it("accepts the checked-in package", () => {
    const content = makePackage();
    expect(validateContentPackage(content)).toEqual([]);
    expect(() => assertValidContentPackage(content)).not.toThrow();
  });

  it("keeps marked, numbered, and syllable-level pinyin consistent", () => {
    const content = makePackage();
    content.vocabulary[0].pinyin = "ní";
    content.vocabulary[1].syllables[0].lexicalTone = 4;

    const errors = validateContentPackage(content);
    expect(errors).toContain("ni: pinyin dấu phải là nǐ, nhận ní");
    expect(errors).toContain("hao: dữ liệu âm tiết 1 không nhất quán");
  });

  it("rejects stale derived syllables and mismatched content versions", () => {
    const content = makePackage();
    content.vocabulary[0].syllables[0].surfaceTone = 4;
    content.courseUnits[0].lessons[0].contentVersion = "stale-version";
    content.stories[0].contentVersion = "stale-version";

    expect(validateContentPackage(content)).toEqual(expect.arrayContaining([
      "ni: dữ liệu âm tiết 1 không nhất quán",
      "boot-1: contentVersion không khớp package",
      "first-day: contentVersion không khớp package",
    ]));
  });

  it("rejects duplicate ids and dangling lesson references", () => {
    const content = makePackage();
    (content.vocabulary as VocabularyItem[]).push(structuredClone(content.vocabulary[0]));
    content.courseUnits[0].lessons[0].wordIds.push("missing-word");
    content.courseUnits[0].lessons.push(structuredClone(content.courseUnits[0].lessons[0]));

    expect(validateContentPackage(content)).toEqual(expect.arrayContaining([
      "Trùng vocabulary id: ni",
      "boot-1: wordId không tồn tại: missing-word",
      "Trùng lesson id: boot-1",
    ]));
  });

  it("rejects missing, unreleased, and cyclic prerequisites", () => {
    const content = makePackage();
    const boot1 = content.courseUnits[0].lessons[0];
    const boot2 = content.courseUnits[0].lessons[1];
    const draft = content.courseUnits.flatMap((unit) => unit.lessons)
      .find((lesson) => lesson.releaseState === "draft");
    expect(draft).toBeDefined();

    boot1.prerequisiteIds = ["missing-lesson"];
    boot2.prerequisiteIds = [draft!.id];
    draft!.prerequisiteIds = [boot2.id];

    const errors = validateContentPackage(content);
    expect(errors).toContain("boot-1: prerequisite không tồn tại: missing-lesson");
    expect(errors).toContain(`boot-2: lesson phát hành phụ thuộc lesson chưa phát hành ${draft!.id}`);
    expect(errors.some((error) => error.startsWith("Chu trình prerequisite tại "))).toBe(true);
  });

  it("rejects invalid story references and answer contracts", () => {
    const content = makePackage();
    content.stories[0].sentences[0].wordIds.push("missing-word");
    content.stories[0].comprehension[0].correctAnswer = "Không nằm trong options";

    expect(validateContentPackage(content)).toEqual(expect.arrayContaining([
      "first-day: wordId không tồn tại: missing-word",
      "first-day/first-day-main-idea: đáp án đúng không nằm trong options",
    ]));
  });

  it("requires released stories to carry a non-duplicated comprehension check", () => {
    const withoutCheck = makePackage();
    withoutCheck.stories[0].comprehension = [];
    expect(validateContentPackage(withoutCheck)).toContain(
      "first-day: bài đọc phát hành phải có câu hỏi đọc hiểu",
    );

    const duplicateOptions = makePackage();
    const question = duplicateOptions.stories[0].comprehension[0];
    question.options[1] = question.options[0];
    expect(validateContentPackage(duplicateOptions)).toContain(
      "first-day/first-day-main-idea: options bị trùng",
    );
  });
});
