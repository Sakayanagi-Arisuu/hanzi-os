import { expect, it } from 'vitest';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { DEFAULT_LEARNING_PREFERENCES } from '../learning/learningPreferences';
import { sha256Hex } from '../sync/canonicalHash';
import { reduceLearnerModel } from './learnerModel';
import { composeShadowSession, type ComposerEligibility } from './sessionComposer';
import { planLongTermPractice } from './longTermPractice';

const scope = { ownerKey: 'anonymous:return-pilot', resetEpoch: 2 };
const now = '2026-10-23T00:00:00Z';
async function setup(occurredAt: string | null = '2026-10-16T00:00:00Z') {
  const { graph, units } = await extractPilotLearningUnits();
  const unit = units.find(unit => unit.skill === 'writing')!;
  const event = { ...createActivityHistoryEvent({ ...scope, operationId: 'first', module: 'overview',
    category: 'objective', sourceId: unit.source.lessonId, itemId: unit.id,
    contentVersion: unit.source.contentVersion, activityVersion: unit.binding, sourceRecordRef: 'first',
    skill: unit.skill, modality: unit.modality, occurredAt, outcome: 'incorrect' }),
    authority: 'local-practice' as const, lineage: 'guest-business-commit' as const };
  const model = await reduceLearnerModel({ graph, units, events: [event], scope, asOf: now, allowInference: true });
  const eligibility: ComposerEligibility = { scope, authority: 'guest-released-source',
    entries: units.map(unit => ({ unitId: unit.id, binding: unit.binding, sourcePermitted: true,
      entitlementAllowed: true, lessonPrerequisitesAllowed: true, prepared: { ...scope, binding: unit.binding } })) };
  return { graph, units, model, event, scope, now, eligibility,
    preferences: { ...DEFAULT_LEARNING_PREFERENCES, allowInference: true },
    context: { minutes: 20 as const, online: true, audio: false, microphone: false },
    budgetSeconds: 1200, allowInference: true, automatic: true };
}

it('offers a bounded return without declaring forgetting, skip, mastery or a diagnostic', async () => {
  const input = await setup();
  expect(await planLongTermPractice(input)).toMatchObject({ reentry: true, budgetSeconds: 300,
    introSkipEligible: false, prerequisiteEligible: false, diagnostic: 'reviewed-unseen-items-required',
    delayedRecall: 'reviewed-unseen-items-required' });
  const before = JSON.stringify(input.model);
  const manifest = await composeShadowSession(input);
  expect(manifest.intent).toEqual({ kind: 'explore', origin: 'default' });
  expect(manifest.steps.length).toBeGreaterThan(0);
  expect(manifest.estimatedSeconds).toBeLessThanOrEqual(300);
  expect(manifest.unresolved).toContain('gentle-reentry-not-a-memory-assessment');
  expect(manifest.authorityGrants).toEqual([]);
  expect(manifest.completionLessonIds).toEqual([]);
  expect(manifest.introSkipEligible).toBe(false);
  expect(JSON.stringify(input.model)).toBe(before);
});

it('keeps recent errors, explicit goals, opt-out and five-minute choices distinct', async () => {
  const input = await setup('2026-10-16T00:00:00.001Z');
  expect((await planLongTermPractice(input)).reentry).toBe(false);
  expect((await composeShadowSession(input)).intent.kind).toBe('produce');
  const old = await setup();
  const manual = await composeShadowSession({ ...old, intent: { kind: 'produce', origin: 'manual' } });
  expect(manual.intent.kind).toBe('produce');
  expect(manual.unresolved).not.toContain('gentle-reentry-not-a-memory-assessment');
  expect(await planLongTermPractice({ ...old, allowInference: false })).toMatchObject({ reentry: false, budgetSeconds: 1200 });
  expect((await composeShadowSession({ ...old, preferences: { ...old.preferences, allowInference: false } })).steps).toEqual([]);
  const short = await composeShadowSession({ ...old, context: { ...old.context, minutes: 5 } });
  expect(short.estimatedSeconds).toBeLessThanOrEqual(300);
});

it('does not treat cold start, unknown time or pending observations as an absence signal', async () => {
  const input = await setup(null);
  expect((await planLongTermPractice(input)).reentry).toBe(false);
  const accountScope = { ...scope, ownerKey: 'siwc_' + 'a'.repeat(64) };
  const pending = createActivityHistoryEvent({ ...input.event, ...accountScope, category: 'objective',
    occurredAt: '2026-10-01T00:00:00Z' });
  const model = await reduceLearnerModel({ ...input, scope: accountScope, events: [pending], asOf: now });
  expect((await planLongTermPractice({ ...input, model, scope: accountScope })).reentry).toBe(false);
});

it('uses occurrence time after late sync, deduplicates retries and excludes future receipts', async () => {
  const input = await setup();
  const received = { ...input.event, receivedAt: now };
  const model = await reduceLearnerModel({ ...input, events: [received, received], asOf: now });
  expect(model.acceptedOccurrences).toBe(1);
  expect((await planLongTermPractice({ ...input, model })).reentry).toBe(true);
  const future = await reduceLearnerModel({ ...input, events: [{ ...received, receivedAt: '2026-10-24T00:00:00Z' }], asOf: now });
  expect((await planLongTermPractice({ ...input, model: future })).reentry).toBe(false);
});

it('retains hard source/offline gates on return and rejects stale scope or altered clocks', async () => {
  const input = await setup();
  const denied = { ...input.eligibility, entries: input.eligibility.entries.map(entry => ({ ...entry, sourcePermitted: false })) };
  expect((await composeShadowSession({ ...input, eligibility: denied })).steps).toEqual([]);
  const offline = { ...input.eligibility, entries: input.eligibility.entries.map(entry => ({ ...entry, prepared: undefined })) };
  expect((await composeShadowSession({ ...input, eligibility: offline, context: { ...input.context, online: false } })).steps).toEqual([]);
  await expect(planLongTermPractice({ ...input, scope: { ...scope, resetEpoch: 3 } })).rejects.toThrow('scope');
  const { binding: _, ...body } = input.model;
  const altered = { ...body, cells: body.cells.map((cell, i) => i ? cell : { ...cell, latestObservedAt: '2026-10-24T00:00:00Z' }) };
  const model = { ...altered, binding: await sha256Hex(altered) };
  await expect(planLongTermPractice({ ...input, model })).rejects.toThrow('clock');
});
