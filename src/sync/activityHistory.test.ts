import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, resetSyncDatabaseForTests, readLessonResume, writeLessonResume, enqueueSyncOperation, type ActiveOwnerLearningScope } from './indexedDb';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from './document';
import { readLocalLearningHistory } from './reviewHistory';
import { hashSyncPushOperation } from './protocol';
import { readWorkspace, saveWorkspaceChanges, syncWorkspace } from './workspaceSync';
import { workspaceHistoryEvents } from './workspaceHistory';
import { persistPageCorrectionHistory, PAGE_CORRECTION_HISTORY_PREFIX } from './mistakeHistory';
import { saveDescriptiveActivity, savePracticeObservation } from './activityObservations';
import { practiceObservationsConfirmed } from './practiceConfirmation';
import { saveSpeechSupport } from './speechSupport';
import { saveDictionaryActivity } from './dictionaryActivity';
import type { DictionaryWord } from '../content/publishedStudioVocabulary';

let scope: ActiveOwnerLearningScope;
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('account:history'); scope = (await readActiveOwnerLearningScope())!;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('retains pending history offline/reload, reconciles with the business response and preserves two same-item corrections', async () => {
  const change = { key: 'practice.correction:one', value: { activityId: 'item', activityVersion: 'old-v1', correct: false, usedHint: true, occurredAt: '2026-10-19T01:00:00Z' } };
  await saveWorkspaceChanges(scope, [change]);
  const first = await readWorkspace(scope);
  const pending = workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, first.entries, first.pending);
  expect(pending).toMatchObject([{ module: 'mistakes', confirmationState: 'provisional', outcome: 'incorrect', assistance: { hint: true } }]);
  await expect(syncWorkspace(scope, new AbortController().signal, async () => { throw new Error('lost response'); })).rejects.toThrow();
  await resetSyncDatabaseForTests();
  expect(await readWorkspace(scope)).toEqual(first);
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1, resetEpoch: 0, entries: JSON.parse(init!.body as string).entries }));
  const acknowledged = await readWorkspace(scope);
  expect(workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, acknowledged.entries, acknowledged.pending))
    .toMatchObject([{ eventId: pending[0].eventId, confirmationState: 'confirmed', authority: 'server-recorded', masteryEligible: false }]);
  await Promise.all([saveWorkspaceChanges(scope, [{ ...change, value: { ...change.value, correct: true, occurredAt: '2026-10-19T01:01:00Z' } }]),
    saveWorkspaceChanges(scope, [{ key: 'reader.saved:other', value: true }])]);
  const next = await readWorkspace(scope);
  expect(workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, next.entries, next.pending).filter(event => event.module === 'mistakes')).toHaveLength(2);
});

it('keeps business/journal unchanged on quota, unknown schema and owner/reset switch', async () => {
  await saveWorkspaceChanges(scope, [{ key: 'practice.correction:one', value: { correct: false, usedHint: false } }]);
  const before = await readWorkspace(scope);
  const put = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
    if (this.name === 'lesson-resumes') throw new DOMException('quota', 'QuotaExceededError');
    return key === undefined ? put.call(this, value) : put.call(this, value, key);
  });
  await expect(saveWorkspaceChanges(scope, [{ key: 'practice.correction:two', value: { correct: true } }])).rejects.toThrow();
  failure.mockRestore(); expect(await readWorkspace(scope)).toEqual(before);
  await expect(saveWorkspaceChanges({ ...scope, resetEpoch: 1 }, [{ key: 'reader.saved:bad', value: true }])).rejects.toThrow();
  const cache = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'workspace-sync:v1' };
  await writeLessonResume({ ...cache, value: { version: 99, raw: 'preserve' } });
  await expect(saveWorkspaceChanges(scope, [{ key: 'reader.saved:bad', value: true }])).rejects.toThrow();
  expect((await readLessonResume(cache))?.value).toEqual({ version: 99, raw: 'preserve' });
  await readOrInitializeOwnerGeneration('account:other');
  await expect(readWorkspace(scope)).rejects.toThrow();
});

it('commits page correction and history together, retries idempotently and retains older attempts', async () => {
  const cache = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'page-correction:v1:source' };
  const correction = { version: 1 as const, originAt: 100, occurredAt: 200, correct: false, usedHint: true };
  await persistPageCorrectionHistory(cache, correction, 'first', 'boot-1', 'item', 'frozen-v1');
  await persistPageCorrectionHistory(cache, correction, 'first', 'boot-1', 'item', 'frozen-v1');
  await persistPageCorrectionHistory(cache, { ...correction, occurredAt: 300, correct: true }, 'second', 'boot-1', 'item', 'frozen-v1');
  const history = await readLessonResume({ ...cache, entryKey: `${PAGE_CORRECTION_HISTORY_PREFIX}${cache.entryKey}` });
  expect(history?.value).toMatchObject([{ operationId: 'second', outcome: 'correct' }, { operationId: 'first', outcome: 'incorrect' }]);
  expect((await readLessonResume(cache))?.value).toEqual({ ...correction, occurredAt: 300, correct: true });
  await expect(persistPageCorrectionHistory(cache, correction, 'stale', 'boot-1', 'item', 'frozen-v1')).rejects.toThrow();
  expect((await readLessonResume({ ...cache, entryKey: `${PAGE_CORRECTION_HISTORY_PREFIX}${cache.entryKey}` }))?.value).toEqual(history?.value);
});

it('keeps account writing/speech as pending self-review, excludes raw transcript and freezes the first observation', async () => {
  const practice = { idempotencyKey: 'writing-one', activityVersion: 'forge-v1', source: 'writing' as const,
    method: 'stroke-quiz' as const, activityId: 'character:一', skill: 'writing' as const, outcome: 'unverified' as const,
    score: null, metadata: { assistanceLevel: 2, usedPaper: true, hanzi: '一', transcript: 'private transcript' } };
  await savePracticeObservation(scope, practice);
  await savePracticeObservation(scope, practice);
  const first = await readWorkspace(scope);
  expect(first.entries).toHaveLength(2);
  expect(JSON.stringify(first.entries)).not.toContain('private transcript');
  expect(workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, first.entries, first.pending))
    .toMatchObject([{ module: 'writing', outcome: 'self-review', score: null, modality: 'handwriting', confirmationState: 'provisional',
      business: { details: { assistanceLevel: 2, usedPaper: true } }, masteryEligible: false }]);
  expect(await practiceObservationsConfirmed(scope, ['writing-one'])).toBe(false);
  await expect(savePracticeObservation(scope, { ...practice, metadata: { ...practice.metadata, assistanceLevel: 0 } })).rejects.toThrow('first');
  expect(await readWorkspace(scope)).toEqual(first);
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1, resetEpoch: 0, entries: JSON.parse(init!.body as string).entries }));
  expect(await practiceObservationsConfirmed(scope, ['writing-one'])).toBe(true);
  await saveDescriptiveActivity(scope, { operationId: 'speech-manual', module: 'speech', category: 'self-review',
    sourceId: 'phrase-one', itemId: 'phrase-one', contentVersion: 'old-content', activityVersion: 'old-version', modality: 'speech', details: { manual: true, lexicalToneAssessment: 'not-reported' } });
  const next = await readWorkspace(scope);
  expect(workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, next.entries, next.pending))
    .toHaveLength(2);
});

it('does not confirm a Reader session until both the observation and chapter business row are acknowledged', async () => {
  await saveDescriptiveActivity(scope, { operationId: 'chapter-summary', module: 'reader', category: 'session',
    sourceId: 'chapter', itemId: 'chapter', contentVersion: 'old', activityVersion: 'v1' });
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1, resetEpoch: 0, entries: JSON.parse(init!.body as string).entries }));
  expect(await practiceObservationsConfirmed(scope, ['chapter-summary'], ['reader.chapter:chapter'])).toBe(false);
  await saveWorkspaceChanges(scope, [{ key: 'reader.chapter:chapter', value: { completedAt: '2026-10-19T00:00:00Z' } }]);
  expect(await practiceObservationsConfirmed(scope, ['chapter-summary'], ['reader.chapter:chapter'])).toBe(false);
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1, resetEpoch: 0, entries: JSON.parse(init!.body as string).entries }));
  expect(await practiceObservationsConfirmed(scope, ['chapter-summary'], ['reader.chapter:chapter'])).toBe(true);
  await saveWorkspaceChanges(scope, [{ key: 'reader.chapter:chapter', value: { completedAt: '2026-10-19T00:00:00Z', paragraphId: 'next' } }]);
  expect(await practiceObservationsConfirmed(scope, ['chapter-summary'], ['reader.chapter:chapter'])).toBe(false);
});

it('journals dictionary exposure/reveal/self-review with real content digests, stable retries and no objective authority', async () => {
  const word: DictionaryWord = { id: 'word:一', simplified: '一', traditional: '一', pinyin: 'yī', pinyinNumbered: 'yi1',
    meaning: 'một', senses: ['một'], classifiers: [], partOfSpeech: 'số', toneNumbers: [1], tags: [], isCore: true };
  await saveDictionaryActivity(scope, word, 'lookup-one', 'lookup', 'numbers');
  await saveDictionaryActivity(scope, word, 'lookup-one', 'lookup', 'numbers');
  await saveDictionaryActivity(scope, word, 'reveal-one', 'reveal', 'numbers');
  await saveDictionaryActivity(scope, word, 'review-one', 'self-review', 'numbers');
  const journal = await readWorkspace(scope);
  const events = workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, journal.entries, journal.pending);
  expect(events).toHaveLength(3);
  expect(events.every(event => event.module === 'dictionary' && event.score === null && !event.masteryEligible
    && event.confirmationState === 'provisional' && event.sourceLessonIds.includes('numbers'))).toBe(true);
  expect(events.map(event => event.business?.category).sort()).toEqual(['exposure', 'self-review', 'support']);
  const original = events.find(event => event.business?.category === 'exposure')!;
  expect(original.contentVersion).toMatch(/^dictionary-display:sha256:[a-f0-9]{64}$/);
  await expect(saveDictionaryActivity(scope, { ...word, meaning: 'đã sửa' }, 'lookup-one', 'lookup', 'numbers')).rejects.toThrow('first');
  expect(await readWorkspace(scope)).toEqual(journal);
  await saveDictionaryActivity(scope, { ...word, meaning: 'đã sửa' }, 'lookup-two', 'lookup', 'numbers');
  await resetSyncDatabaseForTests();
  const reopened = await readWorkspace(scope);
  const revised = workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, reopened.entries, reopened.pending);
  expect(revised).toHaveLength(4);
  expect(new Set(revised.map(event => event.contentVersion)).size).toBe(2);
});

it('reads account document observations through the shared lesson/review/activity reader without guest-only validation rejecting them', async () => {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  const operationId = 'profile:first-save';
  const occurredAt = '2026-10-19T01:00:00Z';
  const document = createInitialSyncDocument(state, occurredAt, operationId);
  const source = { protocolVersion: 1 as const, operationId, idempotencyKey: operationId, ownerKey: scope.ownerGeneration.ownerKey,
    installationId: 'fixture-install', deviceId: 'fixture-device', deviceSequence: 1, baseRevision: 0,
    kind: 'snapshot' as const, contentVersion: state.contentVersion, occurredAt, document };
  await enqueueSyncOperation({ ...source, requestHash: await hashSyncPushOperation(source) }, state, scope.ownerGeneration);
  const history = await readLocalLearningHistory(scope);
  expect(history).toMatchObject([{ module: 'profile', authority: 'unknown', confirmationState: 'provisional', business: { category: 'preference' } }]);
});

it('keeps dictionary word/example synthetic playback requests distinct without claiming listening evidence', async () => {
  const word: DictionaryWord = { id: 'word:一', simplified: '一', traditional: '一', pinyin: 'yī', pinyinNumbered: 'yi1',
    meaning: 'một', senses: ['một'], classifiers: [], partOfSpeech: 'số', toneNumbers: [1], tags: [], isCore: true,
    example: '一个人', examplePinyin: 'yí ge rén', exampleMeaning: 'một người' };
  await saveDictionaryActivity(scope, word, 'word-play', 'tts');
  await saveDictionaryActivity(scope, word, 'word-play', 'tts');
  await saveDictionaryActivity(scope, word, 'example-play', 'tts', null, 'example');
  const journal = await readWorkspace(scope);
  const events = workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, journal.entries, journal.pending);
  expect(events).toHaveLength(2);
  expect(events.map(event => event.business?.details?.stimulus).sort()).toEqual(['example', 'word']);
  expect(events.every(event => event.business?.category === 'support' && event.business.details?.syntheticTts === true
    && event.business.details.playback === 'requested' && event.outcome === 'unknown' && event.score === null
    && !event.masteryEligible && event.modality === 'audio')).toBe(true);
  expect(JSON.stringify(journal)).not.toContain('一个人');
  await resetSyncDatabaseForTests();
  expect(await readWorkspace(scope)).toEqual(journal);
});

it('records actual speech stimulus versions and bypass separately, never transcript or pronunciation scores', async () => {
  const source = { activityId: 'speech:one', phraseId: 'phrase:one', sourceWordId: 'word:one', lessonId: 'boot-1',
    chinese: '你好吗？', focusWord: '你好', contentVersion: 'frozen-content', presentationVersion: 'core-v1' };
  await Promise.all([saveSpeechSupport(scope, source, 'word-tts', 'word-tts'), saveSpeechSupport(scope, source, 'word-tts', 'word-tts')]);
  await saveSpeechSupport(scope, source, 'phrase-tts', 'phrase-tts');
  await saveSpeechSupport(scope, source, 'bypass', 'audio-bypass');
  const before = await readWorkspace(scope);
  const events = workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, before.entries, before.pending);
  expect(events).toHaveLength(3);
  expect(events.every(event => event.business?.category === 'support' && event.skill === 'speaking' && event.outcome === 'unknown'
    && event.score === null && !event.masteryEligible && event.confirmationState === 'provisional')).toBe(true);
  expect(events.find(event => event.business?.details?.kind === 'audio-bypass')).toMatchObject({ modality: 'unknown',
    business: { details: { syntheticTts: false, playback: 'bypassed' } } });
  expect(events.every(event => event.sourceLessonIds.includes('boot-1'))).toBe(true);
  expect(JSON.stringify(before)).not.toMatch(/你好吗|你好/);
  await expect(saveSpeechSupport(scope, { ...source, chinese: 'changed' }, 'word-tts', 'word-tts')).rejects.toThrow('first');
  expect(await readWorkspace(scope)).toEqual(before);
  await resetSyncDatabaseForTests();
  expect(await readWorkspace(scope)).toEqual(before);
  await expect(syncWorkspace(scope, new AbortController().signal, async () => { throw new Error('offline'); })).rejects.toThrow();
  expect(await readWorkspace(scope)).toEqual(before);
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1,
    resetEpoch: 0, entries: JSON.parse(init!.body as string).entries }));
  expect(await practiceObservationsConfirmed(scope, ['word-tts', 'phrase-tts', 'bypass'])).toBe(true);
});

it('keeps legacy descriptive skill unknown on retry rather than rewriting immutable history', async () => {
  const input = { operationId: 'legacy-speech', module: 'speech' as const, category: 'self-review' as const,
    sourceId: 'source', itemId: 'item', contentVersion: 'legacy', activityVersion: 'legacy', modality: 'speech' as const };
  const value = { ...input, version: 1, occurredAt: '2026-10-19T01:00:00Z', outcome: 'self-review', hint: null, reveal: null, details: {} };
  await saveWorkspaceChanges(scope, [{ key: `activity.record:${JSON.stringify(['speech', input.operationId])}`, value }]);
  const before = await readWorkspace(scope);
  await saveDescriptiveActivity(scope, { ...input, skill: 'speaking' });
  expect(await readWorkspace(scope)).toEqual(before);
  expect(workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, before.entries, before.pending))
    .toMatchObject([{ skill: null, score: null, masteryEligible: false }]);
});
