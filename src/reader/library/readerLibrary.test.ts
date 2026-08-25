import runtimeCatalogJson from "../../../content/packages/foundation-2026.08.5/runtime-catalog.json";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveReaderEntry, type LegacyReaderState } from "./readerEntryResolver";
import {
  countHanzi,
  loadReaderChapter,
  READER_CHAPTER_LOADERS,
  validateReaderChapter,
} from "./readerChapterLoader";
import {
  READER_LONG_FORM_MAX_HANZI,
  READER_LONG_FORM_MIN_HANZI,
} from "./readerLongFormExpansion";
import { readerChapterIdentity } from "./readerContentModel";
import {
  isReaderHanCharacter,
  READER_REFERENCE_ENTRY_BY_ID,
} from "./readerLexicon";
import {
  READER_DISCOVERABLE_SERIES,
  READER_SERIES_CATALOG,
  READER_SERIES_BY_ID,
} from "./readerManifest";
import { READER_SHELF_OPTIONS } from "./readerShelfCatalog";
import {
  completeReaderChapter,
  createEmptyReaderProgress,
  removeReaderSavedEntry,
  parseReaderProgress,
  recordReaderSupport,
  resolveReadingMode,
  toggleReaderSavedEntry,
  updateReaderPosition,
} from "./readerProgress";
import {
  READER_RIGHTS_MANIFEST,
  validateReaderRightsManifest,
} from "./readerRights";
import { resolveSystemPageName } from "../../system/systemLexicon";

const scope = {
  ownerKey: "anonymous:test-reader",
  ownerGeneration: 2,
  resetEpoch: 3,
};

const allSummaries = READER_SERIES_CATALOG.flatMap((series) =>
  series.volumes.flatMap((volume) => volume.chapters.map((chapter) => ({ series, chapter })))
);

describe("Vạn Quyển Các Mốc 4 content model", () => {
  it("opens a dense original catalog while keeping the legacy first-day ID out of discovery", () => {
    expect(READER_DISCOVERABLE_SERIES).toHaveLength(25);
    expect(READER_DISCOVERABLE_SERIES.some((series) => series.seriesId === "first-day"))
      .toBe(false);
    expect(READER_SERIES_CATALOG.find((series) => series.seriesId === "first-day"))
      .toMatchObject({ discoverable: false, shelfId: "legacy" });

    READER_SHELF_OPTIONS.filter((option) => option.shelfId !== "all")
      .forEach((option) => {
        expect(READER_DISCOVERABLE_SERIES.filter((series) =>
          series.shelfId === option.shelfId || series.genreIds.includes(option.label)
        ).length).toBeGreaterThanOrEqual(3);
      });
    READER_DISCOVERABLE_SERIES.forEach((series) => {
      expect(series.volumes.flatMap((volume) => volume.chapters).length)
        .toBeGreaterThan(0);
    });
    expect(READER_DISCOVERABLE_SERIES.flatMap((series) =>
      series.volumes.flatMap((volume) => volume.chapters)
    )).toHaveLength(250);
    const coverSources = new Set<string>();
    READER_DISCOVERABLE_SERIES.forEach((series) => {
      const chapters = series.volumes.flatMap((volume) => volume.chapters);
      expect(chapters).toHaveLength(10);
      chapters.forEach((chapter) => {
        expect(chapter.estimatedMinutes).toBeGreaterThanOrEqual(12);
        expect(chapter.backgroundAsset?.src).toMatch(/^\/reader\/(backgrounds|covers)\/.+\.webp$/);
      });
      expect(series.coverAsset).toMatchObject({ kind: "art-directed" });
      expect(series.coverAsset.src).toMatch(/^\/reader\/covers\/m3\/.+\.webp$/);
      coverSources.add(series.coverAsset.src ?? "");
    });
    expect(coverSources).toHaveLength(25);
    const destinyScenes = READER_SERIES_BY_ID.get("van-menh-nguoc-dong")!
      .volumes.flatMap((volume) => volume.chapters)
      .map((chapter) => chapter.backgroundAsset?.src);
    expect(new Set(destinyScenes)).toHaveLength(10);
    expect(destinyScenes.every((src) => src?.startsWith("/reader/backgrounds/m4/van-menh-nguoc-dong/")))
      .toBe(true);
    const destinySceneFiles = destinyScenes.map((src) =>
      resolve(process.cwd(), "public", String(src).replace(/^\//u, ""))
    );
    expect(destinySceneFiles.every(existsSync)).toBe(true);
    expect(new Set(destinySceneFiles.map((file) =>
      createHash("sha256").update(readFileSync(file)).digest("hex")
    ))).toHaveLength(10);
  });

  it("keeps the catalog lightweight and every released chapter behind a shard loader", () => {
    expect(Object.keys(READER_CHAPTER_LOADERS)).toHaveLength(allSummaries.length);
    allSummaries.forEach(({ series, chapter }) => {
      expect(chapter).not.toHaveProperty("paragraphs");
      expect(READER_CHAPTER_LOADERS[readerChapterIdentity(series.seriesId, chapter.chapterId)])
        .toBeTypeOf("function");
    });
  });

  it("keeps every nested Reader route inside the Vạn Quyển Các system identity", () => {
    [
      "/reader",
      "/reader/series/jade-lantern-archive",
      "/reader/series/jade-lantern-archive/chapter/jade-lantern-archive-c01",
      "/reader/challenge",
    ].forEach((pathname) => {
      expect(resolveSystemPageName(pathname)).toMatchObject({
        code: "READ-08",
        title: "Vạn Quyển Các",
      });
    });
  });

  it("loads every shard with exact catalog identity, aligned paragraphs and valid token references", async () => {
    const lessonIds = new Set(runtimeCatalogJson.lessons.map((lesson) => lesson.id));
    for (const { series, chapter: summary } of allSummaries) {
      const chapter = await loadReaderChapter(series.seriesId, summary.chapterId, { retry: true });
      expect(validateReaderChapter(chapter)).toEqual({ ok: true, errors: [] });
      expect(chapter.version).toBe(summary.version);
      expect(chapter.relatedLessonIds.every((lessonId) => lessonIds.has(lessonId))).toBe(true);
      chapter.paragraphs.forEach((paragraph) => {
        expect(paragraph.segments.map((segment) =>
          segment.kind === "token" ? segment.surface : segment.text
        ).join("")).toBe(paragraph.zhHans);
        paragraph.segments
          .filter((segment) => segment.kind === "token")
          .forEach((token) => {
            const entryId = token.lexemeId
              ? `reader-core:${token.lexemeId}`
              : token.referenceEntryId;
            expect(READER_REFERENCE_ENTRY_BY_ID.has(entryId ?? "")).toBe(true);
            expect([...token.surface]).toHaveLength(1);
            expect(isReaderHanCharacter(token.surface)).toBe(true);
          });
        paragraph.segments
          .filter((segment) => segment.kind === "text")
          .forEach((segment) => {
            expect([...segment.text].some(isReaderHanCharacter)).toBe(false);
          });
        const lookupableHanzi = paragraph.segments
          .filter((segment) => segment.kind === "token")
          .reduce((sum, token) => sum + countHanzi(token.surface), 0);
        expect(lookupableHanzi).toBe(countHanzi(paragraph.zhHans));
      });
      if (series.discoverable) {
        const hanziCount = countHanzi(chapter.paragraphs.map((paragraph) => paragraph.zhHans).join(""));
        expect(hanziCount).toBeGreaterThanOrEqual(READER_LONG_FORM_MIN_HANZI);
        expect(hanziCount).toBeLessThanOrEqual(READER_LONG_FORM_MAX_HANZI);
        expect(chapter.backgroundAsset).toEqual(summary.backgroundAsset);
      }
    }
  }, 60_000);

  it("fails closed when a referenced rights record is absent", () => {
    expect(validateReaderRightsManifest(READER_RIGHTS_MANIFEST, READER_SERIES_CATALOG))
      .toEqual({ ok: true, errors: [] });
    const incomplete = READER_RIGHTS_MANIFEST.filter((record) =>
      record.contentId !== "reader-chapter:jade-lantern-archive-c01"
    );
    const result = validateReaderRightsManifest(incomplete, READER_SERIES_CATALOG);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("missing rights");
  });
});

describe("Vạn Quyển Các local-first progress", () => {
  it("migrates V1, rejects a foreign owner and restores the saved reading mode", () => {
    const now = "2026-08-24T03:00:00.000Z";
    const migrated = parseReaderProgress({
      schemaVersion: 1,
      ownerKey: scope.ownerKey,
      seriesId: "jade-lantern-archive",
      chapterId: "jade-lantern-archive-c01",
      paragraphId: "jade-lantern-archive-c01-p03",
      readingMode: "bilingual",
      lastReadAt: now,
      completedChapterIds: [],
    }, scope, now);
    expect(migrated.lastChapterId).toBe("jade-lantern-archive-c01");
    expect(resolveReadingMode(migrated.chapters["jade-lantern-archive-c01"]))
      .toBe("bilingual");
    expect(parseReaderProgress({ ...migrated, ownerKey: "account:other" }, scope, now))
      .toEqual(createEmptyReaderProgress(scope, now));
  });

  it("keeps replay completion idempotent and records support without mastery evidence", async () => {
    const chapter = await loadReaderChapter("jade-lantern-archive", "jade-lantern-archive-c01");
    const started = updateReaderPosition({
      document: createEmptyReaderProgress(scope, "2026-08-24T03:00:00.000Z"),
      seriesId: chapter.seriesId,
      chapterId: chapter.chapterId,
      paragraphId: chapter.paragraphs[0]!.paragraphId,
      readingMode: "zh-only",
      now: "2026-08-24T03:01:00.000Z",
    });
    const first = completeReaderChapter(started, chapter, "2026-08-24T03:10:00.000Z");
    const replay = completeReaderChapter(first, chapter, "2026-08-25T03:10:00.000Z");
    expect(replay.chapters[chapter.chapterId]?.completedAt)
      .toBe("2026-08-24T03:10:00.000Z");

    const supported = recordReaderSupport(replay, {
      kind: "lookup",
      seriesId: chapter.seriesId,
      chapterId: chapter.chapterId,
      paragraphId: chapter.paragraphs[0]!.paragraphId,
      referenceEntryId: "reader-ref:qingdeng",
    }, "2026-08-25T03:11:00.000Z");
    expect(supported.supportEvents).toHaveLength(1);
    expect(supported.supportEvents[0]).not.toHaveProperty("mastery");
    expect(supported.supportEvents[0]).not.toHaveProperty("evidence");
  });

  it("migrates an older V2 document and keeps contextual saves outside mastery", () => {
    const now = "2026-08-24T04:00:00.000Z";
    const olderV2 = createEmptyReaderProgress(scope, now) as unknown as Record<string, unknown>;
    delete olderV2.savedEntries;
    const migrated = parseReaderProgress(olderV2, scope, now);
    expect(migrated.savedEntries).toEqual({});

    const saved = toggleReaderSavedEntry(migrated, {
      entryId: "reader-char:U+7075",
      simplified: "灵",
      pinyin: null,
      partOfSpeechVi: "chữ Hán trong ngữ cảnh",
      contextualMeaningVi: "Chữ xuất hiện trong đoạn thử nghiệm.",
      sourceType: "reader-character-fallback",
    }, "2026-08-24T04:01:00.000Z");
    expect(saved.savedEntries["reader-char:U+7075"]).toMatchObject({
      simplified: "灵",
      savedAt: "2026-08-24T04:01:00.000Z",
    });
    expect(saved.savedEntries["reader-char:U+7075"]).not.toHaveProperty("mastery");
    expect(saved.savedEntries["reader-char:U+7075"]).not.toHaveProperty("fsrs");
    const coreSaved = toggleReaderSavedEntry(saved, {
      entryId: "reader-core:hsk-vocab-00254",
      simplified: "一",
      traditional: "一",
      pinyin: "yī",
      partOfSpeechVi: "số từ",
      contextualMeaningVi: "một",
      sourceType: "hanzi-os-core",
    }, "2026-08-24T04:01:30.000Z");
    expect(parseReaderProgress(coreSaved, scope).savedEntries["reader-core:hsk-vocab-00254"])
      .toMatchObject({ simplified: "一", sourceType: "hanzi-os-core" });
    expect(removeReaderSavedEntry(saved, "reader-char:U+7075", "2026-08-24T04:02:00.000Z").savedEntries)
      .toEqual({});
  });

  it("always resolves every legacy assessment state to the independent library", () => {
    const series = READER_SERIES_CATALOG[0]!;
    const states: LegacyReaderState[] = [
      "none", "active", "submitted", "abandoned", "stale",
      "previously-exposed", "sync-error", "offline",
    ];
    states.forEach((legacyState) => {
      const entry = resolveReaderEntry({
        progress: createEmptyReaderProgress(scope),
        series,
        legacyState,
      });
      expect(entry.destination).toBe("library");
      expect(entry.chapterId).toBe("jade-lantern-archive-c01");
    });
  });
});
