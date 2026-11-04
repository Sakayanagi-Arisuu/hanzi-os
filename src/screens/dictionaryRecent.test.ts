import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { CONTENT_VERSION } from '../data/curriculum';
import type { LearningState } from '../types';
import { createInitialSyncDocument } from '../sync/document';
import { ACTIVE_OWNER_GENERATION_KEY, resetSyncDatabaseForTests, writeSyncMeta, writeOwnerCheckpoint, writeLessonResume, readLessonResume } from '../sync/indexedDb';
import { clearDictionaryRecent, readDictionaryRecent, rememberDictionaryQuery, parseDictionaryRecent } from './dictionaryRecent';
const state = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Cache learner",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
});
afterEach(async () => { await resetSyncDatabaseForTests(); });
async function activate(ownerKey: string, generation: number, resetEpoch = 0) {
  const ownerGeneration = { ownerKey, generation };
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, ownerGeneration);
  const current = state(); const document = createInitialSyncDocument(current, new Date().toISOString(), 'fixture');
  document.reset.epoch = resetEpoch;
  await writeOwnerCheckpoint(ownerKey, 1, document, current, ownerGeneration);
  return { ownerGeneration, resetEpoch };
}
it('deduplicates and bounds recent queries; clearing preserves unrelated resume', async () => {
  const scope = await activate('anonymous:dictionary', 1);
  const unrelated = {expectedOwnerGeneration:scope.ownerGeneration, resetEpoch:0, entryKey:'lesson:keep'};
  await writeLessonResume({...unrelated, value:{page:3}});
  for(let i=0;i<15;i++) await rememberDictionaryQuery(scope, 'query'+i);
  await rememberDictionaryQuery(scope, 'query10');
  const queries = await readDictionaryRecent(scope);
  expect(queries).toHaveLength(12); expect(queries[0]).toBe('query10'); expect(new Set(queries).size).toBe(12);
  await clearDictionaryRecent(scope); expect(await readDictionaryRecent(scope)).toEqual([]);
  expect((await readLessonResume(unrelated))?.value).toEqual({page:3});
});
it('isolates owner and reset, rejecting stale owner writes', async () => {
  const first=await activate('anonymous:first',1); await rememberDictionaryQuery(first,'学习');
  const second=await activate('account:second',2); expect(await readDictionaryRecent(second)).toEqual([]);
  await expect(rememberDictionaryQuery(first,'wrong')).rejects.toThrow();
  const returned=await activate('anonymous:first',3); expect(await readDictionaryRecent(returned)).toEqual(['学习']);
  const reset=await activate('anonymous:first',4,1); expect(await readDictionaryRecent(reset)).toEqual([]);
  await expect(clearDictionaryRecent(returned)).rejects.toThrow();
});
it('does not silently overwrite malformed history', () => {
  expect(()=>parseDictionaryRecent({version:2,queries:['学习']})).toThrow();
  expect(()=>parseDictionaryRecent({version:1,queries:[null]})).toThrow();
});
