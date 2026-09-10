import { CONTENT_VERSION } from "../data/contentIdentity";
import {
  getActivePathReleasedLessons,
  getNextLesson,
  isLessonPassed,
} from "../lib/adaptive";
import type {
  LearningEvidence,
  LearningState,
  Lesson,
  MandarinTone,
  VocabularyItem,
} from "../types";
import type { StartingLevel } from "./startingLevels";

export const PRONUNCIATION_QUEST_XP = 10;
export const TRANSCRIPT_CLEAR_THRESHOLD = 85;
export const PRONUNCIATION_DAILY_CHALLENGE_COUNT = 6;

export type PronunciationChallenge = {
  id: string;
  activityId: string;
  chinese: string;
  pinyin: string;
  meaning: string;
  hsk: number;
  focusWordId: string;
  focusWord: string;
  focusWordPinyin: string;
  focusWordMeaning: string;
  focusTones: MandarinTone[];
  focusSyllables: Array<{
    marked: string;
    lexicalTone: MandarinTone;
  }>;
  sourceLessonId: string;
  sourceLessonTitle: string;
  sourceLessonHref: string;
  sourceKind: "completed" | "next-unlocked" | "foundation";
};

export type PronunciationDailyMission = {
  id: string;
  rewardKey: string;
  hskCap: number;
  poolSize: number;
  anchorLessonId: string;
  anchorLessonTitle: string;
  anchorLessonObjective: string;
  relationship: "apply-what-you-learned" | "learn-first";
  nextLessonId: string | null;
  challenges: PronunciationChallenge[];
};

export type PronunciationLessonOption = {
  id: string;
  title: string;
  chineseTitle: string;
  challengeCount: number;
};

export type PronunciationMissionInput = {
  vocabulary: readonly VocabularyItem[];
  lessons: readonly Lesson[];
  state: LearningState;
  passedLessonIds?: ReadonlySet<string> | null;
  unlockedLessonIds?: ReadonlySet<string> | null;
  requestedLessonId?: string | null;
  date?: Date;
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const hskCap = (level: StartingLevel) =>
  level === "hsk4" ? 4 : level === "hsk3" ? 3 : level === "hsk2" ? 2 : 1;

const maxLength = (hsk: number) => hsk === 1 ? 12 : hsk === 2 ? 18 : 28;
const invalidExample = /本课|本单元|这课|该课|重点词语|词汇项目|[／｜|/]/u;
const canonical = (value: string) => value.replace(/[^\p{Script=Han}]/gu, "");

const isEligibleChallengeWord = (word: VocabularyItem, cap: number) => {
  const key = canonical(word.example);
  return word.hsk >= 1
    && word.hsk <= cap
    && key.length >= 2
    && key.length <= maxLength(word.hsk)
    && key.length > canonical(word.simplified).length
    && Boolean(word.examplePinyin.trim())
    && Boolean(word.exampleMeaning.trim())
    && word.syllables.length > 0
    && !invalidExample.test(word.example);
};

const completedAt = (state: LearningState, lessonId: string) =>
  Date.parse(state.completedLessons[lessonId]?.completedAt ?? "") || 0;

export const selectPronunciationLessonOptions = ({
  vocabulary,
  lessons,
  state,
  passedLessonIds = null,
  unlockedLessonIds = null,
}: Omit<PronunciationMissionInput, "requestedLessonId" | "date">): PronunciationLessonOption[] => {
  const cap = unlockedLessonIds ? 4 : hskCap(state.profile.startingLevel);
  const wordById = new Map(vocabulary.map((word) => [word.id, word]));
  const suppliedLessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

  return (unlockedLessonIds ? lessons : getActivePathReleasedLessons(state.profile.startingLevel))
    .map((lesson) => suppliedLessonById.get(lesson.id))
    .filter((lesson): lesson is Lesson => Boolean(
      lesson
      && (unlockedLessonIds ? unlockedLessonIds.has(lesson.id) : passedLessonIds
        ? passedLessonIds.has(lesson.id)
        : isLessonPassed(lesson, state)),
    ))
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      chineseTitle: lesson.chineseTitle,
      challengeCount: lesson.wordIds.filter((wordId) => {
        const word = wordById.get(wordId);
        return Boolean(word && isEligibleChallengeWord(word, cap));
      }).length,
    }))
    .filter((lesson) => lesson.challengeCount > 0);
};

export const isPronunciationMissionComplete = ({
  missionId,
  activeMissionId,
  challengeIds,
  completedPhraseIds,
}: {
  missionId: string;
  activeMissionId: string;
  challengeIds: readonly string[];
  completedPhraseIds: ReadonlySet<string>;
}) => missionId === activeMissionId
  && challengeIds.length > 0
  && challengeIds.every((challengeId) => completedPhraseIds.has(challengeId));

export const selectDailyPronunciationMission = ({
  vocabulary,
  lessons,
  state,
  passedLessonIds = null,
  unlockedLessonIds = null,
  requestedLessonId = null,
  date = new Date(),
}: PronunciationMissionInput): PronunciationDailyMission => {
  const cap = unlockedLessonIds ? 4 : hskCap(state.profile.startingLevel);
  const day = dateKey(date);
  const wordById = new Map(vocabulary.map((word) => [word.id, word]));
  const suppliedLessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const availableLessons = unlockedLessonIds ? lessons.filter((lesson) => unlockedLessonIds.has(lesson.id)) : null;
  // An empty path still needs the existing foundation/learn-first screen;
  // the lesson picker stays empty and no completion is inferred.
  const activeLessons = (availableLessons?.length ? availableLessons : getActivePathReleasedLessons(state.profile.startingLevel))
    .map((lesson) => suppliedLessonById.get(lesson.id))
    .filter((lesson): lesson is Lesson => Boolean(lesson));
  const activeLessonById = new Map(activeLessons.map((lesson) => [lesson.id, lesson]));
  const lessonIsPassed = (lesson: Lesson) => passedLessonIds
    ? passedLessonIds.has(lesson.id)
    : isLessonPassed(lesson, state);
  const lessonHasPracticeContent = (lesson: Lesson) => lesson.wordIds.some((wordId) => {
    const word = wordById.get(wordId);
    return Boolean(word && isEligibleChallengeWord(word, cap));
  });
  const completedLessons = activeLessons
    .filter(lessonIsPassed)
    .toSorted((left, right) =>
      completedAt(state, right.id) - completedAt(state, left.id)
      || left.id.localeCompare(right.id)
    );
  const requestedCandidate = requestedLessonId
    ? activeLessonById.get(requestedLessonId) ?? null
    : null;
  const requestedLesson = requestedCandidate
    && (unlockedLessonIds ? unlockedLessonIds.has(requestedCandidate.id) : lessonIsPassed(requestedCandidate))
    && lessonHasPracticeContent(requestedCandidate)
    ? requestedCandidate
    : null;
  const nextLesson = getNextLesson(state);
  const anchorLesson = requestedLesson
    ?? completedLessons.find(lessonHasPracticeContent)
    ?? (nextLesson
      ? [activeLessonById.get(nextLesson.id)].find(
          (lesson): lesson is Lesson => Boolean(lesson && lessonHasPracticeContent(lesson)),
        )
      : null)
    ?? [activeLessonById.get("boot-1")].find(
      (lesson): lesson is Lesson => Boolean(lesson && lessonHasPracticeContent(lesson)),
    )
    ?? activeLessons.find(lessonHasPracticeContent);
  if (!anchorLesson) {
    throw new Error("No released pronunciation source lesson is available.");
  }

  const anchorCompleted = lessonIsPassed(anchorLesson);
  const sourceLessons = [anchorLesson];
  const missionId = `pronunciation-daily:${CONTENT_VERSION}:${day}:${anchorLesson.id}`;
  const rewardKey = `pronunciation-daily:${CONTENT_VERSION}:${day}`;
  const unique = new Map<string, { word: VocabularyItem; lesson: Lesson }>();
  for (const lesson of sourceLessons) {
    for (const wordId of lesson.wordIds) {
      const word = wordById.get(wordId);
      if (!word || !isEligibleChallengeWord(word, cap)) continue;
      const exampleKey = canonical(word.example);
      if (!unique.has(exampleKey)) unique.set(exampleKey, { word, lesson });
    }
  }
  const pool = [...unique.values()];
  // Preserve the selected lesson's curriculum order. Lesson selection is an
  // explicit learner choice, so a session must never silently mix older units.
  const selected = pool.slice(0, PRONUNCIATION_DAILY_CHALLENGE_COUNT);
  const challenges = selected.map(({ word, lesson }) => {
    const activityId = `pronunciation:${CONTENT_VERSION}:${word.id}`;
    const lessonCompleted = lessonIsPassed(lesson);
    return {
      id: activityId,
      activityId,
      chinese: word.example.trim(),
      pinyin: word.examplePinyin.trim(),
      meaning: word.exampleMeaning.trim(),
      hsk: word.hsk,
      focusWordId: word.id,
      focusWord: word.simplified,
      focusWordPinyin: word.pinyin,
      focusWordMeaning: word.meaning,
      focusTones: word.syllables.map((syllable) => syllable.lexicalTone),
      focusSyllables: word.syllables.map((syllable) => ({
        marked: syllable.marked,
        lexicalTone: syllable.lexicalTone,
      })),
      sourceLessonId: lesson.id,
      sourceLessonTitle: lesson.title,
      sourceLessonHref: `/lesson/${encodeURIComponent(lesson.id)}`,
      sourceKind: lessonCompleted
        ? "completed" as const
        : lesson.id === "boot-1"
          ? "foundation" as const
          : "next-unlocked" as const,
    };
  });
  const nextPathLesson = getNextLesson(state);
  return {
    id: missionId,
    rewardKey,
    hskCap: cap,
    poolSize: pool.length,
    anchorLessonId: anchorLesson.id,
    anchorLessonTitle: anchorLesson.title,
    anchorLessonObjective: anchorLesson.objective,
    relationship: anchorCompleted ? "apply-what-you-learned" : "learn-first",
    nextLessonId: nextPathLesson?.id ?? null,
    challenges,
  };
};

export const summarizePronunciationPractice = (evidence: readonly LearningEvidence[]) => ({
  uniqueActivityCount: new Set(evidence
    .filter((item) => item.source === "pronunciation" && item.method === "speech-transcript")
    .map((item) => item.activityId)
    .filter(Boolean)).size,
});

const previousDateKey = (date: Date) => {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return dateKey(previous);
};

export const applyPronunciationQuestReward = (
  state: LearningState,
  missionId: string,
  occurredAt = new Date(),
): { state: LearningState; awarded: boolean } => {
  const rewardId = `practice-reward:${missionId.trim()}`;
  if (!missionId.trim() || state.activityLog.some((event) => event.id === rewardId)) {
    return { state, awarded: false };
  }
  const today = dateKey(occurredAt);
  const sameDay = state.lastStudyDate === today;
  return {
    awarded: true,
    state: {
      ...state,
      xp: state.xp + PRONUNCIATION_QUEST_XP,
      dailyXp: (sameDay ? state.dailyXp : 0) + PRONUNCIATION_QUEST_XP,
      streak: sameDay ? state.streak
        : state.lastStudyDate === previousDateKey(occurredAt) ? state.streak + 1 : 1,
      lastStudyDate: today,
      activityLog: [...state.activityLog, {
        id: rewardId,
        type: "practice" as const,
        label: "Ải Cộng Hưởng · hoàn thành phiên luyện đọc",
        xp: PRONUNCIATION_QUEST_XP,
        occurredAt: occurredAt.toISOString(),
      }].slice(-160),
    },
  };
};
