import type { AcousticPronunciationAssessment } from "../audio/acousticPronunciationClient";

export const MIN_FLUENCY_REPORT_HAN_CHARACTERS = 6;

const hanCharacters = (value: string) => Array.from(value.normalize("NFKC"))
  .filter((character) => /\p{Script=Han}/u.test(character));

const longestCommonSubsequenceLength = (
  left: readonly string[],
  right: readonly string[],
) => {
  const previous = Array.from({ length: right.length + 1 }, () => 0);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [0];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? (previous[rightIndex - 1] ?? 0) + 1
        : Math.max(previous[rightIndex] ?? 0, current[rightIndex - 1] ?? 0);
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? 0;
};

export type PronunciationReportPresentation = Readonly<{
  primaryLabel: "Chiến báo âm học" | "Độ khớp âm";
  primaryScore: number;
  fluencyScore: number | null;
  matchedCharacters: number;
  targetCharacters: number;
  completenessPercent: number;
  shortSample: boolean;
}>;

/**
 * Keeps Azure's raw evidence intact while avoiding false precision in the UI.
 * Full-text fluency is too coarse for a very short Mandarin phrase, and Azure's
 * word-ratio completeness can become binary when the service segments the whole
 * phrase as one word. Character LCS gives a transparent learner-facing coverage
 * count without turning recognition text into pronunciation evidence.
 */
export const buildPronunciationReportPresentation = (
  assessment: AcousticPronunciationAssessment,
  referenceText: string,
): PronunciationReportPresentation => {
  const target = hanCharacters(referenceText);
  const transcript = hanCharacters(assessment.transcript);
  const matchedCharacters = longestCommonSubsequenceLength(target, transcript);
  const targetCharacters = target.length;
  const completenessPercent = targetCharacters > 0
    ? Math.round((matchedCharacters / targetCharacters) * 100)
    : 0;
  const shortSample = targetCharacters < MIN_FLUENCY_REPORT_HAN_CHARACTERS;

  return Object.freeze({
    primaryLabel: shortSample ? "Độ khớp âm" : "Chiến báo âm học",
    primaryScore: Math.round(shortSample
      ? assessment.aggregate.accuracyScore
      : assessment.aggregate.pronunciationScore),
    fluencyScore: shortSample
      ? null
      : Math.round(assessment.aggregate.fluencyScore),
    matchedCharacters,
    targetCharacters,
    completenessPercent,
    shortSample,
  });
};
