import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { readJourneyScope } from './journeyScope';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, resetSyncDatabaseForTests, transitionOwnerCheckpoint } from './indexedDb';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createIntegratedJourneyCheckpoint, parseIntegratedJourneyCheckpoint } from '../learning/integratedJourney';

afterEach(async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>(resolve => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); });
});

it('uses the real guest reset epoch, rejects old account scope and cannot revive a journey for the same lesson anchor', async () => {
  const ownerKey = 'anonymous:journey-test';
  await readOrInitializeOwnerGeneration(ownerKey);
  const initial = (await readJourneyScope(ownerKey))!;
  const checkpoint = createIntegratedJourneyCheckpoint({ scopeKey: initial.scopeKey, goal: 'conversation', anchorLessonId: 'boot-1' });
  const document = createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-19T00:00:00Z', 'reset-test');
  document.reset.epoch = 7;
  await transitionOwnerCheckpoint(initial.ownerGeneration, ownerKey, 0, document, INITIAL_LEARNING_STATE);
  const afterReset = (await readJourneyScope(ownerKey))!;
  expect(afterReset.scopeKey).toBe(`${ownerKey}:7`);
  expect(parseIntegratedJourneyCheckpoint(checkpoint, afterReset.scopeKey)).toBeNull();
  expect(await readJourneyScope(ownerKey, 0)).toBeNull();
  expect(await readJourneyScope('account:other')).toBeNull();
  const current = (await readActiveOwnerLearningScope())!;
  await transitionOwnerCheckpoint(current.ownerGeneration, 'account:other', 0, document, INITIAL_LEARNING_STATE);
  expect(await readJourneyScope(ownerKey)).toBeNull();
  expect((await readJourneyScope('account:other', 7))?.scopeKey).toBe('account:other:7');
});
