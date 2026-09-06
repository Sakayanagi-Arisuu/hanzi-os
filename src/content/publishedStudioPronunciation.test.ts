import { describe, expect, it, vi } from "vitest";
import { RELEASED_LESSONS } from "../data/curriculum";
import {
  parsePublishedStudioPronunciation,
} from "./publishedStudioPronunciation";
import { loadPublishedStudioPronunciation } from "./publishedStudioClient";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";

const lesson = RELEASED_LESSONS.find((entry) =>
  studioLessonMatchesLevel(entry.unitId, "hsk1")
)!;
const item = (overrides: Record<string, unknown> = {}) => ({
  stableKey: "hsk1.pronunciation.tone-pair",
  itemType: "pronunciation",
  level: "hsk1",
  title: "Phân biệt thanh 1 và thanh 3",
  revision: 1,
  revisionId: "revision-pronunciation-1",
  schemaVersion: 1,
  contentSha256: "sha256:pronunciation",
  publishedAt: 1_770_000_000_000,
  content: {
    targetKind: "tone-system",
    targets: ["mā / mǎ"],
    conceptVi: "Nghe đường cao độ trước khi nhìn nghĩa.",
    ruleVi: "Thanh 1 giữ cao; thanh 3 hạ rồi nhấc.",
    examples: [
      { hanzi: "妈", pinyin: "mā", meaningVi: "mẹ" },
      { hanzi: "马", pinyin: "mǎ", meaningVi: "ngựa" },
    ],
    pitfallVi: "Không thay đường cao độ bằng độ lớn.",
    checkpointVi: "Nghe rồi tự chọn thanh trước khi đọc.",
    sourceLessonIds: [lesson.id],
    audioSource: "browser-tts",
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

describe("published Studio pronunciation projection", () => {
  it("indexes a reviewed guide by every linked learner lesson", () => {
    expect(parsePublishedStudioPronunciation(manifest([item()])).get(lesson.id))
      .toEqual([expect.objectContaining({
        title: "Phân biệt thanh 1 và thanh 3",
        targets: ["mā / mǎ"],
        audioSource: "browser-tts",
      })]);
  });

  it("fails closed for review or level-link drift", () => {
    expect(() => parsePublishedStudioPronunciation(manifest([{
      ...item(),
      content: { ...item().content, review: { humanReviewed: true } },
    }]))).toThrow(/invalid item/u);
    expect(() => parsePublishedStudioPronunciation(manifest([item({ level: "hsk4" })])))
      .toThrow(/invalid item/u);
  });

  it("loads the published pronunciation boundary with no-store", async () => {
    const fetcher = vi.fn(async () => Response.json({
      schemaVersion: 1,
      projection: "pronunciation",
      items: [...parsePublishedStudioPronunciation(manifest([item()]))],
    })) as typeof fetch;
    await expect(loadPublishedStudioPronunciation(fetcher)).resolves.toBeInstanceOf(Map);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/content/runtime?projection=pronunciation",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
