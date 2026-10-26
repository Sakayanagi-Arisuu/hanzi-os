import { buildExercises, type RandomSource } from '../lib/editorialExerciseGeneration';
import { hashLessonSessionForm, type LessonSessionAuthorityBindingV1, type LessonSessionFormV1 } from './lessonSessionProtocol';
import type { Lesson } from '../types';

export const OFFLINE_LESSON_SEED_PREFIX = 'offline-lesson-v1:';
/** Formative practice only: server and device select the same immutable form.
 * This seed grants no progress or access; the server still checks enrollment,
 * prerequisites, reset, content versions and every answer on delivery.
 */
export function offlineLessonRandom(commandId: string): RandomSource | null {
  if (!commandId.startsWith(OFFLINE_LESSON_SEED_PREFIX)) return null;
  let seed = 2166136261;
  for (const character of commandId) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

/** A presentation plan, never stored or acknowledged as a server receipt. */
export async function planOfflineLesson(lesson: Lesson, script: 'simplified' | 'traditional',
  commandId: string, enrollmentId: string, resetEpoch: number, startedAt: string): Promise<LessonSessionAuthorityBindingV1> {
  const random = offlineLessonRandom(commandId);
  if (!random) throw new Error('Offline lesson plan version unavailable');
  const activities = buildExercises(lesson, script, random, true).map((exercise, position) => ({
    position, activityId: `${lesson.id}:${exercise.id}`, activityVersion: exercise.activityVersion,
    method: exercise.kind === 'meaning' ? 'meaning-selection' as const
      : exercise.kind === 'listening' ? 'listening-selection' as const
      : exercise.kind === 'recall' ? 'typed-character-recall' as const
      : exercise.kind === 'sentence' ? 'reading-comprehension' as const : 'phonology-recognition' as const,
    skill: exercise.skill, requiredForPass: exercise.requiredForPass === true,
  }));
  const form: LessonSessionFormV1 = { schemaVersion: 1, script, activities };
  return { sessionId: `local:${commandId}`.slice(0, 160), enrollmentId,
    contentVersion: lesson.contentVersion, resetEpoch, lessonId: lesson.id,
    lessonVersion: `${lesson.contentVersion}:${lesson.id}:1`, expectedEvidenceCount: activities.length,
    form, formHash: await hashLessonSessionForm(form), status: 'started', startedAt };
}
