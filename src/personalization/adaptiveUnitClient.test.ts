import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { reduceLearnerModel } from './learnerModel';
import { composeShadowSession } from './sessionComposer';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { startAdaptiveSession } from '../sync/adaptiveSession';
import { readWorkspace } from '../sync/workspaceSync';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from '../sync/document';
import { CURRENT_CONTENT_MANIFEST_SHA256 } from '../content/currentPackage';
import { AdaptiveSourceUnavailableError, fetchAdaptiveUnit, validateMaterializedAdaptiveUnit } from './adaptiveUnitClient';
import { sealPracticeManifest } from './practiceManifest';

let scope: ActiveOwnerLearningScope;
const now = '2026-10-21T00:00:00Z';
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); };
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration(`siwc_${'a'.repeat(64)}`); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

async function setup() {
  const { graph, units } = await extractPilotLearningUnits();
  const owner = { ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch };
  const model = await reduceLearnerModel({ graph, units, events: [], scope: owner, asOf: now, allowInference: false });
  const shadow = await composeShadowSession({ graph, units, model, scope: owner, now, preferences: null,
    context: { online: true, microphone: false, minutes: 5 }, intent: { kind: 'produce', origin: 'manual' },
    eligibility: { scope: owner, authority: 'server-validated', entries: units.map(unit => ({ unitId: unit.id, binding: unit.binding,
      sourcePermitted: true, entitlementAllowed: true, lessonPrerequisitesAllowed: true })) } });
  const manifest = await sealPracticeManifest(shadow);
  const journal = await startAdaptiveSession(scope, manifest, { id: 'client-fixture', acceptsTaskChange: true });
  const step = manifest.steps[0]!;
  if (step.kind !== 'unit') throw new Error('Fixture requires unit');
  const unit = units.find(unit => unit.id === step.unitId)!;
  const response = { schemaVersion: 1, scope: owner, graph, unit, sourceAccess: 'server-revalidated', measurementEligible: false,
    authorityGrants: [], completionLessonIds: [], enrollmentBinding: { enrollmentId: 'synthetic-enrollment',
      contentVersion: unit.source.contentVersion, manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256, resetEpoch: scope.resetEpoch, cursor: 2 } };
  return { response, journal, units };
}

it('validates the frozen unit before exposing it and sends exact owner/version/reset without accepting a cached grant', async () => {
  const { response, journal } = await setup();
  const before = await readWorkspace(scope);
  const send = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.cache).toBe('no-store'); expect(init?.credentials).toBe('same-origin');
    expect(new Headers(init?.headers).get('x-learning-owner')).toBe(scope.ownerGeneration.ownerKey);
    return Response.json(response);
  });
  expect(await fetchAdaptiveUnit(scope, journal.snapshot, { send })).toEqual(response);
  expect(String(send.mock.calls[0]?.[0])).toContain(`unitBinding=${response.unit.binding}`);
  expect(await readWorkspace(scope)).toEqual(before);
});

it('rejects changed payload, owner, graph, extra grants and fabricated private keys without rewriting the saved manifest', async () => {
  const { response, journal } = await setup();
  const before = await readWorkspace(scope);
  const payload = structuredClone(response); payload.unit.payload.dialogue[0]!.hanzi = 'changed';
  for (const invalid of [payload, { ...response, scope: { ...response.scope, resetEpoch: 2 } },
    { ...response, authorityGrants: ['mastery'] }, { ...response, privateKey: 'must-not-enter-cache' },
    { ...response, graph: { ...response.graph, binding: 'f'.repeat(64) } }]) {
    await expect(validateMaterializedAdaptiveUnit(invalid, journal.snapshot)).rejects.toBeInstanceOf(AdaptiveSourceUnavailableError);
  }
  expect(await readWorkspace(scope)).toEqual(before);
});

it('keeps the old session on revoked content, network failure and a scope switch while the response is in flight', async () => {
  const { response, journal } = await setup();
  const before = await readWorkspace(scope);
  await expect(fetchAdaptiveUnit(scope, journal.snapshot, { send: async () => new Response(null, { status: 409 }) })).rejects.toBeInstanceOf(AdaptiveSourceUnavailableError);
  await expect(fetchAdaptiveUnit(scope, journal.snapshot, { send: async () => { throw new Error('offline'); } })).rejects.toThrow('offline');
  expect(await readWorkspace(scope)).toEqual(before);
  await expect(fetchAdaptiveUnit(scope, journal.snapshot, { send: async () => {
    await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:other', 0,
      createInitialSyncDocument(INITIAL_LEARNING_STATE, now, 'switch'), INITIAL_LEARNING_STATE);
    return Response.json(response);
  } })).rejects.toBeInstanceOf(AdaptiveSourceUnavailableError);
});
