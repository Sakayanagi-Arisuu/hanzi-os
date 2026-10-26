import { expect, it } from 'vitest';
import { DEFAULT_LEARNING_PREFERENCES, resolveLearningContext } from '../learning/learningPreferences';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { reduceLearnerModel } from './learnerModel';
import { composeShadowSession, type ComposerEligibility, type SessionIntent } from './sessionComposer';

const scope = { ownerKey: 'fixture:guest-a', resetEpoch: 3 };
const now = '2026-10-21T00:00:00Z';
async function setup() {
  const { graph, units } = await extractPilotLearningUnits();
  const model = await reduceLearnerModel({ graph, units, events: [], scope, asOf: now, allowInference: true });
  const eligibility: ComposerEligibility = { scope, authority: 'synthetic-test', entries: units.map(unit => ({ unitId: unit.id,
    binding: unit.binding, sourcePermitted: true, entitlementAllowed: true, lessonPrerequisitesAllowed: true,
    prepared: { ...scope, binding: unit.binding } })) };
  return { graph, units, model, eligibility, scope, now, preferences: { ...DEFAULT_LEARNING_PREFERENCES, allowInference: true },
    context: { online: true, audio: true, microphone: true, minutes: 5 as const } };
}
const intent = (kind: SessionIntent['kind']): SessionIntent => ({ kind, origin: 'synthetic-fixture' });
const signature = (manifest: Awaited<ReturnType<typeof composeShadowSession>>) => manifest.steps.map(step => step.kind === 'unit'
  ? `${step.unitId}:${step.taskType}:${step.modality}` : `${step.kind}:${step.offer.wordId}`).join('|');

it('does not claim that a manual quantity suggestion came from history when inference is disabled',async()=>{
  const input=await setup();
  const model=await reduceLearnerModel({...input,events:[],asOf:now,allowInference:false});
  const manifest=await composeShadowSession({...input,model,preferences:{...input.preferences,allowInference:false},intent:{kind:'quantity',origin:'manual'}});
  expect(manifest.steps).not.toHaveLength(0);
  expect(manifest.steps.every(step=>!step.reasonVi.includes('đã ghi nhận'))).toBe(true);
  expect(model.acceptedOccurrences).toBe(0);
});

it('produces genuinely different bounded unit/task manifests for four synthetic needs, keeping missing audio/challenge and skip policy unresolved', async () => {
  const input = await setup();
  const listen = await composeShadowSession({ ...input, intent: intent('listen') });
  const produce = await composeShadowSession({ ...input, intent: intent('produce') });
  const review = await composeShadowSession({ ...input, intent: intent('review'), reviewOffers: [{ cardId: 'card-one', wordId: 'hsk-vocab-00105',
    wordVersion: 'fixture-word-v1', cardRevision: 4, schedulerVersion: 'existing-scheduler-fixture', offerRevision: 'offer-1',
    dueAt: '2026-10-20T00:00:00Z', estimatedSeconds: 60, allowed: true }] });
  const transfer = await composeShadowSession({ ...input, intent: intent('transfer') });
  const all = [listen, produce, review, transfer];
  expect(new Set(all.map(signature)).size).toBe(4);
  expect(all.every(manifest => manifest.estimatedSeconds <= 300 && manifest.shadowOnly && !manifest.introSkipEligible
    && manifest.completionLessonIds.length === 0 && manifest.authorityGrants.length === 0)).toBe(true);
  expect(listen.unresolved).toContain('native-listening-content-unavailable'); expect(listen.requiresTaskChange).toBe(true);
  expect(transfer.unresolved).toContain('reviewed-unseen-challenge-unavailable'); expect(transfer.requiresTaskChange).toBe(true);
  expect(produce.steps.some(step => step.kind === 'unit' && step.taskType === 'guided-role-play')).toBe(true);
  const offer = review.steps.find(step => step.kind === 'fsrs-offer');
  expect(offer).toMatchObject({ offer: { cardRevision: 4, dueAt: '2026-10-20T00:00:00Z' }, receiptKind: 'existing-review-grade' });
  expect(await composeShadowSession({ ...input, intent: intent('listen') })).toEqual(listen);
});

it('hard-filters permission/source prerequisite/version/offline scope before ranking and preserves a typed no-mic route', async () => {
  const input = await setup();
  const typed = await composeShadowSession({ ...input, context: { ...input.context, microphone: false }, intent: intent('produce') });
  expect(typed.steps.some(step => step.kind === 'unit' && step.unitId === 'u.price.task09-text' && step.modality === 'text')).toBe(true);
  expect(typed.steps.every(step => step.kind !== 'unit' || step.modality !== 'speech')).toBe(true);
  const offline = await composeShadowSession({ ...input, context: { ...input.context, online: false, microphone: false }, intent: intent('produce') });
  expect(offline.status).toBe('shadow-plan');
  const blocked = structuredClone(input.eligibility);
  blocked.entries.forEach(entry => { entry.prepared = { ...scope, resetEpoch: 99, binding: entry.binding }; });
  const empty = await composeShadowSession({ ...input, eligibility: blocked, context: { ...input.context, online: false }, intent: intent('produce') });
  expect(empty.status).toBe('no-candidate'); expect(empty.steps).toEqual([]);
  const denied = structuredClone(input.eligibility); denied.entries.forEach(entry => { entry.entitlementAllowed = false; });
  expect((await composeShadowSession({ ...input, eligibility: denied, intent: intent('produce') })).steps).toEqual([]);
  const stale = structuredClone(input.eligibility); stale.entries.forEach(entry => { entry.binding = 'old'; });
  expect((await composeShadowSession({ ...input, eligibility: stale, intent: intent('explore') })).status).toBe('no-candidate');
});

it('keeps opt-out/manual choice, unknown cold start and owner scope distinct without opening content or rescheduling cards', async () => {
  const input = await setup();
  const optedOut = await composeShadowSession({ ...input, preferences: { ...input.preferences, allowInference: false }, intent: intent('produce') });
  expect(optedOut.status).toBe('manual-selection'); expect(optedOut.steps).toEqual([]);
  const manual = await composeShadowSession({ ...input, preferences: { ...input.preferences, allowInference: false }, intent: { kind: 'produce', origin: 'manual' } });
  expect(manual.status).toBe('shadow-plan');
  const cold = await composeShadowSession(input);
  expect(cold.intent).toEqual({ kind: 'explore', origin: 'default' });
  expect(cold.steps.length).toBeGreaterThan(0);
  await expect(composeShadowSession({ ...input, scope: { ...scope, resetEpoch: 4 } })).rejects.toThrow('scope');
  const missingPreparation = { ...input, units: input.units.filter(unit => unit.id !== 'u.number.rule'), intent: intent('produce') };
  expect((await composeShadowSession(missingPreparation)).status).toBe('no-candidate');
});

it('does not select unprepared offline FSRS offers or accept stale/conflicting card revisions', async () => {
  const input = await setup();
  const offer = { cardId: 'card', wordId: 'word', wordVersion: 'word-v1', cardRevision: 1, schedulerVersion: 'existing-scheduler',
    offerRevision: 'offer-v1', dueAt: '2026-10-20T00:00:00Z', estimatedSeconds: 60, allowed: true };
  const offline = { ...input, context: { ...input.context, online: false }, intent: intent('review') };
  expect((await composeShadowSession({ ...offline, reviewOffers: [offer] })).steps.every(step => step.kind !== 'fsrs-offer')).toBe(true);
  const prepared = { ...offer, prepared: { ...scope, offerRevision: offer.offerRevision, wordVersion: offer.wordVersion } };
  expect((await composeShadowSession({ ...offline, reviewOffers: [prepared] })).steps.some(step => step.kind === 'fsrs-offer')).toBe(true);
  await expect(composeShadowSession({ ...input, intent: intent('review'), reviewOffers: [offer, { ...offer, cardRevision: 2 }] })).rejects.toThrow('Conflicting');
  expect(() => resolveInvalidContext(input)).toThrow();
});

function resolveInvalidContext(input: Awaited<ReturnType<typeof setup>>) {
  // Runtime validation must reject malformed JSON values before any manifest is issued.
  return resolveLearningContext(input.preferences, { online: 'yes' as unknown as boolean });
}
