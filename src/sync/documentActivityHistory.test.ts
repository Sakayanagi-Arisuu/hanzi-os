import { expect, it } from 'vitest';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument, evolveSyncDocument } from './document';
import { documentActivityHistoryEntries, documentActivityHistoryEvent } from './documentActivityHistory';
import { isLessonHistoryEvent, projectLessonHistory } from '../learning/lessonHistory';

it('derives immutable, privacy-minimal saved/profile observations from real clocks only', async () => {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  const original = createInitialSyncDocument(state, '2026-10-19T00:00:00Z', 'bootstrap');
  const next = { ...state, profile: { ...state.profile, goal: 'travel' as const, name: 'PRIVATE NAME' }, savedWords: ['greet-ni'] };
  const document = evolveSyncDocument(original, state, next, '2026-10-19T01:00:00Z', 'save-one', 'snapshot');
  const entries = await documentActivityHistoryEntries(document, 'save-one', 'snapshot');
  expect(entries).toHaveLength(2);
  expect(JSON.stringify(entries)).not.toContain('PRIVATE NAME');
  expect(await documentActivityHistoryEntries(document, 'save-one', 'snapshot')).toEqual(entries);
  expect(await documentActivityHistoryEntries(document, 'not-the-source-operation', 'snapshot')).toEqual([]);
  expect(await documentActivityHistoryEntries(document, 'save-one', 'reset')).toEqual([]);
  const local = entries.map(entry => documentActivityHistoryEvent('account:one', 0, entry));
  expect(local.every(isLessonHistoryEvent)).toBe(true);
  expect(local.every(event => event.outcome === 'unknown' && event.contentVersion === 'unknown' && event.authority === 'unknown' && !event.masteryEligible)).toBe(true);
  const receipts = local.map((event, index) => ({ ...event, authority: 'server-recorded' as const,
    confirmationState: 'confirmed' as const, receiptRef: entries[index].key, lineage: 'server-business-record' as const }));
  expect(projectLessonHistory({ ownerKey: 'account:one', resetEpoch: 0 }, [...local, ...receipts])).toHaveLength(2);
  const removed = { ...next, savedWords: [] };
  const later = evolveSyncDocument(document, next, removed, '2026-10-19T02:00:00Z', 'save-two', 'snapshot');
  const deletion = await documentActivityHistoryEntries(later, 'save-two', 'snapshot');
  expect(deletion).toHaveLength(1);
  expect(deletion[0]).toMatchObject({ value: { module: 'dictionary', details: { present: false } } });
  expect(deletion[0].changeId).not.toBe(entries.find(entry => (entry.value as { module: string }).module === 'dictionary')?.changeId);
});
