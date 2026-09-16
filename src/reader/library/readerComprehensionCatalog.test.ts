import { describe, expect, it } from "vitest";
import { attachReaderComprehension, readerQuestionSeeds } from "./readerComprehension";
import { loadReaderChapter, READER_CHAPTER_LOADERS } from "./readerChapterLoader";
import { READER_SERIES_CATALOG } from "./readerManifest";
import { completeReaderChapter, createEmptyReaderProgress, readerComprehensionState, recordReaderComprehensionAttempt } from "./readerProgress";

describe("source-bound reading checks across the existing library", () => {
  it("covers all 250 catalog chapters plus the legacy chapter with distinct valid questions and evidence", async () => {
    const ids = new Set<string>();
    let chapters = 0;
    let questions = 0;
    for (const series of READER_SERIES_CATALOG) {
      for (const summary of series.volumes.flatMap((volume) => volume.chapters)) {
        const chapter = await loadReaderChapter(series.seriesId, summary.chapterId);
        expect(chapter.comprehension, chapter.chapterId).toHaveLength(2);
        expect(summary.comprehensionCount).toBe(2);
        expect(chapter.version).toBe(summary.version);
        expect(chapter.humanReviewed).toBe(false);
        const seeds = readerQuestionSeeds(chapter);
        chapter.comprehension!.forEach((question, index) => {
          expect(ids.has(question.questionId)).toBe(false);
          ids.add(question.questionId);
          expect(new Set(question.options).size).toBe(3);
          expect(question.options.every((option) => option.trim().length > 0)).toBe(true);
          expect(question.options[question.answerIndex]).toBe(seeds[index]![2]);
          expect(question.explanationVi).toContain(chapter.paragraphs[seeds[index]![0] - 1]!.vi);
          expect(question.promptVi.length).toBeGreaterThan(15);
          questions += 1;
        });
        expect(new Set(chapter.comprehension!.map((question) => question.promptVi)).size).toBe(2);
        chapters += 1;
      }
    }
    expect(chapters).toBe(251);
    expect(questions).toBe(502);
  }, 60000);

  it("keeps prior completion while allowing new checks, stores retries, and ignores stale quiz versions", async () => {
    const raw = (await READER_CHAPTER_LOADERS["jade-lantern-archive::jade-lantern-archive-c01"]!()).default;
    const chapter = await loadReaderChapter(raw.seriesId, raw.chapterId);
    const scope = { ownerKey: "anonymous:reading-bank", ownerGeneration: 1, resetEpoch: 0 };
    const completed = completeReaderChapter(createEmptyReaderProgress(scope), raw, "2026-09-01T00:00:00.000Z");
    const question = chapter.comprehension![0]!;
    const wrong = recordReaderComprehensionAttempt({ document: completed, chapter, question, selectedAnswer: question.options[(question.answerIndex + 1) % 3]! });
    const correct = recordReaderComprehensionAttempt({ document: wrong, chapter, question, selectedAnswer: question.options[question.answerIndex]! });
    expect(correct.chapters[chapter.chapterId]!.completedAt).toBe(completed.chapters[chapter.chapterId]!.completedAt);
    expect(readerComprehensionState(correct, chapter)).toMatchObject({ correct: 1, firstAttemptCorrect: 0, answerExposed: true, complete: false });
    expect(readerComprehensionState(correct, { ...chapter, version: `${chapter.version}:next` }).answered).toBe(0);
    expect(attachReaderComprehension(chapter).comprehension).toEqual(chapter.comprehension);
  });
});
