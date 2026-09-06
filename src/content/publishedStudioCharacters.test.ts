import { describe, expect, it, vi } from "vitest";
import { RELEASED_LESSONS } from "../data/curriculum";
import type { ReleasedCharacterPracticeEntry } from "../learning/richLessonContent";
import {
  parsePublishedStudioCharacters,
} from "./publishedStudioCharacters";
import {
  loadPublishedStudioCharacters,
  mergePublishedStudioCharacters,
} from "./publishedStudioClient";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";

const lesson = RELEASED_LESSONS.find((entry) =>
  studioLessonMatchesLevel(entry.unitId, "hsk1")
)!;
const item = (overrides: Record<string, unknown> = {}) => ({
  stableKey: "hsk1.character.ni",
  itemType: "character",
  level: "hsk1",
  title: "Chữ 你 trong lời chào",
  revision: 2,
  revisionId: "revision-character-2",
  schemaVersion: 1,
  contentSha256: "sha256:character-content",
  publishedAt: 1_770_000_000_000,
  content: {
    hanzi: "你",
    pinyin: "nǐ",
    meaningVi: "bạn",
    context: { hanzi: "你好", pinyin: "nǐ hǎo", meaningVi: "xin chào" },
    sourceLessonIds: [lesson.id],
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
const manifest = (items: unknown[]) => ({
  schemaVersion: 1,
  policy: "published-only",
  releaseBoundary: "content-release-worker-v1",
  items,
});

describe("published Studio character projection", () => {
  it("projects a reviewed character into every linked lesson and replaces its core presentation", () => {
    const [published] = parsePublishedStudioCharacters(manifest([item()]));
    expect(published).toMatchObject({
      id: `hsk1.character.ni:${lesson.id}`,
      hanzi: "你",
      contextWord: "你好",
      lessonId: lesson.id,
    });
    const current: ReleasedCharacterPracticeEntry = {
      id: "core-ni",
      hanzi: "你",
      pinyin: "nǐ",
      meaningVi: "bạn",
      contextWord: "你们",
      contextPinyin: "nǐmen",
      contextMeaningVi: "các bạn",
      level: "hsk1",
      lessonId: lesson.id,
    };
    expect(mergePublishedStudioCharacters([current], [published])).toEqual([published]);
  });

  it("fails closed for malformed review, level linkage, or duplicate character ownership", () => {
    expect(() => parsePublishedStudioCharacters(manifest([item({
      content: { ...(item().content as object), review: { humanReviewed: true } },
    })]))).toThrow(/invalid item/u);
    expect(() => parsePublishedStudioCharacters(manifest([item({ level: "hsk4" })])))
      .toThrow(/invalid item/u);
    expect(() => parsePublishedStudioCharacters(manifest([
      item(),
      item({ stableKey: "hsk1.character.ni.duplicate", revisionId: "duplicate" }),
    ]))).toThrow(/duplicate/u);
  });

  it("loads only the published character boundary with no-store", async () => {
    const fetcher = vi.fn(async () => Response.json({
      schemaVersion: 1,
      projection: "character",
      items: parsePublishedStudioCharacters(manifest([item()])),
    })) as typeof fetch;
    await expect(loadPublishedStudioCharacters(fetcher)).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/content/runtime?projection=character",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
