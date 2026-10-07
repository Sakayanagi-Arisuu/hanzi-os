import snapshot from "../../content/packages/lexical-editorial-2026.10.5/word-catalog.json";
import { CONTENT_VERSION, RELEASED_VOCABULARY, WORD_BY_ID } from "../data/curriculum";

// Immutable presentation/answer derivative of already released Studio revisions.
// Foundation remains available for saved forms, evidence and old review cards.
export const LEXICAL_EDITORIAL_VERSION = snapshot.version;
export const LEXICAL_EXERCISE_SUFFIX = "~lexical-2026.10.5";
export const LEXICAL_SESSION_MARKER = "lexical-2026.10.5";
if (snapshot.baseContentVersion !== CONTENT_VERSION || snapshot.humanReviewed !== false) {
  throw new Error("Lexical editorial snapshot has an invalid foundation/review binding.");
}
export const EDITORIAL_WORD_BY_ID = new Map(WORD_BY_ID);
export const EDITORIAL_WORD_IDS = new Set<string>();
for (const patch of snapshot.words) {
  const base = WORD_BY_ID.get(patch.id);
  if (!base || EDITORIAL_WORD_IDS.has(patch.id)) throw new Error("Invalid lexical editorial word binding.");
  EDITORIAL_WORD_IDS.add(patch.id);
  EDITORIAL_WORD_BY_ID.set(patch.id, {
    ...base,
    meaning: patch.meaning,
    example: patch.example,
    examplePinyin: patch.examplePinyin,
    exampleMeaning: patch.exampleMeaning,
  });
}
export const EDITORIAL_RELEASED_VOCABULARY = RELEASED_VOCABULARY.map(
  word => EDITORIAL_WORD_BY_ID.get(word.id)!,
);
export const lexicalBaseExerciseId = (id: string) => id.endsWith(LEXICAL_EXERCISE_SUFFIX)
  ? id.slice(0, -LEXICAL_EXERCISE_SUFFIX.length) : id;
export const lexicalActivityVersion = (base: string) => `${base}:${LEXICAL_EDITORIAL_VERSION}`;
export const isEditorialLessonSession = (lessonId: string, sessionId: string) =>
  sessionId.startsWith(`lesson-session:${lessonId}:${LEXICAL_SESSION_MARKER}:`);
