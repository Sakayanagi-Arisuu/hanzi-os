import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MEGA_LEXICON_INSTANT_BROWSE_COUNT,
  MEGA_LEXICON_LESSON_COUNT,
  MEGA_LEXICON_LOOKUP_SHARD_COUNT,
  MEGA_LEXICON_SEARCHABLE_COUNT,
  MEGA_LEXICON_VERSION,
} from "./megaLexicon";

const artifact = JSON.parse(readFileSync(
  resolve(process.cwd(), "public/content/mandarin-mega-lexicon-2026.08.1.json"),
  "utf8",
));
const lookupIndex = JSON.parse(readFileSync(
  resolve(process.cwd(), "public/content/mandarin-mega-lexicon-2026.08.1/lookup-index.json"),
  "utf8",
));
const dictionarySource = readFileSync(resolve(process.cwd(), "src/screens/DictionaryPage.tsx"), "utf8");
const readerLexiconSource = readFileSync(resolve(process.cwd(), "src/reader/library/readerLexicon.ts"), "utf8");
const readerChapterSource = readFileSync(resolve(process.cwd(), "src/screens/ReaderChapterPage.tsx"), "utf8");

describe("mega lexicon learner corpus", () => {
  it("expands vocabulary and lesson experiences without altering the core inventory", () => {
    expect(artifact.contentVersion).toBe(MEGA_LEXICON_VERSION);
    expect(artifact.stats.coreVocabulary).toBe(2_016);
    expect(artifact.stats.coreLessons).toBe(217);
    expect(artifact.stats.totalSearchableVocabulary).toBe(MEGA_LEXICON_SEARCHABLE_COUNT);
    expect(artifact.stats.instantBrowseVocabulary).toBe(MEGA_LEXICON_INSTANT_BROWSE_COUNT);
    expect(artifact.stats.fullLookupVocabulary).toBe(119_043);
    expect(artifact.stats.lookupShards).toBe(MEGA_LEXICON_LOOKUP_SHARD_COUNT);
    expect(artifact.stats.cvdictRows).toBe(122_597);
    expect(artifact.stats.totalLearnerVisibleLessons).toBe(MEGA_LEXICON_LESSON_COUNT);
    expect(artifact.stats.addedReferenceVocabulary).toBeGreaterThan(9_000);
    expect(artifact.stats.vocabularyMissions).toBeGreaterThanOrEqual(450);
    expect(artifact.stats.advancedVocabularyMissions).toBe(381);
  });

  it("indexes the full Chinese surface dictionary across stable lookup shards", () => {
    expect(lookupIndex).toMatchObject({
      schemaVersion: 1,
      contentVersion: MEGA_LEXICON_VERSION,
      shardCount: MEGA_LEXICON_LOOKUP_SHARD_COUNT,
      totalEntries: 119_043,
      totalSearchableVocabulary: MEGA_LEXICON_SEARCHABLE_COUNT,
    });
    expect(lookupIndex.buckets).toHaveLength(MEGA_LEXICON_LOOKUP_SHARD_COUNT);
    expect(lookupIndex.buckets.reduce(
      (sum: number, bucket: { entries: number }) => sum + bucket.entries,
      0,
    )).toBe(119_043);
  });

  it("integrates every added HSK1-4 word into exactly one stable Path lesson", () => {
    expect(artifact.pathLessonPacks).toHaveLength(213);
    const wordIds = artifact.pathLessonPacks.flatMap((pack: { wordIds: string[] }) => pack.wordIds);
    expect(wordIds).toHaveLength(1_459);
    expect(new Set(wordIds).size).toBe(wordIds.length);
    expect(artifact.pathLessonPacks.every((pack: { wordIds: string[] }) => pack.wordIds.length > 0)).toBe(true);
  });

  it("keeps reference-only content outside XP and mastery gates", () => {
    expect(artifact.policy).toMatchObject({
      learnerVisibleForPersonalLocalStudy: true,
      humanReviewed: false,
      measurementEligible: false,
      masteryEligible: false,
      xpEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    });
  });

  it("ships practical Vietnamese editorial content alongside the large reference corpus", () => {
    const verificationCode = artifact.vocabulary.find((item: { simplified: string }) => item.simplified === "验证码");
    expect(verificationCode).toMatchObject({
      meaning: "mã xác minh",
      editorialDepth: "curated",
      example: "输入验证码",
    });
    expect(artifact.curatedLessons).toHaveLength(9);
    expect(artifact.curatedLessons.every((lesson: { dialogue: unknown[] }) => lesson.dialogue.length >= 4)).toBe(true);
    expect(artifact.vocabulary.every((item: { senses: string[]; classifiers: string[] }) => item.senses.length > 0 && Array.isArray(item.classifiers))).toBe(true);
  });

  it("covers every reference entry in exactly one short mission", () => {
    const ids = artifact.missions.flatMap((mission: { wordIds: string[] }) => mission.wordIds);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(artifact.stats.addedReferenceVocabulary);
    expect(artifact.missions.every((mission: { wordIds: string[] }) => mission.wordIds.length <= 20)).toBe(true);
  });

  it("exposes deep lookup through Tàng Tự Khố and every Reader token", () => {
    expect(dictionarySource).toContain("loadMegaLexicon()");
    expect(dictionarySource).toContain("searchMegaVocabularyByHanzi(query)");
    expect(dictionarySource).toContain("results.slice(0, visibleLimit)");
    expect(dictionarySource).toContain("Nghĩa tiếng Việt");
    expect(readerLexiconSource).toContain("lookupMegaVocabulary(entry.simplified)");
    expect(readerChapterSource).toContain("hydrateReaderReferenceEntry(entry)");
  });
});
