import { evaluateLessonActivity, type LessonActivity } from '../learning/lessonActivities';
import { parseLessonReadingSession } from '../learning/lessonReadingSession';
import { ACTIVITY_SKILL_LABELS } from '../learning/lessonActivityTarget';
import type { RemediationObservatoryItem } from './remediationObservatory';
import { pageRemediationPresentation } from './pageRemediation';

export type LocalPageMistake = { item: RemediationObservatoryItem; activity: LessonActivity; entryKey: string; originAt: number; contentVersion: string };
export type LocalPageCorrection = { version: 1; originAt: number; occurredAt: number; correct: boolean; usedHint: boolean };
type RecordValue = { entryKey: string; value: unknown };

export async function collectLocalPageMistakes(records: readonly RecordValue[]): Promise<LocalPageMistake[]> {
  const mistakes = new Map<string, LocalPageMistake>();
  for (const record of records) {
    if (!record.entryKey.startsWith('lesson-reading:v1:') || !record.value || typeof record.value !== 'object') continue;
    const lessonId = (record.value as { lessonId?: unknown }).lessonId;
    if (typeof lessonId !== 'string') continue;
    const session = parseLessonReadingSession(record.value, lessonId);
    if (!session) continue;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(session.document)));
    const version = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    for (const page of session.document.pages) for (const block of page.blocks) {
      const first = session.drafts[block.id]?.firstAttempt;
      if (block.kind !== 'activity' || !block.activity || !first || evaluateLessonActivity(block.activity, first) !== 'incorrect') continue;
      const presentation = pageRemediationPresentation(block);
      if (!presentation) continue;
      const entryKey = `page-correction:v1:${JSON.stringify([lessonId, page.id, block.id, first.binding?.activityVersion ?? version])}`;
      const originAt = Date.parse(first.occurredAt);
      const saved = records.find(candidate => candidate.entryKey === entryKey)?.value as Partial<LocalPageCorrection> | undefined;
      const correction = saved?.version === 1 && saved.originAt === originAt && typeof saved.occurredAt === 'number'
        && saved.occurredAt >= originAt && typeof saved.correct === 'boolean' && typeof saved.usedHint === 'boolean' ? saved : null;
      const resolved = !!correction?.correct && !correction.usedHint;
      const skill = block.activity.learningTarget?.skill ?? 'reading';
      const item: RemediationObservatoryItem = {
        ...presentation, id: entryKey, referenceLessonId: lessonId, skill, skillLabel: ACTIVITY_SKILL_LABELS[skill],
        contentVersion: `sha256:${version}`, activityVersion: first.binding?.activityVersion ?? `sha256:${version}`,
        kindLabel: 'Luyện lại trong bài', originSource: 'lesson', originLabel: 'Thiên Lộ', originDetail: session.title ?? page.title,
        previousAnswer: first.text || first.answerIds.map(id => block.activity!.options.find(option => option.id === id)?.text ?? '').join(' '),
        occurrenceCount: 1, correctedStreak: resolved ? 1 : 0, resolved, lastAttemptAt: correction?.occurredAt ?? originAt,
      };
      const previous = mistakes.get(entryKey);
      if (!previous || previous.originAt < originAt) mistakes.set(entryKey, { item, activity: block.activity, entryKey, originAt, contentVersion: first.binding?.activityVersion ?? `sha256:${version}` });
    }
  }
  return [...mistakes.values()];
}
