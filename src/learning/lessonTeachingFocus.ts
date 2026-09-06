export const MAX_LESSON_TEACHING_WORDS = 8;

/**
 * Keeps the teaching surface bounded while preserving the source lesson word
 * inventory. Once a session form exists, its exact word order wins so the
 * learner is never shown an unrelated preview as if it were the live form.
 */
export const selectLessonTeachingWordIds = (
  lessonWordIds: readonly string[],
  practiceWordIds?: readonly (string | undefined)[],
) => {
  const lessonIds = new Set(lessonWordIds);
  const sessionIds = practiceWordIds?.filter(
    (wordId): wordId is string => Boolean(wordId && lessonIds.has(wordId)),
  ) ?? [];
  const uniqueSessionIds = [...new Set(sessionIds)];

  return uniqueSessionIds.length > 0
    ? uniqueSessionIds
    : lessonWordIds.slice(0, MAX_LESSON_TEACHING_WORDS);
};
