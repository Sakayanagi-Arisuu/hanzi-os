import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  WORD_BY_ID,
} from "../data/curriculum";
import { toneLabels } from "../lib/exerciseGeneration";
import type { EvidenceMethod, Skill } from "../types";

export type AuthoritativeAnswer = {
  answers: readonly string[];
  activityVersion: string;
  method: EvidenceMethod;
  skill: Skill;
  requiredForPass: boolean;
  wordId?: string;
};

const releasedLessonById = new Map(
  RELEASED_LESSONS.map((lesson) => [lesson.id, lesson]),
);

const specialTonePairAnswers = new Map<string, string>([
  ["sandhi-ni3-hao3", "2 + 3"],
  ["sandhi-bu4-shi4", "2 + 4"],
  ["sandhi-yi1-ben3", "4 + 3"],
]);

export const getAuthoritativeLessonAnswer = (
  lessonId: string,
  questionId: string,
): AuthoritativeAnswer | null => {
  const lesson = releasedLessonById.get(lessonId);
  if (!lesson) return null;

  const specialAnswer = lesson.id === "boot-4"
    ? specialTonePairAnswers.get(questionId)
    : undefined;
  if (specialAnswer) {
    return {
      answers: [specialAnswer],
      activityVersion: `${CONTENT_VERSION}:tone-sandhi:1`,
      method: "phonology-recognition",
      skill: "pronunciation",
      requiredForPass: true,
    };
  }

  for (const wordId of lesson.wordIds) {
    const word = WORD_BY_ID.get(wordId);
    if (!word) continue;
    const activityVersion = `${lesson.contentVersion}:${lesson.id}:1`;
    if (questionId === `${wordId}-meaning`) {
      return {
        answers: [word.meaning],
        activityVersion,
        method: "meaning-selection",
        skill: "vocabulary",
        requiredForPass: false,
        wordId,
      };
    }
    if (questionId === `${wordId}-pinyin`) {
      return {
        answers: [word.pinyin],
        activityVersion,
        method: "phonology-recognition",
        skill: "pronunciation",
        requiredForPass: false,
        wordId,
      };
    }
    if (questionId === `${wordId}-listening`) {
      return {
        answers: [word.meaning],
        activityVersion,
        method: "listening-selection",
        skill: "listening",
        requiredForPass: false,
        wordId,
      };
    }
    if (questionId === `${wordId}-recall`) {
      return {
        answers: [...new Set([word.simplified, word.traditional])],
        activityVersion,
        method: "typed-character-recall",
        skill: "writing",
        requiredForPass: false,
        wordId,
      };
    }
    if (questionId === `${wordId}-sentence`) {
      return {
        answers: [word.exampleMeaning],
        activityVersion,
        method: "reading-comprehension",
        skill: lesson.skills.includes("grammar") ? "grammar" : "reading",
        requiredForPass: false,
        wordId,
      };
    }
    const tonePrefix = `${wordId}-tone-`;
    if (questionId.startsWith(tonePrefix)) {
      const syllableIndex = Number(questionId.slice(tonePrefix.length));
      const syllable = word.syllables[syllableIndex];
      if (!syllable || !Number.isInteger(syllableIndex)) return null;
      return {
        answers: [toneLabels[syllable.lexicalTone]],
        activityVersion,
        method: "phonology-recognition",
        skill: "pronunciation",
        requiredForPass: lesson.id === "boot-1",
        wordId,
      };
    }
  }
  return null;
};
