import { expect, it } from 'vitest';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import type { LessonHistoryEventV1 } from '../learning/lessonHistory';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { reduceLearnerModel } from './learnerModel';
import type { LearningUnit } from './learningUnit';

const scope = { ownerKey: 'anonymous:model-fixture', resetEpoch: 2 };
const asOf = '2026-10-21T00:00:00Z';
const event = (unit: LearningUnit, operationId: string, patch: Partial<LessonHistoryEventV1> = {}): LessonHistoryEventV1 => ({
  ...createActivityHistoryEvent({ ...scope, ownerKey: patch.ownerKey ?? scope.ownerKey, operationId, module: 'lessons', category: patch.business?.category ?? 'objective', sourceId: unit.source.lessonId,
    itemId: unit.id, contentVersion: unit.source.contentVersion, activityVersion: unit.binding, occurredAt: '2026-10-13T00:00:00Z',
    sourceRecordRef: operationId, outcome: 'incorrect', skill: unit.skill, modality: unit.modality }),
  authority: 'local-practice', lineage: 'guest-business-commit', ...patch,
  taskType: `record-${patch.business?.category ?? 'objective'}`,
});

it('replays duplicate/late receipts without extra unique items, retains first errors after correction and leaves independent mastery unknown', async () => {
  const { graph, units } = await extractPilotLearningUnits();
  const unit = units[0];
  const wrong = event(unit, 'first');
  const receipt: LessonHistoryEventV1 = { ...wrong, authority: 'server-recorded', confirmationState: 'confirmed', receiptRef: 'receipt', receivedAt: '2026-10-13T00:01:00Z' };
  const corrected = event(unit, 'correction', { business: { version: 1, category: 'support', details: { correction: true } },
    outcome: 'unknown', score: null, firstResponseRef: null, occurredAt: '2026-10-13T00:02:00Z' });
  const repeated = event(unit, 'another-occurrence', { outcome: 'correct', score: 100, occurredAt: '2026-10-20T00:00:00Z' });
  const input = { graph, units, scope, asOf, allowInference: true };
  const model = await reduceLearnerModel({ ...input, events: [corrected, receipt, wrong, repeated] });
  const reordered = await reduceLearnerModel({ ...input, events: [repeated, wrong, receipt, corrected] });
  expect(reordered).toEqual(model);
  const cell = model.cells.find(cell => cell.competencyId === 'c.number.quantity')!;
  expect(cell).toMatchObject({ status: 'practice-observed', observedUniqueItems: 1, observedDays: 2,
    reportedIncorrect: 1, reportedCorrect: 1, supports: 1, independentDistinctItems: null, sufficiency: 'unknown',
    introSkipEligible: false, prerequisiteEligible: false, firstIncorrectRef: wrong.logicalActivityId });
  expect(model.cells.find(cell => cell.competencyId === 'c.price.comprehend')?.status).toBe('unknown');
});

it('keeps pending, future receipt, unknown time, imported/version/dimension mismatches separate from successful practice', async () => {
  const { graph, units } = await extractPilotLearningUnits();
  const unit = units[0];
  const accountScope = { ownerKey: 'account:model', resetEpoch: 2 };
  const accountEvent = (id: string, patch: Partial<LessonHistoryEventV1> = {}) => event(unit, id,
    { ...patch, ownerKey: accountScope.ownerKey, authority: patch.authority ?? 'unknown', lineage: 'command-journal' });
  const accountEvents = [accountEvent('pending'), accountEvent('future', { receivedAt: '2026-10-22T00:00:00Z' }),
    accountEvent('time', { occurredAt: null, clockSource: 'unknown', confirmationState: 'confirmed', authority: 'server-recorded', receiptRef: 'receipt-time', receivedAt: '2026-10-13T00:01:00Z' }),
    accountEvent('version', { activityVersion: 'old-version' }), accountEvent('dimension', { skill: 'listening', modality: 'audio' }),
    accountEvent('imported', { business: { version: 1, category: 'objective', details: { imported: true } } })];
  const model = await reduceLearnerModel({ graph, units, scope: accountScope, asOf, allowInference: true, events: accountEvents });
  expect(model.acceptedOccurrences).toBe(0);
  expect(model.cells.every(cell => cell.status === 'unknown' && cell.independentDistinctItems === null)).toBe(true);
  expect(model.cells[0].pendingOccurrences).toBe(1);
  expect(model.reasons).toMatchObject({ 'after-cutoff': 1, 'no-current-unit-binding': 1, 'unknown-or-mismatched-dimension': 1, 'imported-observation': 1 });
});

it('does not scan history on opt-out or infer ability from profile/dictionary/visit events, and rejects conflicting raw observations', async () => {
  const { graph, units } = await extractPilotLearningUnits();
  const unreadable = new Proxy([] as LessonHistoryEventV1[], { get: () => { throw new Error('history must not be read'); } });
  const disabled = await reduceLearnerModel({ graph, units, scope, asOf, allowInference: false, events: unreadable });
  expect(disabled.status).toBe('disabled');
  const legacy = event(units[0], 'legacy', { module: 'profile', itemId: 'profile', activityVersion: 'unknown' });
  const model = await reduceLearnerModel({ graph, units, scope, asOf, allowInference: true, events: [legacy] });
  expect(model.unknownByModule.profile).toBe(1);
  const wrong = event(units[0], 'same');
  const source = [wrong, { ...wrong, outcome: 'correct' as const, score: 100 as const }];
  const before = JSON.stringify(source);
  await expect(reduceLearnerModel({ graph, units, scope, asOf, allowInference: true, events: source })).rejects.toThrow('Conflicting');
  expect(JSON.stringify(source)).toBe(before);
});

it('retains known first outcomes/time when an ack omits them and does not use a future receipt to confirm an earlier pending attempt', async () => {
  const { graph, units } = await extractPilotLearningUnits();
  const wrong = event(units[0], 'first');
  const blankAck: LessonHistoryEventV1 = { ...wrong, outcome: 'unknown', score: null, occurredAt: null, clockSource: 'unknown',
    receivedAt: '2026-10-14T00:00:00Z', authority: 'server-recorded', confirmationState: 'confirmed', receiptRef: 'receipt' };
  const input = { graph, units, scope, asOf, allowInference: true };
  const a = await reduceLearnerModel({ ...input, events: [wrong, blankAck] });
  const b = await reduceLearnerModel({ ...input, events: [blankAck, wrong] });
  expect(a).toEqual(b);
  expect(a.cells[0]).toMatchObject({ reportedIncorrect: 1, latestObservedAt: wrong.occurredAt, firstIncorrectRef: wrong.logicalActivityId });
  const beforeAck = await reduceLearnerModel({ ...input, asOf: '2026-10-13T12:00:00Z', events: [wrong, blankAck] });
  expect(beforeAck.cells[0].reportedIncorrect).toBe(1); // The guest commit was already available locally.
  const accountScope = { ownerKey: 'account:model', resetEpoch: 2 };
  const pending = event(units[0], 'pending', { ownerKey: accountScope.ownerKey, authority: 'unknown', lineage: 'command-journal' });
  const confirmed: LessonHistoryEventV1 = { ...pending, authority: 'server-recorded', confirmationState: 'confirmed',
    receiptRef: 'account-receipt', receivedAt: '2026-10-14T00:00:00Z' };
  const early = await reduceLearnerModel({ ...input, scope: accountScope, asOf: '2026-10-13T12:00:00Z', events: [pending, confirmed] });
  expect(early.cells[0]).toMatchObject({ reportedIncorrect: 0, pendingOccurrences: 1, status: 'unknown' });
});
