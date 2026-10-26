import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { advanceCharacterForgeSession, type CharacterForgeSession } from '../characters/characterForgeSession';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from './document';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, writeLessonResume, readLessonResume, type ActiveOwnerLearningScope } from './indexedDb';
import { readLocalActivityHistory } from './activityHistory';
import { readWorkspace, syncWorkspace } from './workspaceSync';
import { readWritingSession, recordWritingResponse, startWritingSession, updateWritingSession, writingSourceVersion, writingChangeNeedsCommit } from './writingSession';

let scope: ActiveOwnerLearningScope;
const session: CharacterForgeSession = { version: 1, source: 'quick', lessonId: 'boot-1', hanzis: ['人'],
  currentIndex: 0, phase: 'structure', completedHanzis: [], needsReplay: [], paperHanzis: [], assistanceByHanzi: {},
  updatedAt: '2026-10-20T00:00:00Z' };
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('account:writing'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('commits state and history once across retry, concurrent tabs and crash/reload; pending survives offline/rejection', async () => {
  const initial = await startWritingSession(scope, session, 'content-v1', 'source-v1');
  const next = advanceCharacterForgeSession(session, { now: '2026-10-20T00:01:00Z' });
  await Promise.all([updateWritingSession(scope, initial, next, 'exposure', { phase: 'structure' }),
    updateWritingSession(scope, initial, next, 'exposure', { phase: 'structure' })]);
  await resetSyncDatabaseForTests();
  const resumed = (await readWritingSession(scope))!;
  expect(resumed).toMatchObject({ id: initial.id, revision: 1, session: { phase: 'prediction' }, pending: true });
  expect(await readLocalActivityHistory(scope)).toHaveLength(2);
  const before = await readWorkspace(scope);
  await expect(syncWorkspace(scope, new AbortController().signal, async () => { throw new Error('offline'); })).rejects.toThrow();
  await expect(syncWorkspace(scope, new AbortController().signal, async () => new Response(null, { status: 409 }))).rejects.toThrow();
  expect(await readWorkspace(scope)).toEqual(before);
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1, resetEpoch: 0,
    entries: JSON.parse(init!.body as string).entries }));
  expect((await readWritingSession(scope))?.pending).toBe(false);
  expect(await readLocalActivityHistory(scope)).toHaveLength(2);
  expect((await readLocalActivityHistory(scope)).every(event => !event.masteryEligible && event.score === null)).toBe(true);
});

it('rejects stale or conflicting mutations without replacing the first phase record', async () => {
  const initial = await startWritingSession(scope, session, 'content-v1', 'source-v1');
  const next = advanceCharacterForgeSession(session, { now: '2026-10-20T00:01:00Z' });
  const committed = await updateWritingSession(scope, initial, next, 'exposure', { phase: 'structure' });
  const before = await readWorkspace(scope);
  await expect(updateWritingSession(scope, initial, { ...next, needsReplay: ['人'] }, 'exposure', { phase: 'structure' })).rejects.toThrow('first');
  expect(await readWorkspace(scope)).toEqual(before);
  const replay = await startWritingSession(scope, session, 'content-v2', 'source-v2');
  const after = await readWorkspace(scope);
  for (const entry of before.entries) expect(after.entries.find(row => row.key === entry.key)).toEqual(entry);
  expect(replay.id).not.toBe(initial.id);
  await expect(updateWritingSession(scope, committed, next, 'support', { phase: 'prediction' })).rejects.toThrow('another tab');
  expect((await readWritingSession(scope))?.contentVersion).toBe('content-v2');
  expect((await readLocalActivityHistory(scope)).some(event => event.contentVersion === 'content-v1')).toBe(true);
});

it('keeps raw records through quota, unknown schema and owner/reset switches', async () => {
  const initial = await startWritingSession(scope, session, 'content-v1', 'source-v1');
  const before = await readWorkspace(scope);
  const put = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (this.name === 'lesson-resumes') throw new DOMException('quota', 'QuotaExceededError');
    return key === undefined ? put.call(this, value) : put.call(this, value, key);
  });
  await expect(updateWritingSession(scope, initial, session, 'support', { assistance: 1 })).rejects.toThrow();
  failure.mockRestore(); expect(await readWorkspace(scope)).toEqual(before);
  await expect(readWritingSession({ ...scope, resetEpoch: 1 })).rejects.toThrow();
  const cache = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'workspace-sync:v1' };
  await writeLessonResume({ ...cache, value: { version: 99, raw: 'keep' } });
  await expect(startWritingSession(scope, session, 'content-v1', 'source-v1')).rejects.toThrow();
  expect((await readLessonResume(cache))?.value).toEqual({ version: 99, raw: 'keep' });
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'account:other', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-20T00:00:00Z', 'switch'), INITIAL_LEARNING_STATE);
  await expect(readWritingSession(scope)).rejects.toThrow();
});

it('records explicit legacy adoption now without inventing prior answers, time or old source versions', async () => {
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:writing', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-20T00:00:00Z', 'guest'), INITIAL_LEARNING_STATE);
  const guest = (await readActiveOwnerLearningScope())!;
  const legacy = { ...session, phase: 'recall' as const };
  const adopted = await startWritingSession(guest, legacy, 'current-v1', 'current-source-v1', true);
  expect(adopted).toMatchObject({ session: legacy, legacy: true, pending: false });
  const history = await readLocalActivityHistory(guest);
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ authority: 'local-practice', score: null, masteryEligible: false,
    business: { category: 'session', details: { action: 'adopt-legacy', legacySourceVersion: 'unknown', previousTimeKnown: false } } });
});

it('pins actual character/context payload rather than only the course label', async () => {
  expect(await writingSourceVersion('v1', [{ id: 'same', contextWord: '人民' }]))
    .not.toBe(await writingSourceVersion('v1', [{ id: 'same', contextWord: '人口' }]));
});

it('keeps the first wrong choice immutable when corrected, reloaded or retried', async () => {
  const initial = await startWritingSession(scope, { ...session, phase: 'prediction' }, 'v1', 'source-v1');
  const wrong = await recordWritingResponse(scope, initial, 'ngang', false);
  const corrected = await recordWritingResponse(scope, wrong, 'dọc', true);
  await recordWritingResponse(scope, wrong, 'dọc', true);
  await resetSyncDatabaseForTests();
  expect((await readWritingSession(scope))?.responses['0:prediction']).toEqual({ firstAnswer: 'ngang', firstCorrect: false,
    latestAnswer: 'dọc', latestCorrect: true, attempts: 2 });
  expect(corrected.session.needsReplay).toEqual(['人']);
  const events = await readLocalActivityHistory(scope);
  expect(events.filter(event => event.business?.category === 'objective')).toHaveLength(1);
  expect(events.find(event => event.business?.category === 'objective')).toMatchObject({ outcome: 'incorrect', masteryEligible: false,
    modality: 'text', business: { details: { answer: 'ngang', firstResponse: true, priorExposure: true } } });
  expect(events.filter(event => event.business?.category === 'support')).toHaveLength(1);
  expect(events.find(event => event.business?.category === 'support')?.outcome).toBe('unknown');
});

it('deduplicates a retried open with its original command identity', async () => {
  const first = await startWritingSession(scope, session, 'v1', 'source-v1', false, 'stable-open-command');
  const retry = await startWritingSession(scope, session, 'v1', 'source-v1', false, 'stable-open-command');
  expect(retry.id).toBe(first.id);
  expect(await readLocalActivityHistory(scope)).toHaveLength(1);
});

it('does not write a new assistance event when a second tab mounts with the already saved level', async () => {
  const initial = await startWritingSession(scope, session, 'v1', 'source-v1');
  const next = { ...session, assistanceByHanzi: { 人: 3 } };
  const [first, tab] = await Promise.all([
    updateWritingSession(scope, initial, next, 'support', { phase: 'assistance', hanzi: '人', assistanceLevel: 3 }),
    updateWritingSession(scope, initial, { ...next, updatedAt: '2026-10-20T00:02:00Z' },
      'support', { phase: 'assistance', hanzi: '人', assistanceLevel: 3 }),
  ]);
  expect(tab.revision).toBe(first.revision);
  expect(await readLocalActivityHistory(scope)).toHaveLength(2);
});

it('does not acknowledge a conflicting server branch merely because its clock is newer', async () => {
  const initial = await startWritingSession(scope, session, 'v1', 'source-v1');
  const before = await readWorkspace(scope);
  const source = before.entries.find(entry => entry.key.startsWith('activity.record:'))!;
  await syncWorkspace(scope, new AbortController().signal, async () => Response.json({ version: 1, resetEpoch: 0,
    entries: [{ ...source, changeId: 'other-device-canonical', changedAt: source.changedAt + 1 }] }));
  const after = await readWorkspace(scope);
  expect(after.pending).toEqual(before.pending);
  expect(await readWritingSession(scope)).toMatchObject({ id: initial.id, pending: true });
});

it('retains the actual released character ID and original lesson even in a free queue', async () => {
  await startWritingSession(scope, { ...session, lessonId: null }, 'v1', 'source-v1', false, 'source-linked',
    { 人: { id: 'stable-character-item', lessonId: 'boot-1' } });
  const [event] = await readLocalActivityHistory(scope);
  expect(event).toMatchObject({ itemId: 'stable-character-item', sourceLessonIds: ['boot-1'],
    business: { details: { hanzi: '人', itemIdentity: 'released-character-id' } } });
});

it('commits support actions before their effects even when they do not move the session cursor', async () => {
  const initial = await startWritingSession(scope, session, 'v1', 'source-v1');
  expect(writingChangeNeedsCommit(session, session, 'support', { phase: 'assistance', assistanceLevel: 3 })).toBe(false);
  expect(writingChangeNeedsCommit(session, session, 'session', {})).toBe(false);
  let saved = initial;
  for (const kind of ['reveal', 'tts', 'order-replay', 'stroke-rescue']) {
    const details = { phase: 'structure', kind, syntheticTts: kind === 'tts', playback: kind === 'tts' ? 'requested' : null };
    expect(writingChangeNeedsCommit(saved.session, saved.session, 'support', details)).toBe(true);
    saved = await updateWritingSession(scope, saved, saved.session, 'support', details);
  }
  expect(saved.revision).toBe(4);
  expect(saved.session).toEqual(session);
  const support = (await readLocalActivityHistory(scope)).filter(event => event.business?.category === 'support');
  expect(support).toHaveLength(4);
  expect(support.map(event => event.business?.details?.kind)).toEqual(expect.arrayContaining(['reveal', 'tts', 'order-replay', 'stroke-rescue']));
  expect(support.find(event => event.business?.details?.kind === 'tts')?.assistance.tts).toBe(true);
  expect(support.every(event => !event.masteryEligible && event.outcome === 'unknown')).toBe(true);
});
