import type { VocabularyItem } from "../types";
import type { Exercise } from "../lib/exerciseGeneration";

type SpeechExerciseTarget = {
  kind: Exercise["kind"];
  wordId?: string;
  spokenText?: string;
  id?: string;
  exerciseId?: string;
};

const tonePosition = (exercise: SpeechExerciseTarget, word: VocabularyItem) => {
  const prefix = `${word.id}-tone-`;
  const exerciseId = exercise.id ?? exercise.exerciseId;
  if (!exerciseId?.startsWith(prefix)) return null;
  const value = Number(exerciseId.slice(prefix.length));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
};

/**
 * Resolves the exact visible stimulus for speech playback. Older resumable
 * lesson forms store the whole word for tone-per-syllable activities, so the
 * adapter deliberately fixes playback without mutating stable exercise IDs or
 * persisted manifests.
 */
export const resolveExerciseSpeechText = (
  exercise: SpeechExerciseTarget,
  word: VocabularyItem | undefined,
  script: "simplified" | "traditional",
) => {
  if (exercise.kind !== "tone" || !word || exercise.wordId !== word.id) {
    return exercise.spokenText;
  }
  const position = tonePosition(exercise, word);
  const characters = [...(script === "traditional" ? word.traditional : word.simplified)];
  return position !== null
    && characters.length === word.syllables.length
    && characters[position]
      ? characters[position]
      : exercise.spokenText;
};
