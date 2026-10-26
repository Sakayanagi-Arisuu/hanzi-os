import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { createInitialSyncDocument } from '../sync/document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { composeShadowSession } from './sessionComposer';
import { reduceLearnerModel } from './learnerModel';
import { sealPracticeManifest } from './practiceManifest';
import { localAdaptivePilotAvailable, requestAccountPracticePlan } from './adaptivePlanClient';
import type {PilotCompetencyMap} from './pilotCompetencyMap';

let scope: ActiveOwnerLearningScope;
const now = '2026-10-22T00:00:00Z';
const input = { preferences: null, context: { online: true, minutes: 5 as const }, intent: { kind: 'quantity' as const, origin: 'manual' as const } };
const clear = async () => { await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); };
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration(`siwc_${'a'.repeat(64)}`); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.unstubAllGlobals(); await clear(); });
async function plan() {
  const { graph, units } = await extractPilotLearningUnits();
  const owner = { ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch };
  const model = await reduceLearnerModel({ graph, units, scope: owner, events: [], asOf: now, allowInference: false });
  const shadow = await composeShadowSession({ graph, units, model, scope: owner, now, ...input,
    eligibility: { scope: owner, authority: 'server-validated', entries: units.map(unit => ({ unitId: unit.id,
      binding: unit.binding, sourcePermitted: true, entitlementAllowed: true, lessonPrerequisitesAllowed: true })) } });
  return sealPracticeManifest(shadow);
}

it('keeps the opt-in pilot confined to authorized loopback content', () => {
  expect(localAdaptivePilotAvailable('localhost', true)).toBe(true);
  expect(localAdaptivePilotAvailable('127.0.0.1', true)).toBe(true);
  for (const hostname of ['example.com', 'localhost.evil.test', '127.0.0.1.evil.test', '']) expect(localAdaptivePilotAvailable(hostname, true)).toBe(false);
  expect(localAdaptivePilotAvailable('localhost', false)).toBe(false);
});

it('requests explicit practice with owner/reset fences and validates the manifest before presenting it', async () => {
  const manifest = await plan();
  const send = vi.fn<typeof fetch>(async () => Response.json({ schemaVersion: 1, executionEnabled: true, manifest }));
  expect(await requestAccountPracticePlan(scope, input, { send })).toEqual(manifest);
  expect(send.mock.calls[0]![0]).toBe('/api/learning/adaptive-plan?mode=practice');
  const init = send.mock.calls[0]![1]!;
  expect(init.cache).toBe('no-store'); expect(init.credentials).toBe('same-origin');
  expect(init.headers).toMatchObject({ 'x-learning-owner': scope.ownerGeneration.ownerKey });
  expect(JSON.parse(init.body as string)).toEqual({ ...input, resetEpoch: scope.resetEpoch });
  expect(await requestAccountPracticePlan(scope, input, { send: async () => Response.json({ schemaVersion: 1, executionEnabled: false }) })).toBeNull();
});

it('rejects malformed, altered, shadow and unavailable plans without returning a replacement', async () => {
  const manifest = await plan();
  for (const invalid of [{ ...manifest, shadowOnly: true }, { ...manifest, estimatedSeconds: 1 },
    { ...manifest, scope: { ...manifest.scope, resetEpoch: 1 } }]) {
    await expect(requestAccountPracticePlan(scope, input, { send: async () => Response.json({ schemaVersion: 1, executionEnabled: true, manifest: invalid }) })).rejects.toThrow();
  }
  await expect(requestAccountPracticePlan(scope, input, { send: async () => new Response(null, { status: 409 }) })).rejects.toThrow('unavailable');
});

it('does not return a late plan after the active owner changes', async () => {
  const manifest = await plan();
  await expect(requestAccountPracticePlan(scope, input, { send: async () => {
    await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:other', 0,
      createInitialSyncDocument(INITIAL_LEARNING_STATE, now, 'switch'), INITIAL_LEARNING_STATE);
    return Response.json({ schemaVersion: 1, executionEnabled: true, manifest });
  } })).rejects.toThrow('scope changed');
});

it('presents only a map bound to the returned plan and the requested inference preference',async()=>{
  const manifest=await plan(),{graph,units}=await extractPilotLearningUnits();
  const owner={ownerKey:scope.ownerGeneration.ownerKey,resetEpoch:scope.resetEpoch};
  const model=await reduceLearnerModel({graph,units,scope:owner,events:[],asOf:now,allowInference:false});
  const received:PilotCompetencyMap[]=[];
  const send=async()=>Response.json({schemaVersion:1,executionEnabled:true,manifest,graph,model});
  expect(await requestAccountPracticePlan(scope,input,{send,onCompetencyMap:map=>received.push(map)})).toEqual(manifest);
  expect(received).toHaveLength(1); expect(received[0]?.inferenceEnabled).toBe(false);
  const enabled=await reduceLearnerModel({graph,units,scope:owner,events:[],asOf:now,allowInference:true});
  await expect(requestAccountPracticePlan(scope,input,{send:async()=>Response.json({schemaVersion:1,executionEnabled:false,graph,model:enabled}),
    onCompetencyMap:map=>received.push(map)})).rejects.toThrow('preference');
  expect(received).toHaveLength(1);
});
