import { expect, it } from 'vitest';
import { createEmptyReaderProgress } from './readerProgress';
import { applyReaderWorkspace, readerWorkspaceChanges } from './readerWorkspace';
import { mergeWorkspaceEntries, validWorkspaceEntry } from '../../sync/workspaceProtocol';

it('preserves a remote bookmark deletion against a stale device without converting reading into mastery', () => {
  const initial = createEmptyReaderProgress({ ownerKey: 'a', ownerGeneration: 1, resetEpoch: 0 }, '2026-10-01T00:00:00Z');
  initial.bookmarkedSeriesIds = ['series-a'];
  const added = readerWorkspaceChanges(null, initial).map(entry => ({ ...entry, changedAt: entry.changedAt!, changeId: 'a' }));
  const removed = { ...initial, bookmarkedSeriesIds: [] };
  const deletion = readerWorkspaceChanges(initial, removed).map(entry => ({ ...entry, changedAt: Date.parse('2026-10-02T00:00:00Z'), changeId: 'b' }));
  const merged = mergeWorkspaceEntries(deletion, added);
  expect(applyReaderWorkspace(initial, merged).bookmarkedSeriesIds).toEqual([]);
  expect(applyReaderWorkspace(initial, merged).ownerKey).toBe('a');
  expect(mergeWorkspaceEntries(added, deletion)).toEqual(merged);
});

it('keeps answers to different questions from two devices despite a chapter row conflict', () => {
  const base = createEmptyReaderProgress({ ownerKey: 'a', ownerGeneration: 1, resetEpoch: 0 }, '2026-10-01T00:00:00Z');
  const attempt = { selectedAnswer: 'A', correct: false, firstAttemptCorrect: false,
    attemptCount: 1, answerExposed: true, answeredAt: '2026-10-01T01:00:00Z' };
  const left = structuredClone(base), right = structuredClone(base);
  const chapter = { seriesId: 's', chapterId: 'c', paragraphId: 'p', readingMode: 'zh-only' as const,
    lastReadAt: attempt.answeredAt, completedAt: null, bookmarked: false, comprehensionVersion: 'v1' };
  left.chapters.c = { ...chapter, comprehensionAttempts: { q1: attempt } };
  right.chapters.c = { ...chapter, comprehensionAttempts: { q2: { ...attempt, selectedAnswer: 'B' } } };
  const batch = (doc: typeof base, stamp: number, device: string) => readerWorkspaceChanges(null, doc)
    .map(entry => ({ ...entry, changedAt: stamp, changeId: device }));
  const merged = mergeWorkspaceEntries(batch(left, 100, 'a'), batch(right, 200, 'b'));
  expect(merged.every(validWorkspaceEntry)).toBe(true);
  const before = JSON.stringify(merged);
  const restored = applyReaderWorkspace(base, merged);
  expect(Object.keys(restored.chapters.c.comprehensionAttempts!)).toEqual(['q2', 'q1']);
  expect(JSON.stringify(merged)).toBe(before);
  expect(applyReaderWorkspace(restored, merged)).toEqual(restored);
  const revised = batch({ ...base, chapters: { c: { ...chapter, comprehensionVersion: 'v2', comprehensionAttempts: {} } } }, 300, 'c');
  expect(applyReaderWorkspace(base, mergeWorkspaceEntries(merged, revised)).chapters.c.comprehensionAttempts).toEqual({});
  const corrected = structuredClone(left);
  corrected.chapters.c.comprehensionAttempts!.q1 = { ...attempt, correct: true, firstAttemptCorrect: true,
    answerExposed: false, answeredAt: '2026-10-01T02:00:00Z' };
  const result = applyReaderWorkspace(base, mergeWorkspaceEntries(merged, batch(corrected, 400, 'd')));
  expect(result.chapters.c.comprehensionAttempts!.q1).toMatchObject({ correct: true, firstAttemptCorrect: false, answerExposed: true });
  expect(readerWorkspaceChanges(left, corrected).some(entry => entry.key.startsWith('reader.answer:') && entry.value === null)).toBe(false);
});

it('restores long support history without wiping bookmarks, saved words or chapter progress', () => {
  const initial = createEmptyReaderProgress({ ownerKey: 'a', ownerGeneration: 1, resetEpoch: 0 });
  initial.bookmarkedSeriesIds = ['series-a'];
  initial.savedEntries.word = { entryId: 'word', simplified: '你', pinyin: 'nǐ', partOfSpeechVi: 'đại từ',
    contextualMeaningVi: 'bạn', sourceType: 'hanzi-os-core', savedAt: '2026-10-01T00:00:00Z' };
  const entries = Array.from({ length: 501 }, (_, index) => ({ key: `reader.support:${index}`, changedAt: index, changeId: String(index),
    value: { kind: 'lookup', seriesId: 's', chapterId: 'c', paragraphId: null, referenceEntryId: null,
      occurredAt: new Date(Date.UTC(2026, 9, 1) + index * 1000).toISOString() } }));
  const restored = applyReaderWorkspace(initial, entries);
  expect(restored.bookmarkedSeriesIds).toEqual(['series-a']);
  expect(restored.savedEntries).toEqual(initial.savedEntries);
  expect(restored.supportEvents).toHaveLength(500);
  expect(entries).toHaveLength(501);
});
