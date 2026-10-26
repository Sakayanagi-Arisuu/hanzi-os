import { expect, it } from 'vitest';
import { createActivityHistoryEvent, guestActivityHistoryEvent } from './activityHistory';
import { isLessonHistoryEvent, projectLessonHistory } from './lessonHistory';
import type { LearningEvidence } from '../types';
import { workspaceHistoryEntry, workspaceHistoryEvent, isWorkspaceHistoryDescriptor } from '../sync/workspaceHistory';
import { mergeWorkspaceEntries, workspaceEntriesForClient } from '../sync/workspaceProtocol';

const owner = { ownerKey: 'anonymous:history', resetEpoch: 0 };
const evidence: LearningEvidence = { id: 'real-source', schemaVersion: 1, idempotencyKey: 'correction-one',
  contentVersion: 'old-content', activityVersion: 'old-item', source: 'mistake', activityId: 'boot-1:item',
  method: 'remediation-recall', skill: 'reading', outcome: 'correct', score: 100, occurredAt: '2026-10-19T01:00:00Z',
  verified: false, masteryEligible: false, metadata: { usedHint: true } };

it('keeps writing result summaries separate from actual self-review phases and leaves legacy unknown', () => {
  const writing = { ...evidence, source: 'writing', method: 'stroke-quiz', outcome: 'unverified', score: null } as LearningEvidence;
  expect(guestActivityHistoryEvent({ ...owner, evidence: { ...writing, metadata: { sessionSummary: true } } }))
    .toMatchObject({ module: 'writing', business: { category: 'session' }, score: null, outcome: 'unknown', masteryEligible: false });
  expect(guestActivityHistoryEvent({ ...owner, evidence: writing }).business?.category).toBe('self-review');
});

it('uses the common contract without changing authority or duplicating a new correction of the same item', () => {
  const first = guestActivityHistoryEvent({ ...owner, evidence });
  const second = guestActivityHistoryEvent({ ...owner, evidence: { ...evidence, idempotencyKey: 'correction-two' } });
  expect(isLessonHistoryEvent(first)).toBe(true);
  expect(projectLessonHistory(owner, [first, first, second])).toHaveLength(2);
  expect(first).toMatchObject({ module: 'mistakes', skill: 'reading', outcome: 'correct', assistance: { hint: true },
    authority: 'local-practice', masteryEligible: false, business: { category: 'objective' } });
  const speech = guestActivityHistoryEvent({ ...owner, evidence: { ...evidence, source: 'pronunciation', method: 'speech-transcript' } });
  expect(speech).toMatchObject({ module: 'speech', outcome: 'self-review', score: null, modality: 'speech' });
  expect(isLessonHistoryEvent({ ...speech, outcome: 'correct', score: 100 })).toBe(false);
  expect(isLessonHistoryEvent({ ...speech, authority: 'server-verified', receiptRef: 'fake', confirmationState: 'confirmed' })).toBe(false);
});

it('keeps legacy unknown time/version/support instead of assuming independent recall', () => {
  const event = guestActivityHistoryEvent({ ...owner, evidence: { ...evidence, occurredAt: 'unknown', metadata: undefined } });
  expect(event).toMatchObject({ occurredAt: null, clockSource: 'unknown', assistance: { hint: null, reveal: null } });
  const visit = createActivityHistoryEvent({ ...owner, operationId: 'visit', module: 'overview', category: 'visit',
    sourceId: 'path', itemId: 'path', contentVersion: 'unknown', activityVersion: 'unknown', sourceRecordRef: 'access', occurredAt: null });
  expect(isLessonHistoryEvent(visit)).toBe(true);
  expect(isLessonHistoryEvent({ ...visit, masteryEligible: true })).toBe(false);
});

it('preserves actual chapter version/answer exposure and support without copying raw answers', () => {
  const entry = workspaceHistoryEntry({ key: 'reader.answer:question', changedAt: 100, changeId: 'answer-one',
    value: { chapterId: 'chapter', version: 'frozen-version', questionId: 'question',
      attempt: { correct: false, firstAttemptCorrect: false, selectedAnswer: 'private answer', answerExposed: true, answeredAt: '2026-10-19T01:00:00Z' } } })!;
  expect(isWorkspaceHistoryDescriptor(entry.value)).toBe(true);
  expect(JSON.stringify(entry)).not.toContain('private answer');
  const event = workspaceHistoryEvent(owner.ownerKey, 0, entry.value as Parameters<typeof workspaceHistoryEvent>[2]);
  expect(event).toMatchObject({ itemId: 'question', activityVersion: 'frozen-version', outcome: 'incorrect', assistance: { reveal: true } });
  const support = workspaceHistoryEntry({ key: 'reader.support:one', value: { kind: 'tts' }, changedAt: 100, changeId: 'support-one' })!;
  expect(workspaceHistoryEvent(owner.ownerKey, 0, support.value as Parameters<typeof workspaceHistoryEvent>[2]))
    .toMatchObject({ taskType: 'record-support', outcome: 'unknown', occurredAt: null, clockSource: 'unknown', assistance: { tts: true } });
  const saved = workspaceHistoryEntry({ key: 'reader.saved:one', value: { savedAt: '2026-10-19T01:00:00Z' }, changedAt: 200, changeId: 'saved-one' })!;
  expect(workspaceHistoryEvent(owner.ownerKey, 0, saved.value as Parameters<typeof workspaceHistoryEvent>[2]).occurredAt).toBe('2026-10-19T01:00:00Z');
});

it('keeps immutable history conflicts fail-closed and hides new records from legacy clients', () => {
  const entry = workspaceHistoryEntry({ key: 'reader.saved:one', value: true, changedAt: 100, changeId: 'one' })!;
  expect(workspaceEntriesForClient([entry], true)).toEqual([]);
  expect(workspaceEntriesForClient([entry], true, true)).toEqual([entry]);
  expect(() => mergeWorkspaceEntries([entry], [{ ...entry, value: { ...entry.value as object, itemId: 'other' }, changedAt: 200 }])).toThrow('retain');
  expect(mergeWorkspaceEntries([entry], [entry])).toEqual([entry]);
});
