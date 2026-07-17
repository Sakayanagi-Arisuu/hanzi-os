import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Rating,
  State,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
} from "ts-fsrs";
import { LESSON_BY_ID, WORD_BY_ID } from "../data/curriculum";
import type {
  AnswerEvidence,
  LearningState,
  MistakeRecord,
  Profile,
  Skill,
  StoredFsrsCard,
} from "../types";

const STORAGE_KEY = "hanzi-os-learning-state-v1";

const defaultMastery: LearningState["skillMastery"] = {
  pronunciation: 8,
  listening: 6,
  speaking: 4,
  reading: 2,
  writing: 0,
  vocabulary: 5,
  grammar: 0,
};

const initialState: LearningState = {
  profile: {
    name: "Hành giả vô danh",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: false,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: defaultMastery,
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
};

const scheduler = fsrs(
  generatorParameters({
    request_retention: 0.9,
    enable_fuzz: true,
  }),
);

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const yesterdayKey = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
};

const loadState = (): LearningState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<LearningState>;
    const completedLessons = Object.fromEntries(
      Object.entries(parsed.completedLessons ?? {}).map(([lessonId, result]) => {
        const legacy = result as Partial<LearningState["completedLessons"][string]> & { score?: number; completedAt?: string };
        const score = legacy.score ?? 0;
        return [lessonId, {
          score,
          bestScore: legacy.bestScore ?? score,
          attempts: legacy.attempts ?? 1,
          completedAt: legacy.completedAt ?? new Date().toISOString(),
        }];
      }),
    );
    return {
      ...initialState,
      ...parsed,
      profile: { ...initialState.profile, ...parsed.profile },
      completedLessons,
      savedWords: parsed.savedWords ?? [],
      fsrsCards: parsed.fsrsCards ?? {},
      skillMastery: { ...defaultMastery, ...parsed.skillMastery },
      knowledge: parsed.knowledge ?? {},
      mistakes: parsed.mistakes ?? [],
      activityLog: parsed.activityLog ?? [],
      diagnostic: { ...initialState.diagnostic, ...parsed.diagnostic },
    };
  } catch {
    return initialState;
  }
};

const serializeCard = (card: Card): StoredFsrsCard => ({
  due: card.due.toISOString(),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsed_days: card.elapsed_days,
  scheduled_days: card.scheduled_days,
  learning_steps: card.learning_steps,
  reps: card.reps,
  lapses: card.lapses,
  state: card.state,
  last_review: card.last_review?.toISOString(),
});

const emptyStoredCard = (now = new Date()) =>
  serializeCard(createEmptyCard(now));

type LearningActions = {
  finishOnboarding: (profile: Profile) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  recordAnswer: (evidence: AnswerEvidence) => void;
  resolveMistake: (mistakeId: string, isCorrect: boolean) => void;
  completeDiagnostic: (score: number) => void;
  completeLesson: (lessonId: string, score: number) => void;
  toggleSavedWord: (wordId: string) => void;
  gradeReview: (wordId: string, rating: Grade) => void;
  resetProgress: () => void;
};

type LearningContextValue = {
  state: LearningState;
  actions: LearningActions;
  dueWordIds: string[];
  level: number;
};

const LearningContext = createContext<LearningContextValue | null>(null);

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const appendActivity = (
  current: LearningState["activityLog"],
  event: Omit<LearningState["activityLog"][number], "id" | "occurredAt">,
) => [
  ...current,
  {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: new Date().toISOString(),
  },
].slice(-160);

const startingMasteryBoost: Record<Profile["startingLevel"], number> = {
  zero: 0,
  basic: 8,
  hsk1: 20,
  hsk2: 36,
};

export function LearningProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearningState>(loadState);

  const persist = (updater: (current: LearningState) => LearningState) => {
    setState((current) => {
      const next = updater(current);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const applyStudyDay = (current: LearningState) => {
    const today = localDateKey();
    if (current.lastStudyDate === today) {
      return { streak: current.streak, dailyXp: current.dailyXp };
    }
    return {
      streak: current.lastStudyDate === yesterdayKey() ? current.streak + 1 : 1,
      dailyXp: 0,
    };
  };

  const actions: LearningActions = {
    finishOnboarding: (profile) =>
      persist((current) => {
        const boost = startingMasteryBoost[profile.startingLevel];
        const skillMastery = { ...current.skillMastery };
        (Object.keys(skillMastery) as Skill[]).forEach((skill) => {
          skillMastery[skill] = Math.max(skillMastery[skill], boost);
        });
        return {
          ...current,
          profile: { ...profile, onboarded: true },
          skillMastery,
        };
      }),
    updateProfile: (patch) =>
      persist((current) => ({
        ...current,
        profile: { ...current.profile, ...patch },
      })),
    recordAnswer: (evidence) =>
      persist((current) => {
        const now = new Date().toISOString();
        const traceKey = `${evidence.lessonId}:${evidence.questionId}`;
        const previousTrace = current.knowledge[traceKey] ?? {
          attempts: 0,
          correct: 0,
          currentStreak: 0,
          mastery: 0,
          lastSeenAt: now,
        };
        const currentStreak = evidence.isCorrect ? previousTrace.currentStreak + 1 : 0;
        const outcome = evidence.isCorrect ? 100 : 0;
        const mastery = clamp(Math.round(
          previousTrace.mastery * 0.68 + outcome * 0.32 + Math.min(6, currentStreak * 2),
        ));

        const skillMastery = { ...current.skillMastery };
        skillMastery[evidence.skill] = clamp(
          skillMastery[evidence.skill] + (evidence.isCorrect ? 1 : -1),
        );

        const mistakeId = `${evidence.lessonId}:${evidence.questionId}`;
        const existingIndex = current.mistakes.findIndex((item) => item.id === mistakeId);
        const mistakes = [...current.mistakes];
        if (!evidence.isCorrect) {
          const nextMistake: MistakeRecord = {
            id: mistakeId,
            lessonId: evidence.lessonId,
            questionId: evidence.questionId,
            wordId: evidence.wordId,
            kind: evidence.kind,
            skill: evidence.skill,
            prompt: evidence.prompt,
            selectedAnswer: evidence.selectedAnswer,
            correctAnswer: evidence.correctAnswer,
            explanation: evidence.explanation,
            occurrences: existingIndex >= 0 ? mistakes[existingIndex].occurrences + 1 : 1,
            correctedStreak: 0,
            resolved: false,
            lastAttemptAt: now,
          };
          if (existingIndex >= 0) mistakes[existingIndex] = nextMistake;
          else mistakes.unshift(nextMistake);
        } else if (existingIndex >= 0) {
          const correctedStreak = mistakes[existingIndex].correctedStreak + 1;
          mistakes[existingIndex] = {
            ...mistakes[existingIndex],
            correctedStreak,
            resolved: correctedStreak >= 2,
            lastAttemptAt: now,
          };
        }

        return {
          ...current,
          skillMastery,
          knowledge: {
            ...current.knowledge,
            [traceKey]: {
              attempts: previousTrace.attempts + 1,
              correct: previousTrace.correct + (evidence.isCorrect ? 1 : 0),
              currentStreak,
              mastery,
              lastSeenAt: now,
            },
          },
          mistakes: mistakes.slice(0, 120),
        };
      }),
    resolveMistake: (mistakeId, isCorrect) =>
      persist((current) => {
        const target = current.mistakes.find((mistake) => mistake.id === mistakeId);
        if (!target) return current;
        const day = applyStudyDay(current);
        const mistakes = current.mistakes.map((mistake) => {
          if (mistake.id !== mistakeId) return mistake;
          const correctedStreak = isCorrect ? mistake.correctedStreak + 1 : 0;
          return {
            ...mistake,
            correctedStreak,
            occurrences: mistake.occurrences + (isCorrect ? 0 : 1),
            resolved: correctedStreak >= 2,
            lastAttemptAt: new Date().toISOString(),
          };
        });
        const earnedXp = isCorrect ? 8 : 0;
        return {
          ...current,
          xp: current.xp + earnedXp,
          dailyXp: day.dailyXp + earnedXp,
          streak: isCorrect ? day.streak : current.streak,
          lastStudyDate: isCorrect ? localDateKey() : current.lastStudyDate,
          mistakes,
          skillMastery: {
            ...current.skillMastery,
            [target.skill]: clamp(current.skillMastery[target.skill] + (isCorrect ? 2 : -1)),
          },
          activityLog: isCorrect
            ? appendActivity(current.activityLog, { type: "correction", label: `Phá giải: ${target.prompt}`, xp: earnedXp })
            : current.activityLog,
        };
      }),
    completeDiagnostic: (score) =>
      persist((current) => {
        const normalizedScore = clamp(Math.round(score));
        const recommendedLessonId = normalizedScore >= 75
          ? "characters-1"
          : normalizedScore >= 50
            ? "daily-1"
            : normalizedScore >= 25
              ? "survival-1"
              : "boot-1";
        const inferredLevel: Profile["startingLevel"] = normalizedScore >= 75
          ? "hsk2"
          : normalizedScore >= 50
            ? "hsk1"
            : normalizedScore >= 25
              ? "basic"
              : "zero";
        const baseline = Math.round(normalizedScore * 0.55);
        const skillMastery = { ...current.skillMastery };
        (Object.keys(skillMastery) as Skill[]).forEach((skill) => {
          skillMastery[skill] = Math.max(skillMastery[skill], baseline);
        });
        return {
          ...current,
          profile: { ...current.profile, startingLevel: inferredLevel },
          skillMastery,
          diagnostic: {
            completed: true,
            score: normalizedScore,
            recommendedLessonId,
            completedAt: new Date().toISOString(),
          },
          activityLog: appendActivity(current.activityLog, {
            type: "diagnostic",
            label: "Khảo nghiệm căn cơ",
            xp: 0,
          }),
        };
      }),
    completeLesson: (lessonId, score) => {
      const lesson = LESSON_BY_ID.get(lessonId);
      if (!lesson) return;
      persist((current) => {
        const day = applyStudyDay(current);
        const previous = current.completedLessons[lessonId];
        const firstMastery = score >= 70 && (!previous || previous.bestScore < 70);
        const earnedXp = firstMastery
          ? lesson.xp
          : previous
            ? Math.round(lesson.xp * 0.2)
            : Math.round(lesson.xp * 0.25);
        const increment = score >= 70 ? Math.max(1, Math.round(score / 35)) : 0;
        const skillMastery = { ...current.skillMastery };
        lesson.skills.forEach((skill: Skill) => {
          skillMastery[skill] = Math.min(100, skillMastery[skill] + increment);
        });

        const fsrsCards = { ...current.fsrsCards };
        lesson.wordIds.forEach((wordId) => {
          if (!fsrsCards[wordId]) fsrsCards[wordId] = emptyStoredCard();
        });

        return {
          ...current,
          xp: current.xp + earnedXp,
          dailyXp: day.dailyXp + earnedXp,
          streak: day.streak,
          lastStudyDate: localDateKey(),
          completedLessons: {
            ...current.completedLessons,
            [lessonId]: {
              score,
              bestScore: Math.max(score, current.completedLessons[lessonId]?.bestScore ?? 0),
              attempts: (current.completedLessons[lessonId]?.attempts ?? 0) + 1,
              completedAt: new Date().toISOString(),
            },
          },
          fsrsCards,
          skillMastery,
          activityLog: appendActivity(current.activityLog, {
            type: "lesson",
            label: lesson.title,
            xp: earnedXp,
          }),
        };
      });
    },
    toggleSavedWord: (wordId) =>
      persist((current) => ({
        ...current,
        savedWords: current.savedWords.includes(wordId)
          ? current.savedWords.filter((id) => id !== wordId)
          : [...current.savedWords, wordId],
        fsrsCards: current.fsrsCards[wordId]
          ? current.fsrsCards
          : { ...current.fsrsCards, [wordId]: emptyStoredCard() },
      })),
    gradeReview: (wordId, rating) =>
      persist((current) => {
        const now = new Date();
        const stored = current.fsrsCards[wordId] ?? emptyStoredCard(now);
        const result = scheduler.next(
          {
            ...stored,
            due: stored.due,
            last_review: stored.last_review ?? null,
            state: stored.state as State,
          },
          now,
          rating,
        );
        const day = applyStudyDay(current);
        const word = WORD_BY_ID.get(wordId);
        const previousTrace = current.knowledge[`review:${wordId}`] ?? {
          attempts: 0,
          correct: 0,
          currentStreak: 0,
          mastery: 0,
          lastSeenAt: now.toISOString(),
        };
        const recalled = rating !== Rating.Again;
        const currentStreak = recalled ? previousTrace.currentStreak + 1 : 0;
        const mastery = clamp(Math.round(
          previousTrace.mastery * 0.72 + (recalled ? 100 : 0) * 0.28 + Math.min(6, currentStreak * 2),
        ));
        let mistakes = current.mistakes;
        if (!recalled && word) {
          const mistakeId = `review:${wordId}`;
          const existing = current.mistakes.find((item) => item.id === mistakeId);
          const reviewMistake: MistakeRecord = {
            id: mistakeId,
            lessonId: "review",
            questionId: mistakeId,
            wordId,
            kind: "recall",
            skill: "vocabulary",
            prompt: word.simplified,
            selectedAnswer: "Không nhớ",
            correctAnswer: `${word.pinyin} · ${word.meaning}`,
            explanation: `${word.simplified} đọc là ${word.pinyin}, nghĩa là “${word.meaning}”. Ví dụ: ${word.example} — ${word.exampleMeaning}.`,
            occurrences: (existing?.occurrences ?? 0) + 1,
            correctedStreak: 0,
            resolved: false,
            lastAttemptAt: now.toISOString(),
          };
          mistakes = [reviewMistake, ...current.mistakes.filter((item) => item.id !== mistakeId)].slice(0, 120);
        }
        return {
          ...current,
          xp: current.xp + 5,
          dailyXp: day.dailyXp + 5,
          streak: day.streak,
          lastStudyDate: localDateKey(),
          reviewCount: current.reviewCount + 1,
          fsrsCards: {
            ...current.fsrsCards,
            [wordId]: serializeCard(result.card),
          },
          skillMastery: {
            ...current.skillMastery,
            vocabulary: clamp(current.skillMastery.vocabulary + (rating === Rating.Easy ? 2 : recalled ? 1 : -1)),
          },
          knowledge: {
            ...current.knowledge,
            [`review:${wordId}`]: {
              attempts: previousTrace.attempts + 1,
              correct: previousTrace.correct + (recalled ? 1 : 0),
              currentStreak,
              mastery,
              lastSeenAt: now.toISOString(),
            },
          },
          mistakes,
          activityLog: appendActivity(current.activityLog, {
            type: "review",
            label: word ? `Ôn ${word.simplified}` : "Ôn ký ức",
            xp: 5,
          }),
        };
      }),
    resetProgress: () => {
      localStorage.removeItem(STORAGE_KEY);
      setState(initialState);
    },
  };

  const dueWordIds = useMemo(() => {
    const now = Date.now();
    const activated = Object.keys(state.fsrsCards);
    return activated.filter((wordId) =>
      new Date(state.fsrsCards[wordId].due).getTime() <= now,
    ).slice(0, 12);
  }, [state.fsrsCards]);

  const value = useMemo<LearningContextValue>(
    () => ({
      state,
      actions,
      dueWordIds,
      level: Math.floor(state.xp / 500) + 1,
    }),
    [state, dueWordIds],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export const useLearning = () => {
  const value = useContext(LearningContext);
  if (!value) throw new Error("useLearning must be used inside LearningProvider");
  return value;
};
