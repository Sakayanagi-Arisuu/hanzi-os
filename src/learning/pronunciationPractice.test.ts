import { describe, expect, it } from "vitest";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  RELEASED_VOCABULARY,
} from "../data/curriculum";
import type {
  LearningEvidence,
  LearningState,
  VocabularyItem,
} from "../types";
import {
  applyPronunciationQuestReward,
  isPronunciationMissionComplete,
  PRONUNCIATION_DAILY_CHALLENGE_COUNT,
  PRONUNCIATION_QUEST_XP,
  selectDailyPronunciationMission,
  selectPronunciationLessonOptions,
  summarizePronunciationPractice,
  TRANSCRIPT_CLEAR_THRESHOLD,
} from "./pronunciationPractice";

const makeState = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Hành giả thử nghiệm",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "hsk2",
    onboarded: true,
  },
  xp: 30,
  dailyXp: 5,
  streak: 2,
  lastStudyDate: "2026-08-11",
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 4,
    listening: 3,
    speaking: 2,
    reading: 1,
    writing: 0,
    vocabulary: 5,
    grammar: 1,
  },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
});

describe("pronunciation path unlock authority", () => {
  it("includes available lessons beyond starting level without claiming completion", () => {
    const state = makeState();
    state.profile.startingLevel = "zero";
    const unlockedLessonIds = new Set(RELEASED_LESSONS.map((lesson) => lesson.id));
    const options = selectPronunciationLessonOptions({ state, vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS, passedLessonIds: new Set(), unlockedLessonIds });
    expect(options.length).toBeGreaterThan(4);
    const target = options.find((option) => option.id.startsWith("hsk2"))!;
    expect(target).toBeDefined();
    const mission = selectDailyPronunciationMission({ state, vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS, passedLessonIds: new Set(), unlockedLessonIds,
      requestedLessonId: target.id });
    expect(mission.anchorLessonId).toBe(target.id);
    expect(mission.relationship).toBe("learn-first");
    expect(mission.challenges.every((challenge) => challenge.sourceLessonId === target.id)).toBe(true);
    expect(state.completedLessons).toEqual({});
  });
  it("does not list lessons outside the supplied unlock authority", () => {
    const options = selectPronunciationLessonOptions({ state: makeState(), vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS, unlockedLessonIds: new Set(), passedLessonIds: new Set() });
    expect(options).toEqual([]);
  });
});

const makeEvidence = (
  activityId: string,
  id: string,
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence => ({
  id,
  idempotencyKey: id,
  schemaVersion: 1,
  contentVersion: CONTENT_VERSION,
  activityVersion: `${CONTENT_VERSION}:browser-speech:1`,
  source: "pronunciation",
  method: "speech-transcript",
  activityId,
  skill: "speaking",
  outcome: "unverified",
  score: 72,
  verified: false,
  masteryEligible: false,
  occurredAt: "2026-08-12T08:00:00.000Z",
  ...overrides,
});

describe("daily pronunciation mission", () => {
  it("starts a new learner with the four words from the real first lesson", () => {
    const date = new Date(2026, 7, 12, 10, 0, 0);
    const state = makeState();
    state.profile.startingLevel = "zero";
    const first = selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      date,
    });
    const replay = selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      date,
    });

    expect(first).toEqual(replay);
    expect(first.id).toContain(`${CONTENT_VERSION}:2026-08-12:boot-1`);
    expect(first.rewardKey).toBe(`pronunciation-daily:${CONTENT_VERSION}:2026-08-12`);
    expect(first.anchorLessonId).toBe("boot-1");
    expect(first.anchorLessonTitle).toBe("Bốn thanh điệu");
    expect(first.relationship).toBe("learn-first");
    expect(first.challenges).toHaveLength(4);
    expect(first.challenges.map((item) => item.focusWordId)).toEqual(["yi", "ren", "ni", "er"]);
    expect(new Set(first.challenges.map((item) => item.focusWordId))).toEqual(
      new Set(["yi", "ren", "ni", "er"]),
    );
    expect(first.challenges.every((item) =>
      item.id === `pronunciation:${CONTENT_VERSION}:${item.focusWordId}`
      && item.activityId === item.id
      && item.focusTones.length > 0
      && item.sourceLessonId === "boot-1"
      && item.sourceLessonHref === "/lesson/boot-1"
      && item.sourceKind === "foundation"
      && item.focusWordPinyin.length > 0
      && item.focusWordMeaning.length > 0
      && item.focusSyllables.length > 0
    )).toBe(true);
  });

  it("reuses the latest completed lesson without mixing earlier lessons", () => {
    const state = makeState();
    state.profile.startingLevel = "hsk1";
    state.completedLessons = {
      "boot-1": {
        score: 82,
        bestScore: 82,
        attempts: 1,
        completedAt: "2026-08-11T08:00:00.000Z",
      },
      "boot-2": {
        score: 88,
        bestScore: 88,
        attempts: 1,
        completedAt: "2026-08-12T08:00:00.000Z",
      },
    };
    const mission = selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      date: new Date(2026, 7, 12, 12),
    });

    expect(mission.anchorLessonId).toBe("boot-2");
    expect(mission.relationship).toBe("apply-what-you-learned");
    expect(mission.nextLessonId).toBe("boot-3");
    expect(mission.challenges.length).toBeLessThanOrEqual(PRONUNCIATION_DAILY_CHALLENGE_COUNT);
    expect(mission.challenges.map((item) => item.focusWordId)).toEqual([
      "ni", "hao", "wo",
    ]);
    expect(new Set(mission.challenges.map((item) => item.focusWordId))).toEqual(
      new Set(["ni", "hao", "wo"]),
    );
    expect(mission.challenges.every((item) => item.sourceLessonId === "boot-2")).toBe(true);
    expect(mission.challenges.every((item) => item.sourceKind === "completed")).toBe(true);
  });

  it("honors a completed lesson selected by the learner", () => {
    const state = makeState();
    state.profile.startingLevel = "hsk1";
    state.completedLessons = {
      "boot-1": {
        score: 82,
        bestScore: 82,
        attempts: 1,
        completedAt: "2026-08-11T08:00:00.000Z",
      },
      "boot-2": {
        score: 88,
        bestScore: 88,
        attempts: 1,
        completedAt: "2026-08-12T08:00:00.000Z",
      },
    };

    const mission = selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      requestedLessonId: "boot-1",
      date: new Date(2026, 7, 12, 12),
    });

    expect(mission.anchorLessonId).toBe("boot-1");
    expect(mission.rewardKey).toBe(`pronunciation-daily:${CONTENT_VERSION}:2026-08-12`);
    expect(mission.challenges.map((item) => item.focusWordId)).toEqual(["yi", "ren", "ni", "er"]);
    expect(mission.challenges.every((item) => item.sourceLessonId === "boot-1")).toBe(true);
  });

  it("does not open an unfinished requested lesson", () => {
    const state = makeState();
    state.profile.startingLevel = "hsk1";
    state.completedLessons = {
      "boot-1": {
        score: 82,
        bestScore: 82,
        attempts: 1,
        completedAt: "2026-08-11T08:00:00.000Z",
      },
    };

    const mission = selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      requestedLessonId: "boot-2",
      date: new Date(2026, 7, 12, 12),
    });

    expect(mission.anchorLessonId).toBe("boot-1");
    expect(mission.challenges.every((item) => item.sourceLessonId === "boot-1")).toBe(true);
  });

  it("lists only completed lessons that contain pronunciation material", () => {
    const state = makeState();
    state.profile.startingLevel = "hsk1";
    state.completedLessons = {
      "boot-1": {
        score: 82,
        bestScore: 82,
        attempts: 1,
        completedAt: "2026-08-11T08:00:00.000Z",
      },
      "boot-2": {
        score: 88,
        bestScore: 88,
        attempts: 1,
        completedAt: "2026-08-12T08:00:00.000Z",
      },
    };

    expect(selectPronunciationLessonOptions({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
    })).toEqual([
      expect.objectContaining({ id: "boot-1", title: "Bốn thanh điệu", challengeCount: 4 }),
      expect.objectContaining({ id: "boot-2", challengeCount: 3 }),
    ]);
  });

  it("uses authoritative passed lessons for an authenticated Vạn Âm library", () => {
    const state = makeState();
    state.profile.startingLevel = "hsk1";
    state.completedLessons = {};
    const passedLessonIds = new Set(["boot-1"]);

    expect(selectPronunciationLessonOptions({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      passedLessonIds,
    })).toEqual([
      expect.objectContaining({ id: "boot-1", challengeCount: 4 }),
    ]);

    const mission = selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      passedLessonIds,
      requestedLessonId: "boot-1",
      date: new Date(2026, 7, 12, 12),
    });
    expect(mission.anchorLessonId).toBe("boot-1");
    expect(mission.relationship).toBe("apply-what-you-learned");
    expect(mission.challenges.every((item) => item.sourceKind === "completed")).toBe(true);
  });

  it("does not carry completion into a newly selected lesson", () => {
    expect(isPronunciationMissionComplete({
      missionId: "mission:boot-2",
      activeMissionId: "mission:boot-1",
      challengeIds: ["boot-2:1", "boot-2:2"],
      completedPhraseIds: new Set(["boot-1:1", "boot-1:2", "boot-1:3"]),
    })).toBe(false);

    expect(isPronunciationMissionComplete({
      missionId: "mission:boot-2",
      activeMissionId: "mission:boot-2",
      challengeIds: ["boot-2:1", "boot-2:2"],
      completedPhraseIds: new Set(["boot-2:1", "boot-2:2"]),
    })).toBe(true);
  });

  it("filters editorial templates, bare vocabulary and overlong beginner rows", () => {
    const base = RELEASED_VOCABULARY.find((item) => item.hsk === 1);
    if (!base) throw new Error("Missing released HSK1 fixture");
    const fixture = (id: string, example: string): VocabularyItem => ({
      ...base,
      id,
      simplified: "好",
      example,
      examplePinyin: "wǒ hěn hǎo",
      exampleMeaning: "Tôi rất khỏe.",
    });
    const vocabulary = [
      fixture("valid", "我很好。"),
      fixture("duplicate", "我很好！"),
      fixture("template", "好是本课材料中的重点词语。"),
      fixture("bare", "好"),
      fixture("alternative", "我很好／你很好"),
      fixture("long", "我今天真的非常非常非常非常非常非常好。"),
    ];

    const state = makeState();
    state.profile.startingLevel = "zero";
    const bootLesson = RELEASED_LESSONS.find((lesson) => lesson.id === "boot-1");
    if (!bootLesson) throw new Error("Missing released boot lesson fixture");
    const mission = selectDailyPronunciationMission({
      vocabulary,
      lessons: [{ ...bootLesson, wordIds: vocabulary.map((word) => word.id) }],
      state,
      date: new Date(2026, 7, 12, 12),
    });

    expect(mission.poolSize).toBe(1);
    expect(mission.challenges.map((item) => item.focusWordId)).toEqual(["valid"]);
  });

  it("ignores a requested lesson outside the learner's released path", () => {
    const state = makeState();
    state.profile.startingLevel = "zero";
    const unavailableRequest = RELEASED_LESSONS.find((lesson) => lesson.unitId !== "boot");
    if (!unavailableRequest) throw new Error("Missing out-of-path lesson fixture");

    const mission = selectDailyPronunciationMission({
      vocabulary: RELEASED_VOCABULARY,
      lessons: RELEASED_LESSONS,
      state,
      requestedLessonId: unavailableRequest.id,
      date: new Date(2026, 7, 12, 12),
    });

    expect(mission.anchorLessonId).toBe("boot-1");
    expect(mission.challenges.every((item) => item.sourceLessonId === "boot-1")).toBe(true);
  });

  it("publishes the transcript gate as a recognition threshold, not mastery", () => {
    expect(TRANSCRIPT_CLEAR_THRESHOLD).toBe(85);
  });
});

describe("pronunciation practice summary", () => {
  it("counts unique challenge activities while retaining retry attempts", () => {
    const evidence = [
      makeEvidence("speech:0", "legacy-first"),
      makeEvidence("speech:0", "legacy-retry"),
      makeEvidence(
        `pronunciation:${CONTENT_VERSION}:hao`,
        "daily-first",
        { occurredAt: "2026-08-12T09:00:00.000Z" },
      ),
      makeEvidence(
        `pronunciation:${CONTENT_VERSION}:hao`,
        "daily-retry",
        { occurredAt: "2026-08-12T10:00:00.000Z" },
      ),
      makeEvidence("ignored-reader", "reader", {
        source: "reader",
        method: "reading-comprehension",
      }),
    ];

    expect(summarizePronunciationPractice(evidence)).toEqual({
      uniqueActivityCount: 2,
    });
  });
});

describe("pronunciation quest reward", () => {
  it("awards interaction XP once without changing mastery or evidence", () => {
    const state = makeState();
    const masteryBefore = state.skillMastery;
    const evidenceBefore = state.evidence;
    const completedLessonsBefore = state.completedLessons;
    const fsrsBefore = state.fsrsCards;
    const knowledgeBefore = state.knowledge;
    const mistakesBefore = state.mistakes;
    const occurredAt = new Date(2026, 7, 12, 10, 30, 0);
    const first = applyPronunciationQuestReward(
      state,
      "pronunciation-daily:test",
      occurredAt,
    );

    expect(first.awarded).toBe(true);
    expect(first.state.xp).toBe(state.xp + PRONUNCIATION_QUEST_XP);
    expect(first.state.dailyXp).toBe(PRONUNCIATION_QUEST_XP);
    expect(first.state.streak).toBe(3);
    expect(first.state.lastStudyDate).toBe("2026-08-12");
    expect(first.state.activityLog).toEqual([{
      id: "practice-reward:pronunciation-daily:test",
      type: "practice",
      label: "Ải Cộng Hưởng · hoàn thành phiên luyện đọc",
      xp: PRONUNCIATION_QUEST_XP,
      occurredAt: occurredAt.toISOString(),
    }]);
    expect(first.state.skillMastery).toBe(masteryBefore);
    expect(first.state.evidence).toBe(evidenceBefore);
    expect(first.state.completedLessons).toBe(completedLessonsBefore);
    expect(first.state.fsrsCards).toBe(fsrsBefore);
    expect(first.state.knowledge).toBe(knowledgeBefore);
    expect(first.state.mistakes).toBe(mistakesBefore);
    expect(state.xp).toBe(30);

    const replay = applyPronunciationQuestReward(
      first.state,
      "pronunciation-daily:test",
      new Date(2026, 7, 12, 11),
    );
    expect(replay).toEqual({ state: first.state, awarded: false });
    expect(replay.state).toBe(first.state);
  });

  it("adds to today's XP without incrementing the same-day streak", () => {
    const state = makeState();
    state.lastStudyDate = "2026-08-12";
    const result = applyPronunciationQuestReward(
      state,
      "pronunciation-daily:same-day",
      new Date(2026, 7, 12, 15),
    );

    expect(result.state.dailyXp).toBe(5 + PRONUNCIATION_QUEST_XP);
    expect(result.state.streak).toBe(2);
  });
});
