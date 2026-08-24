import runtimeCatalogJson from "../../../content/packages/foundation-2026.08.5/runtime-catalog.json";
import { describe, expect, it } from "vitest";
import { resolveReaderEntry, type LegacyReaderState } from "./readerEntryResolver";
import {
  countHanzi,
  loadReaderChapter,
  READER_CHAPTER_LOADERS,
  validateReaderChapter,
} from "./readerChapterLoader";
import { readerChapterIdentity } from "./readerContentModel";
import { READER_REFERENCE_ENTRY_BY_ID } from "./readerLexicon";
import {
  READER_DISCOVERABLE_SERIES,
  READER_SERIES_CATALOG,
} from "./readerManifest";
import { READER_SHELF_OPTIONS } from "./readerShelfCatalog";
import {
  completeReaderChapter,
  createEmptyReaderProgress,
  parseReaderProgress,
  recordReaderSupport,
  resolveReadingMode,
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

describe("Vạn Quyển Các Mốc 1 content model", () => {
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
          });
      });
      if (series.seriesId === "jade-lantern-archive") {
        expect(countHanzi(chapter.paragraphs.map((paragraph) => paragraph.zhHans).join("")))
          .toBeGreaterThanOrEqual(350);
        expect(countHanzi(chapter.paragraphs.map((paragraph) => paragraph.zhHans).join("")))
          .toBeLessThanOrEqual(650);
      }
    }
  });

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
