import { describe, expect, it, vi } from "vitest";
import { RELEASED_LESSONS } from "../data/curriculum";
import {
  parsePublishedStudioVocabulary,
  type DictionaryWord,
} from "./publishedStudioVocabulary";
import {
  loadPublishedStudioVocabulary,
  mergePublishedStudioVocabulary,
} from "./publishedStudioClient";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";

const sourceLesson = RELEASED_LESSONS.find((lesson) =>
  studioLessonMatchesLevel(lesson.unitId, "hsk1")
)!;

const runtimeItem = (overrides: Record<string, unknown> = {}) => ({
  stableKey: "studio-vocab-xin-chao",
  itemType: "vocabulary",
  level: "hsk1",
  title: "Lời chào buổi sáng",
  revision: 2,
  revisionId: "revision-vocabulary-2",
  schemaVersion: 1,
  contentSha256: "sha256:content",
  publishedAt: 1_770_000_000_000,
  content: {
    hanzi: "早上好",
    pinyin: "zǎo shang hǎo",
    meaningVi: "chào buổi sáng; buổi sáng tốt lành",
    examples: [{ hanzi: "老师，早上好！", pinyin: "Lǎoshī, zǎo shang hǎo!", meaningVi: "Thầy ơi, chào buổi sáng!" }],
    sourceLessonIds: [sourceLesson.id],
    review: {
      humanReviewed: false,
      aiSelfReview: {
        accuracy: true,
        levelFit: true,
        pedagogy: true,
        answerIntegrity: true,
        originality: true,
      },
    },
  },
  ...overrides,
});

const runtimeManifest = (items: unknown[]) => ({
  schemaVersion: 1,
  policy: "published-only",
  releaseBoundary: "content-release-worker-v1",
  items,
});

describe("published Studio vocabulary projection", () => {
  it("maps a published vocabulary package into a learner-safe dictionary entry", () => {
    expect(parsePublishedStudioVocabulary(runtimeManifest([runtimeItem()])))
      .toEqual([expect.objectContaining({
        id: "studio-vocab-xin-chao",
        simplified: "早上好",
        pinyinNumbered: "zao3 shang5 hao3",
        toneNumbers: [3, 0, 3],
        senses: ["chào buổi sáng", "buổi sáng tốt lành"],
        sourceKind: "studio",
        sourceTitle: "Lời chào buổi sáng",
        sourceLessonIds: [sourceLesson.id],
        isCore: false,
      })]);
  });

  it("fails closed for a non-published manifest or one malformed item", () => {
    expect(() => parsePublishedStudioVocabulary({
      ...runtimeManifest([]),
      policy: "preview",
    })).toThrow(/manifest/u);
    expect(() => parsePublishedStudioVocabulary(runtimeManifest([
      runtimeItem({ content: { hanzi: "早上好" } }),
    ]))).toThrow(/invalid item/u);
  });

  it("overlays a matching stable id while preserving learner relationships", () => {
    const current: DictionaryWord = {
      id: "studio-vocab-xin-chao",
      simplified: "早安",
      traditional: "早安",
      pinyin: "zǎo ān",
      pinyinNumbered: "zao3 an1",
      meaning: "chào buổi sáng",
      senses: ["chào buổi sáng"],
      classifiers: ["句"],
      partOfSpeech: "thán từ",
      toneNumbers: [3, 1],
      tags: ["Bài cốt lõi"],
      isCore: true,
    };
    const [published] = parsePublishedStudioVocabulary(runtimeManifest([runtimeItem()]));
    const [merged] = mergePublishedStudioVocabulary([current], [published]);
    expect(merged).toMatchObject({
      id: current.id,
      simplified: "早上好",
      traditional: "早安",
      meaning: "chào buổi sáng; buổi sáng tốt lành",
      classifiers: ["句"],
      partOfSpeech: "thán từ",
      isCore: true,
      sourceKind: "studio",
    });
  });

  it("uses a no-store public runtime request and rejects an unavailable response", async () => {
    const fetcher = vi.fn(async () => Response.json({
      schemaVersion: 1,
      projection: "vocabulary",
      items: parsePublishedStudioVocabulary(runtimeManifest([runtimeItem()])),
    })) as typeof fetch;
    await expect(loadPublishedStudioVocabulary(fetcher)).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/content/runtime?projection=vocabulary",
      expect.objectContaining({ cache: "no-store" }),
    );
    const unavailable = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;
    await expect(loadPublishedStudioVocabulary(unavailable)).rejects.toThrow(/unavailable/u);
  });
});
