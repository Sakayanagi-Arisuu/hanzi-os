import type { D1Database } from './d1';
import { ContentStudioRepository } from './contentStudioRepository';
import { publishedLessonPageActivities, type PublishedPageActivity } from './publishedLessonPageActivities';
import { checkPageRemediation, pageActivityLessonId, pageRemediationAnswer } from '../mistakes/pageRemediation';
import { UnsupportedAttemptActivityError, type ObjectiveAttemptScore } from './editorialAttemptScoring';
import type { LearningAttemptCommandV1 } from '../learning/attemptProtocol';

/** Resolve immutable released content, never an answer bank supplied by a client. */
export function createPageRemediationResolver(database: D1Database) {
  const studio = new ContentStudioRepository(database);
  const lessons = new Map<string, Promise<PublishedPageActivity[]>>();
  return async (activityId: string, activityVersion: string) => {
    const lessonId = pageActivityLessonId(activityId);
    if (!lessonId) return null;
    if (!lessons.has(lessonId)) lessons.set(lessonId, (async () => {
      const entries: PublishedPageActivity[] = [];
      for (const item of await studio.releasedLessonRuntimeRevisions(lessonId)) {
        const registry = await publishedLessonPageActivities({ schemaVersion: 1, policy: 'published-only',
          releaseBoundary: 'content-release-worker-v1', items: [item] });
        entries.push(...registry.values());
      }
      return entries;
    })());
    return (await lessons.get(lessonId)!).find(entry => entry.activityId === activityId && entry.activityVersion === activityVersion) ?? null;
  };
}

export async function scorePageRemediation(database: D1Database, command: LearningAttemptCommandV1): Promise<ObjectiveAttemptScore & { remediationFeedback: { correctAnswer: string; explanation: string } }> {
  const entry = await createPageRemediationResolver(database)(command.activityId, command.activityVersion);
  if (command.source !== 'mistake' || command.method !== 'typed-character-recall' || !entry || entry.activity.type === 'rubric') {
    throw new UnsupportedAttemptActivityError('Published page remediation is unavailable.');
  }
  const correct = checkPageRemediation(entry.activity, command.response.answer);
  return {
    skill: entry.activity.learningTarget?.skill ?? 'reading', outcome: correct ? 'correct' : 'incorrect',
    score: correct ? 100 : 0, verified: true, baseMasteryEligible: false, requiredForPass: false,
    scoringVersion: 'page-remediation-v1', sessionBinding: null,
    metadata: { remediation: true, originSource: 'lesson-page', usedHint: command.response.usedHint },
    remediationFeedback: { correctAnswer: pageRemediationAnswer(entry.activity), explanation: entry.activity.explanation },
  };
}
