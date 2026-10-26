import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { guestActivityHistoryEvent } from '../learning/activityHistory';
import { materializeEvidence } from '../lib/evidence';
import type { PracticeEvidenceInput } from '../types';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests, writeLessonResume } from './indexedDb';
import { retainedWritingSummaryTime } from './writingSummaryRecovery';

const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>(resolve => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget()); await readOrInitializeOwnerGeneration('anonymous:summary-recovery'); });
afterEach(async () => { vi.unstubAllGlobals(); await clear(); });

it('recovers only a real matching summary clock, without rewriting history or inventing old time', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  const input: PracticeEvidenceInput = { idempotencyKey: 'forge-summary', source: 'writing', method: 'stroke-quiz', skill: 'writing',
    activityId: 'character-forge:free:好', activityVersion: 'forge-v1', outcome: 'unverified', score: null, metadata: { sessionSummary: true } };
  expect(await retainedWritingSummaryTime(scope, input)).toBeUndefined();
  const event = guestActivityHistoryEvent({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0,
    evidence: materializeEvidence(input, '2026-10-20T10:11:12.000Z') });
  await writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: event.eventId, value: event });
  expect(await retainedWritingSummaryTime(scope, input)).toBe('2026-10-20T10:11:12.000Z');
  await expect(retainedWritingSummaryTime(scope, { ...input, activityVersion: 'changed' })).rejects.toThrow('Conflicting');
  expect(await retainedWritingSummaryTime(scope, { ...input, idempotencyKey: 'new-summary' })).toBeUndefined();
});
