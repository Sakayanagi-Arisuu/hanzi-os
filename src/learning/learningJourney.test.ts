import { describe, expect, it } from "vitest";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import type { LearningState, MistakeRecord } from "../types";
import { buildDailyLearningJourney } from "./learningJourney";

const completion = (
  bestScore: number,
): LearningState["completedLessons"][string] => ({
  score: bestScore,
  bestScore,
  attempts: 1,
  completedAt: "2026-08-12T08:00:00.000Z",
});

const makeMistake = (
  overrides: Partial<MistakeRecord> = {},
): MistakeRecord => ({
  id: "mistake-1",
  lessonId: "boot-1",
  questionId: "boot-1:q1",
  wordId: "yi",
  kind: "recall",
  skill: "vocabulary",
  prompt: "Một",
  selectedAnswer: "",
  correctAnswer: "一",
  explanation: "Nhớ lại chữ và nghĩa.",
  occurrences: 1,
  correctedStreak: 0,
  resolved: false,
  lastAttemptAt: "2026-08-12T08:00:00.000Z",
  ...overrides,
});

const makeState = (
  overrides: Partial<LearningState> = {},
): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Hành giả thử nghiệm",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "hsk1",
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
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
  ...overrides,
});

describe("buildDailyLearningJourney", () => {
  it("orders one bounded session as Learn → Review → Transfer → Close using real content", () => {
    const state = makeState({
      profile: {
        ...makeState().profile,
        dailyMinutes: 10,
      },
    });
    const journey = buildDailyLearningJourney({ state, dueWordIds: [] });

    expect(journey.learnLessonId).toBe("boot-1");
    expect(journey.transferSourceLessonId).toBe("boot-1");
    expect(journey.steps.map((step) => step.stage)).toEqual([
      "learn",
      "review",
      "transfer",
      "close",
    ]);
    expect(journey.steps.map((step) => step.sequence)).toEqual([1, 2, 3, 4]);
    expect(journey.steps[0].to).toBe("/lesson/boot-1");
    expect(journey.steps[2].to).toBe("/pronunciation?lesson=boot-1");
    expect(journey.steps[3].to).toBe("/path");
    expect(journey.steps.reduce((sum, step) => sum + step.minutes, 0)).toBe(10);
    expect(RELEASED_LESSONS.some((lesson) => lesson.id === journey.learnLessonId)).toBe(true);
    expect(journey.steps.flatMap((step) => step.wordIds).every((wordId) =>
      RELEASED_WORD_BY_ID.has(wordId)
    )).toBe(true);
  });

  it("returns stable IDs and does not mutate learner state or the due queue", () => {
    const state = makeState({ mistakes: [makeMistake()] });
    const dueWordIds = ["hao", "ni"];
    const stateBefore = structuredClone(state);
    const dueBefore = [...dueWordIds];

    const first = buildDailyLearningJourney({ state, dueWordIds });
    const second = buildDailyLearningJourney({ state, dueWordIds });

    expect(first.id).toBe(second.id);
    expect(first.steps.map((step) => step.id)).toEqual(
      second.steps.map((step) => step.id),
    );
    expect(state).toEqual(stateBefore);
    expect(dueWordIds).toEqual(dueBefore);
  });

  it("prioritizes unresolved active-path mistakes, then uses the released FSRS queue", () => {
    const mistakeJourney = buildDailyLearningJourney({
      state: makeState({
        mistakes: [
          makeMistake(),
          makeMistake({ id: "resolved", resolved: true }),
          makeMistake({ id: "unknown", lessonId: "not-released" }),
        ],
      }),
      dueWordIds: ["ni"],
    });

    expect(mistakeJourney.unresolvedMistakeCount).toBe(1);
    expect(mistakeJourney.steps[1]).toEqual(expect.objectContaining({
      kind: "mistakes",
      to: "/mistakes",
      status: "action",
    }));

    const dueJourney = buildDailyLearningJourney({
      state: makeState(),
      dueWordIds: ["ni", "ni", "not-released"],
    });
    expect(dueJourney.dueWordCount).toBe(1);
    expect(dueJourney.steps[1]).toEqual(expect.objectContaining({
      kind: "fsrs",
      to: "/review",
      wordIds: ["ni"],
    }));
  });

  it("keeps the review stage visible but clear when no released item is due", () => {
    const journey = buildDailyLearningJourney({
      state: makeState(),
      dueWordIds: ["not-released"],
    });

    expect(journey.steps[1]).toEqual(expect.objectContaining({
      stage: "review",
      status: "clear",
      minutes: 0,
      wordIds: [],
    }));
    expect(journey.steps.reduce((sum, step) => sum + step.minutes, 0)).toBe(20);
  });

  it("routes conversation through linked pronunciation practice", () => {
    const state = makeState({
      profile: { ...makeState().profile, goal: "conversation" },
    });
    const journey = buildDailyLearningJourney({ state, dueWordIds: [] });
    expect(journey.steps[2]).toEqual(expect.objectContaining({
      kind: "pronunciation",
      to: "/pronunciation?lesson=boot-1",
      sourceLessonId: "boot-1",
    }));
    expect(journey.steps[2].reason).toContain("Bốn thanh điệu");
  });

  it("routes travel into the lesson-scoped vocabulary challenge", () => {
    const state = makeState({
      profile: { ...makeState().profile, goal: "travel" },
    });
    const journey = buildDailyLearningJourney({ state, dueWordIds: [] });
    expect(journey.steps[2]).toEqual(expect.objectContaining({
      kind: "dictionary",
      to: "/dictionary?lesson=boot-1&challenge=1",
      sourceLessonId: "boot-1",
    }));
    expect(journey.steps[2].reason).toContain("Bốn thanh điệu");
  });

  it("uses assessment before placement, then learns boot-2 while transferring the just-completed boot-1", () => {
    const unplaced = makeState({
      profile: { ...makeState().profile, goal: "hsk" },
    });
    const assessmentJourney = buildDailyLearningJourney({
      state: unplaced,
      dueWordIds: [],
    });
    expect(assessmentJourney.steps[2]).toEqual(expect.objectContaining({
      kind: "assessment",
      to: "/assessment",
    }));

    const placed = makeState({
      profile: { ...makeState().profile, goal: "hsk" },
      completedLessons: { "boot-1": completion(80) },
      diagnostic: {
        completed: true,
        score: 72,
        recommendedLessonId: "boot-2",
        completedAt: "2026-08-12T08:00:00.000Z",
      },
    });
    const readerJourney = buildDailyLearningJourney({
      state: placed,
      dueWordIds: [],
    });
    expect(readerJourney.steps[2]).toEqual(expect.objectContaining({
      kind: "reader",
      to: "/reader?lesson=boot-1",
      sourceLessonId: "boot-1",
    }));
    expect(readerJourney.learnLessonId).toBe("boot-2");
    expect(readerJourney.transferSourceLessonId).toBe("boot-1");
    expect(readerJourney.steps[1].sourceLessonId).toBe("boot-1");
    expect(readerJourney.steps[3].sourceLessonId).toBe("boot-1");
  });

  it("selects the latest passed lesson by completion time as the stable session anchor", () => {
    const state = makeState({
      completedLessons: {
        "boot-1": {
          ...completion(90),
          completedAt: "2026-08-11T08:00:00.000Z",
        },
        "boot-2": {
          ...completion(90),
          completedAt: "2026-08-12T08:00:00.000Z",
        },
      },
    });
    const journey = buildDailyLearningJourney({ state, dueWordIds: [] });

    expect(journey.learnLessonId).toBe("boot-3");
    expect(journey.transferSourceLessonId).toBe("boot-2");
    expect(journey.steps[1].sourceLessonId).toBe("boot-2");
    expect(journey.steps[2].to).toBe("/pronunciation?lesson=boot-2");
    expect(journey.steps[3].sourceLessonId).toBe("boot-2");
  });

  it("routes career transfer to reading by default and writing for an open writing need", () => {
    const careerProfile = { ...makeState().profile, goal: "career" as const };
    const readerJourney = buildDailyLearningJourney({
      state: makeState({ profile: careerProfile }),
      dueWordIds: [],
    });
    expect(readerJourney.steps[2]).toEqual(expect.objectContaining({
      kind: "reader",
      to: "/reader?lesson=boot-1",
    }));

    const writingJourney = buildDailyLearningJourney({
      state: makeState({
        profile: careerProfile,
        mistakes: [makeMistake({ skill: "writing" })],
      }),
      dueWordIds: [],
    });
    expect(writingJourney.steps[2]).toEqual(expect.objectContaining({
      kind: "writing",
      to: "/characters?lesson=boot-1",
    }));
  });

  it("does not describe XP, transcript, or completed steps as mastery evidence", () => {
    const journey = buildDailyLearningJourney({
      state: makeState(),
      dueWordIds: [],
    });
    const copy = [
      journey.evidenceNotice,
      ...journey.steps.flatMap((step) => [step.title, step.reason]),
    ].join(" ");

    expect(copy).not.toMatch(/đã thành thạo|đã vững|mastery/i);
    expect(journey.evidenceNotice).toContain("không tự tạo kết luận thành thạo");
    expect(journey.steps[2].reason).toContain("không phải điểm phát âm");
  });
});
