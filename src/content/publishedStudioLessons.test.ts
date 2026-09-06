import { beforeEach, describe, expect, it, vi } from "vitest";
import { RELEASED_LESSONS } from "../data/curriculum";
import {
  parsePublishedStudioLearning,
  parsePublishedStudioLessons,
} from "./publishedStudioLessons";
import {
  loadPublishedStudioLessons,
  mergePublishedStudioLessonEnhancement,
} from "./publishedStudioClient";
import { studioLessonMatchesLevel } from "./studioLessonIdentity";
import {
  getPublishedStudioLessonSnapshotForTests,
  refreshPublishedStudioLessons,
  resetPublishedStudioLessonCacheForTests,
} from "./usePublishedStudioLessons";

const target = RELEASED_LESSONS.find((lesson) =>
  studioLessonMatchesLevel(lesson.unitId, "hsk1")
)!;

const runtimeItem = (overrides: Record<string, unknown> = {}) => ({
  stableKey: "hsk1.lesson.chao-hoi-fixture",
  itemType: "lesson",
  level: "hsk1",
  title: "Chào hỏi trong lớp",
  revision: 3,
  revisionId: "revision-lesson-3",
  schemaVersion: 1,
  contentSha256: "sha256:lesson-content",
  publishedAt: 1_770_000_000_000,
  content: {
    targetLessonId: target.id,
    titleZh: "课堂问候",
    objectiveVi: "Tự chào và giới thiệu trong lớp.",
    conceptVi: "Lời chào mở một lượt trao đổi ngắn.",
    ruleVi: "Chào trước, sau đó dùng 我是 để giới thiệu.",
    pitfallVi: "Không thêm 吗 vào câu kể giới thiệu.",
    checkpointVi: "Tự nói hai câu không nhìn mẫu.",
    prerequisites: target.prerequisiteIds,
    vocabulary: target.wordIds,
    skills: target.skills,
    dialogue: [
      { hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" },
      { hanzi: "你好，我是安。", pinyin: "Nǐ hǎo, wǒ shì Ān.", meaningVi: "Xin chào, tôi là An." },
    ],
    grammar: [{ pattern: "A 是 B", explanationVi: "Dùng 是 để giới thiệu danh tính." }],
    exercises: [{
      promptVi: "Hãy tự giới thiệu bằng một câu.",
      answer: "我是学生。",
      answerPinyin: "Wǒ shì xuésheng.",
      answerMeaningVi: "Tôi là học sinh.",
      distractors: ["我很好吗？", "你是学生吗？"],
      explanationVi: "我是学生 là một câu kể giới thiệu.",
    }],
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

const learningResponse = (items: unknown[]) => {
  const projected = parsePublishedStudioLearning(manifest(items));
  return {
    schemaVersion: 1,
    projection: "learning",
    items: [[...projected.lessons], [...projected.enhancements]],
  };
};

const reviewed = {
  humanReviewed: false,
  aiSelfReview: {
    accuracy: true,
    levelFit: true,
    pedagogy: true,
    answerIntegrity: true,
    originality: true,
  },
};

const grammarItem = () => ({
  stableKey: "hsk1.grammar.a-shi-b",
  itemType: "grammar",
  level: "hsk1",
  title: "Mẫu A 是 B",
  revision: 2,
  revisionId: "revision-grammar-2",
  schemaVersion: 1,
  contentSha256: "sha256:grammar",
  publishedAt: 1_770_000_000_000,
  content: {
    pattern: "A 是 B",
    explanationVi: "Dùng để giới thiệu danh tính.",
    pitfallVi: "Không thêm 吗 vào câu kể.",
    checkpointVi: "Tự tạo một câu giới thiệu.",
    examples: [{ hanzi: "我是学生。", pinyin: "Wǒ shì xuésheng.", meaningVi: "Tôi là học sinh." }],
    sourceLessonIds: [target.id],
    review: reviewed,
  },
});

const communicativeItem = () => ({
  stableKey: "hsk1.communication.greeting",
  itemType: "communicative_function",
  level: "hsk1",
  title: "Chào và giới thiệu",
  revision: 1,
  revisionId: "revision-communication-1",
  schemaVersion: 1,
  contentSha256: "sha256:communication",
  publishedAt: 1_770_000_000_000,
  content: {
    functionVi: "Chào và giới thiệu bản thân",
    scenarioVi: "Gặp bạn mới trong lớp.",
    outcomeVi: "Tự nói lời chào và tên.",
    skills: ["listening", "speaking"],
    sourceLessonIds: [target.id],
    dialogue: [
      { hanzi: "你好！", pinyin: "Nǐ hǎo!", meaningVi: "Xin chào!" },
      { hanzi: "你好，我是安。", pinyin: "Nǐ hǎo, wǒ shì Ān.", meaningVi: "Xin chào, tôi là An." },
    ],
    tasks: [{ promptVi: "Tự giới thiệu.", answer: "你好，我是安。", explanationVi: "Dùng 你好 và 我是…" }],
    review: reviewed,
  },
});

describe("published Studio lesson projection", () => {
  beforeEach(() => resetPublishedStudioLessonCacheForTests());

  it("overlays learner presentation while preserving the core runtime identity and graph", () => {
    const projected = parsePublishedStudioLessons(manifest([runtimeItem()])).get(target.id)!;

    expect(projected.lesson).toMatchObject({
      id: target.id,
      unitId: target.unitId,
      title: "Chào hỏi trong lớp",
      chineseTitle: "课堂问候",
      objective: "Tự chào và giới thiệu trong lớp.",
      minutes: target.minutes,
      xp: target.xp,
      contentVersion: target.contentVersion,
      releaseState: target.releaseState,
    });
    expect(projected.lesson.wordIds).toEqual(target.wordIds);
    expect(projected.lesson.prerequisiteIds).toEqual(target.prerequisiteIds);
    expect(projected.lesson.skills).toEqual(target.skills);
    expect(projected.guide).toMatchObject({
      concept: "Lời chào mở một lượt trao đổi ngắn.",
      checkpoint: "Tự nói hai câu không nhìn mẫu.",
    });
    expect(projected.richContent).toMatchObject({
      lessonId: target.id,
      authoringLessonId: "hsk1.lesson.chao-hoi-fixture",
      grammar: [expect.objectContaining({
        guidedPractice: expect.objectContaining({
          modelAnswerPinyin: "Wǒ shì xuésheng.",
        }),
      })],
    });
  });

  it("fails closed for graph drift, level drift, malformed review, or duplicate targets", () => {
    const changedGraph = runtimeItem({
      content: { ...(runtimeItem().content as object), prerequisites: [target.id] },
    });
    expect(() => parsePublishedStudioLessons(manifest([changedGraph]))).toThrow(/invalid item/u);
    expect(() => parsePublishedStudioLessons(manifest([runtimeItem({ level: "hsk4" })]))).toThrow(/invalid item/u);
    expect(() => parsePublishedStudioLessons(manifest([runtimeItem({
      content: { ...(runtimeItem().content as object), review: { humanReviewed: true } },
    })]))).toThrow(/invalid item/u);
    expect(() => parsePublishedStudioLessons(manifest([
      runtimeItem(),
      runtimeItem({ stableKey: "hsk1.lesson.duplicate", revisionId: "revision-duplicate" }),
    ]))).toThrow(/duplicate target/u);
  });

  it("attaches reviewed grammar and communicative tasks to their learner lesson", () => {
    const projection = parsePublishedStudioLearning(manifest([
      runtimeItem(),
      grammarItem(),
      communicativeItem(),
    ]));
    const enhancement = projection.enhancements.get(target.id)!;
    expect(enhancement).toMatchObject({
      grammar: [expect.objectContaining({ label: "A 是 B" })],
      topics: [expect.objectContaining({ officialTopic: "Chào và giới thiệu bản thân" })],
      tasks: [expect.objectContaining({ titleVi: "Tự giới thiệu." })],
    });
    expect(mergePublishedStudioLessonEnhancement(null, enhancement, target.id)).toMatchObject({
      lessonId: target.id,
      grammar: [expect.objectContaining({ guidedPractice: expect.any(Object) })],
    });
    expect(() => parsePublishedStudioLearning(manifest([{
      ...grammarItem(),
      content: { ...grammarItem().content, review: { humanReviewed: true } },
    }]))).toThrow(/invalid enhancement/u);
  });

  it("requests only the published lesson runtime with no-store and keeps failures closed", async () => {
    const fetcher = vi.fn(async () => Response.json(learningResponse([runtimeItem()]))) as typeof fetch;
    await expect(loadPublishedStudioLessons(fetcher)).resolves.toMatchObject({
      lessons: expect.any(Map),
      enhancements: expect.any(Map),
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/content/runtime?projection=learning",
      expect.objectContaining({ cache: "no-store" }),
    );
    const unavailable = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;
    await expect(loadPublishedStudioLessons(unavailable)).rejects.toThrow(/unavailable/u);
  });

  it("shares one request across route consumers and retains the accepted projection while revalidating", async () => {
    let resolveInitial!: (response: Response) => void;
    const initialFetcher = vi.fn(() => new Promise<Response>((resolve) => {
      resolveInitial = resolve;
    })) as unknown as typeof fetch;

    const first = refreshPublishedStudioLessons(initialFetcher);
    const second = refreshPublishedStudioLessons(initialFetcher);
    expect(second).toBe(first);
    expect(initialFetcher).toHaveBeenCalledTimes(1);

    resolveInitial(Response.json(learningResponse([runtimeItem()])));
    await first;
    expect(getPublishedStudioLessonSnapshotForTests()).toMatchObject({ status: "ready" });
    expect(getPublishedStudioLessonSnapshotForTests().lessons.has(target.id)).toBe(true);

    let resolveRevalidation!: (response: Response) => void;
    const revalidationFetcher = vi.fn(() => new Promise<Response>((resolve) => {
      resolveRevalidation = resolve;
    })) as unknown as typeof fetch;
    const revalidation = refreshPublishedStudioLessons(revalidationFetcher);

    expect(getPublishedStudioLessonSnapshotForTests().status).toBe("ready");
    expect(getPublishedStudioLessonSnapshotForTests().lessons.has(target.id)).toBe(true);
    resolveRevalidation(Response.json(learningResponse([runtimeItem({ revision: 4 })])));
    await revalidation;
    expect(getPublishedStudioLessonSnapshotForTests().lessons.get(target.id)?.source.revision).toBe(4);
  });

  it("clears a cached projection when revalidation fails", async () => {
    const accepted = vi.fn(async () => Response.json(learningResponse([runtimeItem()]))) as typeof fetch;
    await refreshPublishedStudioLessons(accepted);
    expect(getPublishedStudioLessonSnapshotForTests().lessons.size).toBe(1);

    const unavailable = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;
    await refreshPublishedStudioLessons(unavailable);
    expect(getPublishedStudioLessonSnapshotForTests().status).toBe("fallback");
    expect(getPublishedStudioLessonSnapshotForTests().lessons.size).toBe(0);
  });
});
