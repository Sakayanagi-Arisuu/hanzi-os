import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_LEARNING_PREFERENCES } from '../learning/learningPreferences';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { reduceLearnerModel } from '../personalization/learnerModel';
import { composeShadowSession } from '../personalization/sessionComposer';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, writeLessonResume, type ActiveOwnerLearningScope } from './indexedDb';
import { readWorkspace, saveWorkspaceChanges, syncWorkspace } from './workspaceSync';
import { readLocalActivityHistory } from './activityHistory';
import { advanceAdaptiveSession, readAdaptiveSession, recordAdaptivePractice, recordAdaptiveSupport,
  recordAdaptiveDraft, startAdaptiveSession, archiveAdaptiveSession, listAdaptiveSessions, type AdaptiveSession } from './adaptiveSession';
import { readAdaptiveDraftRecoveries, saveAdaptiveDraftRecovery } from './adaptiveDraftRecovery';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from './document';
import { isAdaptiveRecordKey } from './immutableActivityRecord';
import { sha256Hex } from './canonicalHash';

let scope: ActiveOwnerLearningScope;
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('anonymous:adaptive'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
const now = '2026-10-21T00:00:00Z';
async function plan(kind: 'quantity' | 'produce' | 'listen' = 'quantity') {
  const { graph, units } = await extractPilotLearningUnits();
  const owner = { ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch };
  const model = await reduceLearnerModel({ graph, units, events: [], scope: owner, asOf: now, allowInference: true });
  return composeShadowSession({ graph, units, model, scope: owner, now, intent: { kind, origin: 'manual' },
    preferences: { ...DEFAULT_LEARNING_PREFERENCES, allowInference: true }, context: { online: true, microphone: false, minutes: 5 },
    eligibility: { scope: owner, authority: owner.ownerKey.startsWith('anonymous:') ? 'guest-released-source' : 'server-validated',
      entries: units.map(unit => ({ unitId: unit.id, binding: unit.binding, sourcePermitted: true, entitlementAllowed: true, lessonPrerequisitesAllowed: true })) } });
}
function receipt(snapshot: AdaptiveSession) {
  const step = snapshot.manifest.steps[snapshot.cursor]!;
  if (step.kind !== 'unit') throw new Error('fixture requires unit');
  return { stepId: step.stepId, unitBinding: step.unitBinding, kind: step.receiptKind, response: null, ime: null, selfReview: null };
}
const start = async (kind: 'quantity' | 'produce' | 'listen' = 'quantity') => startAdaptiveSession(scope, await plan(kind), { id: 'stable-command', acceptsTaskChange: true });
const acknowledge = () => syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1,
  resetEpoch: scope.resetEpoch, entries: JSON.parse(init!.body as string).entries }));

it('freezes the plan, saves support and first receipt before next, resumes after crash without granting learning completion', async () => {
  const manifest = await plan();
  let saved = await startAdaptiveSession(scope, manifest, { id: 'stable-command', acceptsTaskChange: true });
  manifest.steps[0]!.reasonVi = 'mutated caller';
  await expect(advanceAdaptiveSession(scope, saved.snapshot)).rejects.toThrow('Save');
  saved = await recordAdaptiveSupport(scope, saved.snapshot, 'reveal');
  saved = await recordAdaptivePractice(scope, saved.snapshot, receipt(saved.snapshot));
  await resetSyncDatabaseForTests();
  const resumed = (await readAdaptiveSession(scope))!;
  expect(resumed.snapshot).toEqual(saved.snapshot);
  expect(resumed.snapshot.manifest.steps[0]!.reasonVi).not.toBe('mutated caller');
  const finished = await advanceAdaptiveSession(scope, resumed.snapshot);
  expect(finished.status).toBe('finished');
  expect(finished.snapshot.manifest.authorityGrants).toEqual([]);
  const history = await readLocalActivityHistory(scope);
  expect(history).toHaveLength(4);
  expect(history.every(event => !event.masteryEligible && event.score === null)).toBe(true);
});

it('deduplicates retry/concurrent next and retains the original response on conflicting branches', async () => {
  const first = await start('produce');
  const saved = await recordAdaptivePractice(scope, first.snapshot, receipt(first.snapshot));
  await Promise.all([advanceAdaptiveSession(scope, saved.snapshot), advanceAdaptiveSession(scope, saved.snapshot)]);
  expect((await readAdaptiveSession(scope))?.snapshot.cursor).toBe(1);
  const current = (await readAdaptiveSession(scope))!;
  const production = { ...receipt(current.snapshot), response: '三本书多少钱？', ime: true, selfReview: 'needs-practice' as const };
  const committed = await recordAdaptivePractice(scope, current.snapshot, production);
  const before = await readWorkspace(scope);
  await recordAdaptivePractice(scope, current.snapshot, production);
  expect(await readWorkspace(scope)).toEqual(before);
  await expect(recordAdaptivePractice(scope, current.snapshot, { ...production, response: 'corrected' })).rejects.toThrow('Conflicting');
  expect(await readWorkspace(scope)).toEqual(before);
  expect(committed.snapshot.receipts[1]).toEqual(production);
});

it('keeps account pending through offline/rejection and never acknowledges a conflicting newer server branch', async () => {
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'account:adaptive', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, now, 'switch'), INITIAL_LEARNING_STATE);
  scope = (await readActiveOwnerLearningScope())!;
  const opened = await start();
  const saved = await recordAdaptivePractice(scope, opened.snapshot, receipt(opened.snapshot));
  await expect(advanceAdaptiveSession(scope, saved.snapshot)).rejects.toThrow('confirmation');
  const before = await readWorkspace(scope);
  await expect(syncWorkspace(scope, new AbortController().signal, async () => { throw new Error('offline'); })).rejects.toThrow();
  await expect(syncWorkspace(scope, new AbortController().signal, async () => new Response(null, { status: 409 }))).rejects.toThrow();
  const source = before.entries.find(entry => isAdaptiveRecordKey(entry.key))!;
  await expect(syncWorkspace(scope, new AbortController().signal, async () => Response.json({ version: 1, resetEpoch: 0,
    entries: [{ ...source, changeId: 'conflicting', changedAt: source.changedAt + 100 }] }))).rejects.toThrow('Conflicting');
  expect(await readWorkspace(scope)).toEqual(before);
  await acknowledge();
  const next = await advanceAdaptiveSession(scope, saved.snapshot);
  expect(next.status).toBe('awaiting-confirmation');
  await acknowledge();
  expect((await readAdaptiveSession(scope))?.status).toBe('finished');
});

it('rolls back quota failures and fences owner/reset changes without destroying old records', async () => {
  const opened = await start();
  const before = await readWorkspace(scope);
  const put = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (this.name === 'lesson-resumes') throw new DOMException('quota', 'QuotaExceededError');
    return key === undefined ? put.call(this, value) : put.call(this, value, key);
  });
  await expect(recordAdaptiveSupport(scope, opened.snapshot, 'pinyin')).rejects.toThrow();
  failure.mockRestore(); expect(await readWorkspace(scope)).toEqual(before);
  await expect(readAdaptiveSession({ ...scope, resetEpoch: 1 })).rejects.toThrow();
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:other', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, now, 'switch'), INITIAL_LEARNING_STATE);
  await expect(recordAdaptiveSupport(scope, opened.snapshot, 'pinyin')).rejects.toThrow();
});

it('requires explicit fallback consent, rejects changed bindings and preserves an unfinished plan', async () => {
  const fallback = await plan('listen');
  await expect(startAdaptiveSession(scope, fallback, { id: 'listen', acceptsTaskChange: false })).rejects.toThrow('task change');
  const altered = await plan();
  const firstStep = altered.steps[0]!;
  if (firstStep.kind !== 'unit') throw new Error('Expected fixture unit');
  firstStep.unitBinding = 'old';
  await expect(startAdaptiveSession(scope, altered, { id: 'changed', acceptsTaskChange: false })).rejects.toThrow('Unsupported');
  const initial = await start();
  await expect(startAdaptiveSession(scope, await plan('produce'), { id: 'new', acceptsTaskChange: true })).rejects.toThrow('unfinished');
  expect((await readAdaptiveSession(scope))?.snapshot).toEqual(initial.snapshot);
});

it('can append after 150000 existing workspace entries without spreading clocks onto the call stack', async () => {
  const entries = Array.from({ length: 150_000 }, (_, index) => ({ key: `reader.saved:large-${index}`,
    value: null, changedAt: index, changeId: `large-${index}` }));
  await writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'workspace-sync:v1',
    value: { version: 1, entries, pending: [] } });
  await saveWorkspaceChanges(scope, [{ key: 'reader.saved:after-large-journal', value: { word: '书' } }]);
  const after = await readWorkspace(scope);
  expect(after.entries).toHaveLength(entries.length + 2);
  expect(after.pending).toHaveLength(2);
  expect(after.entries.find(entry => entry.key === entries[0]!.key)).toEqual(entries[0]);
  expect(after.entries.find(entry => entry.key === entries.at(-1)!.key)).toEqual(entries.at(-1));
});

it('feeds exact unit/dimension practice to the descriptive model while keeping independent mastery unknown', async () => {
  const opened = await start();
  const supported = await recordAdaptiveSupport(scope, opened.snapshot, 'reveal');
  await recordAdaptivePractice(scope, supported.snapshot, receipt(supported.snapshot));
  const { graph, units } = await extractPilotLearningUnits();
  const model = await reduceLearnerModel({ graph, units, events: await readLocalActivityHistory(scope),
    scope: { ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch },
    asOf: new Date().toISOString(), allowInference: true });
  expect(model.acceptedOccurrences).toBe(2);
  expect(model.cells.find(cell => cell.competencyId === 'c.number.quantity')).toMatchObject({
    exposures: 1, supports: 1, assistedOccurrences: 2, independentDistinctItems: null,
    sufficiency: 'unknown', introSkipEligible: false, prerequisiteEligible: false });
});

it('preserves an unknown raw journal schema rather than overwriting it with a new session', async () => {
  await start();
  const workspace = await readWorkspace(scope);
  const source = workspace.entries.find(entry => isAdaptiveRecordKey(entry.key))!;
  const raw = { ...source, value: { ...source.value as object, adaptiveSnapshot: { version: 99, raw: 'preserve' } } };
  await writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'workspace-sync:v1',
    value: { version: 1, entries: [raw], pending: [raw] } });
  const before = await readWorkspace(scope);
  await expect(readAdaptiveSession(scope)).rejects.toThrow('Unsupported');
  await expect(start()).rejects.toThrow('Unsupported');
  expect(await readWorkspace(scope)).toEqual(before);
});

it('rejects a caller-mutated frozen manifest before committing any replacement revision', async () => {
  const opened = await start();
  const altered = structuredClone(opened.snapshot);
  altered.manifest.steps[0]!.reasonVi = 'silently replaced reason';
  const { manifestId: _id, binding: _binding, ...body } = altered.manifest;
  altered.manifest.binding = await sha256Hex(body);
  altered.manifest.manifestId = `shadow:${altered.manifest.binding}`;
  const before = await readWorkspace(scope);
  await expect(recordAdaptiveSupport(scope, altered, 'reveal')).rejects.toThrow('another tab');
  expect(await readWorkspace(scope)).toEqual(before);
  expect((await readAdaptiveSession(scope))?.snapshot).toEqual(opened.snapshot);
});

it('retains and exposes two unfinished device branches instead of selecting whichever clock is newer', async () => {
  const opened = await start();
  const workspace = await readWorkspace(scope);
  const source = workspace.entries.find(entry => isAdaptiveRecordKey(entry.key))!;
  const second = { ...source.value as object, adaptiveSnapshot: { ...opened.snapshot, id: 'other-device-session' } };
  await saveWorkspaceChanges(scope, [{ key: 'activity.record:["overview","adaptive-state:other-device-session:0"]', value: second }]);
  const before = await readWorkspace(scope);
  await expect(readAdaptiveSession(scope)).rejects.toThrow('unfinished');
  await expect(start()).rejects.toThrow('unfinished');
  expect(await readWorkspace(scope)).toEqual(before);
});

it('persists typed drafts/IME for reload without changing first receipts or copying the answer into history details', async () => {
  const opened = await start('produce');
  const first = await recordAdaptivePractice(scope, opened.snapshot, receipt(opened.snapshot));
  const second = await advanceAdaptiveSession(scope, first.snapshot);
  const draft = await recordAdaptiveDraft(scope, second.snapshot, { response: '三本', ime: true });
  await resetSyncDatabaseForTests();
  expect((await readAdaptiveSession(scope))?.snapshot.drafts?.['step-2']).toEqual({ response: '三本', ime: true });
  const submitted = await recordAdaptivePractice(scope, draft.snapshot, { ...receipt(draft.snapshot),
    response: '三本书多少钱？', ime: true, selfReview: 'needs-practice' });
  await expect(recordAdaptiveDraft(scope, submitted.snapshot, { response: 'overwrite', ime: false })).rejects.toThrow('submitted');
  const history = await readLocalActivityHistory(scope);
  expect(JSON.stringify(history.map(event => event.business?.details))).not.toContain('三本');
  expect(submitted.snapshot.receipts[1]?.response).toBe('三本书多少钱？');
});

it('archives an unfinished draft, keeps every original row and opens a new session without granting completion', async () => {
  let saved = await start('produce');
  saved = await recordAdaptivePractice(scope, saved.snapshot, receipt(saved.snapshot));
  saved = await advanceAdaptiveSession(scope, saved.snapshot);
  saved = await recordAdaptiveDraft(scope, saved.snapshot, {response:'十五块，两本。',ime:true});
  const before = await readWorkspace(scope);
  const archived = await archiveAdaptiveSession(scope, saved.snapshot);
  expect(archived).toMatchObject({status:'archived',snapshot:{archived:true,drafts:saved.snapshot.drafts,receipts:saved.snapshot.receipts}});
  const after = await readWorkspace(scope);
  for (const row of before.entries) expect(after.entries.find(entry => entry.key === row.key)).toEqual(row);
  await archiveAdaptiveSession(scope, saved.snapshot);
  expect(await readWorkspace(scope)).toEqual(after);
  await expect(recordAdaptiveSupport(scope, archived.snapshot, 'reveal')).rejects.toThrow('read-only');
  await expect(recordAdaptiveDraft(scope, archived.snapshot, {response:'overwrite',ime:false})).rejects.toThrow('read-only');
  const fresh = await startAdaptiveSession(scope, await plan(), {id:'next-session',acceptsTaskChange:true});
  expect(fresh.snapshot.id).toBe('next-session');
  await resetSyncDatabaseForTests();
  expect((await listAdaptiveSessions(scope)).find(journal => journal.snapshot.id === saved.snapshot.id)).toEqual(archived);
  expect((await readLocalActivityHistory(scope)).every(event => !event.masteryEligible && event.score === null)).toBe(true);
});

it('archives an explicitly selected device branch and continues the other despite a newer archive clock', async () => {
  const opened = await start();
  const source = (await readWorkspace(scope)).entries.find(entry => isAdaptiveRecordKey(entry.key))!;
  await saveWorkspaceChanges(scope, [{key:'activity.record:["overview","adaptive-state:other-device:0"]',value:{...source.value as object,adaptiveSnapshot:{...opened.snapshot,id:'other-device'}}}]);
  const branches = await listAdaptiveSessions(scope);
  expect(branches).toHaveLength(2);
  await expect(readAdaptiveSession(scope)).rejects.toThrow('unfinished');
  await archiveAdaptiveSession(scope, branches.find(journal => journal.snapshot.id === 'other-device')!.snapshot);
  expect((await readAdaptiveSession(scope))!.snapshot.id).toBe(opened.snapshot.id);
  const continued = await recordAdaptiveSupport(scope, opened.snapshot, 'pinyin');
  expect(continued.snapshot.support['step-1']?.pinyin).toBe(true);
  expect((await listAdaptiveSessions(scope)).find(journal => journal.snapshot.id === 'other-device')?.status).toBe('archived');
  const before = await readWorkspace(scope);
  await expect(archiveAdaptiveSession(scope, opened.snapshot)).rejects.toThrow('another tab');
  expect(await readWorkspace(scope)).toEqual(before);
});

it('keeps an account archive pending and prevents a fresh session until exact acknowledgement', async () => {
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'account:archive', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, now, 'switch'), INITIAL_LEARNING_STATE);
  scope = (await readActiveOwnerLearningScope())!;
  const opened = await start();
  const archived = await archiveAdaptiveSession(scope, opened.snapshot);
  expect(archived).toMatchObject({status:'archived',pending:true});
  await expect(startAdaptiveSession(scope, await plan(), {id:'next',acceptsTaskChange:true})).rejects.toThrow('confirmation');
  await acknowledge();
  expect((await readAdaptiveSession(scope))?.pending).toBe(false);
  expect((await startAdaptiveSession(scope, await plan(), {id:'next',acceptsTaskChange:true})).snapshot.id).toBe('next');
});

it('keeps a detached conflict draft with exact context and IME, deduplicates retry and never replaces the newer answer', async () => {
  let saved = await start('produce');
  saved = await recordAdaptivePractice(scope, saved.snapshot, receipt(saved.snapshot));
  saved = await advanceAdaptiveSession(scope, saved.snapshot);
  const original = saved.snapshot;
  const newer = await recordAdaptiveDraft(scope, original, {response:'他写的答案',ime:false});
  const before = await readWorkspace(scope);
  await saveAdaptiveDraftRecovery(scope, original, {response:'我还没发出的答案',ime:true});
  const after = await readWorkspace(scope);
  await saveAdaptiveDraftRecovery(scope, original, {response:'我还没发出的答案',ime:true});
  expect(await readWorkspace(scope)).toEqual(after);
  for (const row of before.entries) expect(after.entries.find(entry => entry.key === row.key)).toEqual(row);
  await resetSyncDatabaseForTests();
  expect(await readAdaptiveDraftRecoveries(scope)).toEqual([{version:1,snapshot:original,draft:{response:'我还没发出的答案',ime:true}}]);
  expect((await readAdaptiveSession(scope))?.snapshot).toEqual(newer.snapshot);
  const history = await readLocalActivityHistory(scope);
  expect(JSON.stringify(history.map(event => event.business?.details))).not.toContain('我还没发出的答案');
  expect(history.filter(event => event.business?.details?.action === 'draft-recovery')).toHaveLength(1);
  expect(history.every(event => !event.masteryEligible && event.score === null)).toBe(true);
});

it('rejects owner/reset mismatches and unreadable recovery schemas without replacing existing records', async () => {
  let saved = await start('produce');
  saved = await recordAdaptivePractice(scope, saved.snapshot, receipt(saved.snapshot));
  saved = await advanceAdaptiveSession(scope, saved.snapshot);
  const before = await readWorkspace(scope);
  await expect(saveAdaptiveDraftRecovery({...scope,resetEpoch:scope.resetEpoch + 1}, saved.snapshot, {response:'wrong epoch',ime:false})).rejects.toThrow();
  await expect(archiveAdaptiveSession({...scope,ownerGeneration:{...scope.ownerGeneration,ownerKey:'anonymous:other'}}, saved.snapshot)).rejects.toThrow();
  expect(await readWorkspace(scope)).toEqual(before);
  await saveAdaptiveDraftRecovery(scope, saved.snapshot, {response:'raw retained',ime:false});
  const workspace = await readWorkspace(scope);
  const raw = {...workspace,entries:workspace.entries.map(entry => entry.key.startsWith('activity.record:["overview","adaptive-recovery:')
    ? {...entry,value:{...entry.value as object,adaptiveDraftRecovery:{version:99,raw:'do not drop'}}} : entry)};
  await writeLessonResume({expectedOwnerGeneration:scope.ownerGeneration,resetEpoch:scope.resetEpoch,entryKey:'workspace-sync:v1',value:raw});
  await expect(readAdaptiveDraftRecoveries(scope)).rejects.toThrow('Unreadable');
  expect(await readWorkspace(scope)).toEqual(raw);
});
