import { expect, it } from 'vitest';
import { DEFAULT_LEARNING_PREFERENCES } from '../learning/learningPreferences';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import type { LessonHistoryEventV1 } from '../learning/lessonHistory';
import { replayPilotTimeline, verifyPilotReplayReport } from './replayPilot';
import { sha256Hex } from '../sync/canonicalHash';
import type { SessionIntent, ComposerEligibility } from './sessionComposer';

async function setup() {
  const { graph, units } = await extractPilotLearningUnits();
  const scope = { ownerKey: 'fixture:replay:technical', resetEpoch: 2 };
  const unit = units.find(unit => unit.id === 'u.number.rule')!;
  const first = createActivityHistoryEvent({ ...scope, operationId: 'first-wrong', module: 'overview',
    category: 'objective', sourceId: unit.source.lessonId, itemId: unit.id, contentVersion: unit.source.contentVersion,
    activityVersion: unit.binding, sourceRecordRef: 'first-wrong', skill: unit.skill, modality: unit.modality,
    occurredAt: '2026-10-01T00:00:00Z', outcome: 'incorrect' });
  const receipt: LessonHistoryEventV1 = { ...first, confirmationState: 'confirmed', authority: 'server-recorded',
    receiptRef: 'fixture-receipt', receivedAt: '2026-10-02T00:00:00Z' };
  const correction = { ...createActivityHistoryEvent({ ...scope, operationId: 'correction', module: 'overview',
    category: 'support', sourceId: unit.source.lessonId, itemId: unit.id, contentVersion: unit.source.contentVersion,
    activityVersion: unit.binding, sourceRecordRef: 'correction', skill: unit.skill, modality: unit.modality,
    occurredAt: '2026-10-03T00:00:00Z', details: { correction: true } }),
    confirmationState: 'confirmed' as const, authority: 'server-recorded' as const, receiptRef: 'fixture-correction',
    receivedAt: '2026-10-04T00:00:00Z' };
  const eligibility: ComposerEligibility = { scope, authority: 'synthetic-test', entries: units.map(unit => ({
    unitId: unit.id, binding: unit.binding, sourcePermitted: true, lessonPrerequisitesAllowed: true, entitlementAllowed: true,
  })) };
  const point = { at: '2026-10-10T00:00:00Z', preferences: { ...DEFAULT_LEARNING_PREFERENCES, allowInference: true },
    context: { minutes: 5 as const, online: true, audio: false, microphone: false } };
  return { graph, units, scope, eligibility, first, receipt, correction, point };
}

it('replays receipt permutations/retries deterministically while keeping first error and unknown recall', async () => {
  const input = await setup();
  const source = [input.correction, input.first, input.receipt];
  const before = JSON.stringify(source);
  const a = await replayPilotTimeline({ ...input, events: source, checkpoints: [input.point] });
  const b = await replayPilotTimeline({ ...input, events: [input.receipt, input.first, input.correction, input.receipt], checkpoints: [input.point] });
  expect(a.binding).toBe(b.binding);
  expect(a.sourceSnapshot.binding).not.toBe(b.sourceSnapshot.binding);
  const frozen = JSON.parse(JSON.stringify(a.sourceSnapshot.input)) as typeof a.sourceSnapshot.input;
  const replayed = await replayPilotTimeline({ ...frozen, events: frozen.events ?? [] });
  expect(replayed.binding).toBe(a.binding);
  expect(await verifyPilotReplayReport(JSON.parse(JSON.stringify(a)))).toMatchObject({ verified: 'synthetic-semantic-replay-only', timingAttested: false });
  const cell = a.snapshots[0]!.cells.find(cell => cell.competencyId === 'c.number.quantity')!;
  expect(cell).toMatchObject({ observedUniqueItems: 1, reportedIncorrect: 1, supports: 1,
    firstIncorrectRef: input.first.logicalActivityId, sufficiency: 'unknown', independentDistinctItems: null });
  expect(a).toMatchObject({ efficacy: 'not-measured', independentRecall: 'unknown',
    baselineArmComparison: 'requires-reviewed-protocol-and-cohort' });
  expect(a.performance.totalMs).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(source)).toBe(before);
});

it('rejects modified outputs even if the report hash is recomputed, and detects source tampering', async () => {
  const input = await setup();
  const report = await replayPilotTimeline({ ...input, events: [input.first, input.receipt], checkpoints: [input.point] });
  const changed = structuredClone(report);
  changed.snapshots[0]!.acceptedOccurrences = 999;
  await expect(verifyPilotReplayReport(changed)).rejects.toThrow('changed');
  const { binding: _, sourceSnapshot: __, performance: ___, ...body } = changed;
  changed.binding = await sha256Hex(body);
  await expect(verifyPilotReplayReport(changed)).rejects.toThrow('frozen');
  const source = structuredClone(report);
  source.sourceSnapshot.input.eligibility.entries[0]!.sourcePermitted = false;
  await expect(verifyPilotReplayReport(source)).rejects.toThrow('changed');
});

it('does not use a late receipt before it was received, and leaves first error after correction', async () => {
  const input = await setup();
  const result = await replayPilotTimeline({ ...input, events: [input.first, input.receipt, input.correction], checkpoints: [
    { ...input.point, at: '2026-10-01T12:00:00Z' }, { ...input.point, at: '2026-10-02T12:00:00Z' }, input.point,
  ] });
  expect(result.snapshots.map(snapshot => snapshot.acceptedOccurrences)).toEqual([0, 1, 2]);
  expect(result.snapshots[0]!.cells.find(cell => cell.competencyId === 'c.number.quantity')?.pendingOccurrences).toBe(1);
  expect(result.snapshots[2]!.cells.find(cell => cell.competencyId === 'c.number.quantity')?.reportedIncorrect).toBe(1);
});

it('demonstrates four distinct task paths, five-minute budget and no-mic/native-audio/holdout limits', async () => {
  const input = await setup();
  const manifests = [];
  for (const kind of ['quantity', 'listen', 'produce', 'transfer'] as SessionIntent['kind'][]) {
    const result = await replayPilotTimeline({ ...input, events: [], checkpoints: [{ ...input.point, intent: { kind, origin: 'manual' } }] });
    const snapshot = result.snapshots[0]!;
    manifests.push(snapshot);
    expect(snapshot.estimatedSeconds).toBeLessThanOrEqual(300);
    expect(snapshot.steps.every(step => step.kind !== 'unit' || step.modality !== 'speech')).toBe(true);
  }
  expect(new Set(manifests.map(snapshot => snapshot.steps.map(step => step.kind === 'unit' ? step.unitId : step.kind).join('|'))).size).toBe(4);
  expect(manifests[1]!.unresolved).toContain('audio-disabled');
  expect(manifests[3]!.unresolved).toContain('reviewed-unseen-challenge-unavailable');
});

it('never reads opted-out history and refuses learner scopes, backward clocks and inaccessible source', async () => {
  const input = await setup();
  const unreadable = new Proxy([] as LessonHistoryEventV1[], { get: () => { throw Error('History read without consent'); } });
  const result = await replayPilotTimeline({ ...input, events: unreadable, checkpoints: [{ ...input.point,
    preferences: { ...input.point.preferences, allowInference: false } }] });
  expect(result.snapshots[0]!.acceptedOccurrences).toBe(0);
  expect(result.snapshots[0]!.steps).toEqual([]);
  expect(result.sourceSnapshot.history).toBe('not-read-opt-out');
  expect(result.sourceSnapshot.input.events).toBeNull();
  await expect(replayPilotTimeline({ ...input, events: [], scope: { ...input.scope, ownerKey: 'anonymous:real' }, checkpoints: [input.point] })).rejects.toThrow('Synthetic');
  await expect(replayPilotTimeline({ ...input, events: [], checkpoints: [input.point, input.point] })).rejects.toThrow('increase');
  const denied = { ...input.eligibility, entries: input.eligibility.entries.map(entry => ({ ...entry, sourcePermitted: false })) };
  expect((await replayPilotTimeline({ ...input, eligibility: denied, events: [], checkpoints: [input.point] })).snapshots[0]!.steps).toEqual([]);
});
