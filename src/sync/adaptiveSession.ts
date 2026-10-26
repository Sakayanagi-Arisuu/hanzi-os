import type { ShadowStep } from '../personalization/sessionComposer';
import { verifySessionManifestBinding, type SessionManifest } from '../personalization/practiceManifest';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { activityObservationValue } from './activityObservations';
import { canonicalStringify } from './canonicalHash';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { isAdaptiveRecordKey } from './immutableActivityRecord';
import type { WorkspaceEntry } from './workspaceProtocol';
import { readWorkspace, saveWorkspaceChanges } from './workspaceSync';

export type AdaptivePracticeReceipt = {
  stepId: string; unitBinding: string; kind: 'exposure' | 'self-review';
  response: string | null; ime: boolean | null; selfReview: 'needs-practice' | 'compared' | null;
};
type Support = { pinyin: boolean; translation: boolean; reveal: boolean; syntheticTts: boolean };
export type AdaptiveSession = {
  version: 1; id: string; revision: number; manifest: SessionManifest;
  cursor: number; receipts: AdaptivePracticeReceipt[]; support: Record<string, Support>;
  drafts?: Record<string, { response: string; ime: boolean }>;
  archived?: true;
};
export type AdaptiveJournal = { snapshot: AdaptiveSession; pending: boolean; status: 'active' | 'awaiting-confirmation' | 'finished' | 'archived' };
const key = (id: string, revision: number) => `activity.record:${JSON.stringify(['overview', `adaptive-state:${id}:${revision}`])}`;
const fail = () => { throw new Error('Unsupported adaptive journal; retain original records.'); };
const unitStep = (step: ShadowStep | undefined) => {
  if (!step || step.kind !== 'unit') throw new Error('Existing review receipt adapter required; do not grade or reschedule here.');
  return step;
};
const validReceipt = (receipt: AdaptivePracticeReceipt, step: ShadowStep | undefined) => step?.kind === 'unit'
  && receipt.stepId === step.stepId && receipt.unitBinding === step.unitBinding && receipt.kind === step.receiptKind
  && (receipt.response === null || typeof receipt.response === 'string' && receipt.response.length <= 4000)
  && (receipt.ime === null || typeof receipt.ime === 'boolean')
  && (step.modality === 'text' || receipt.response === null && receipt.ime === null)
  && (receipt.kind === 'exposure' ? receipt.response === null && receipt.ime === null && receipt.selfReview === null
    : ['needs-practice', 'compared'].includes(String(receipt.selfReview)));

/** Binding integrity is not source eligibility. This journal never grants access or scoring authority. */
async function validateManifest(manifest: SessionManifest, scope: ActiveOwnerLearningScope) {
  if (manifest.scope.ownerKey !== scope.ownerGeneration.ownerKey || manifest.scope.resetEpoch !== scope.resetEpoch) fail();
  await verifySessionManifestBinding(manifest);
}

async function validate(snapshot: AdaptiveSession, scope: ActiveOwnerLearningScope) {
  if (!snapshot || snapshot.version !== 1 || typeof snapshot.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(snapshot.id)
    || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || !snapshot.manifest
    || !Array.isArray(snapshot.receipts) || !snapshot.support || Array.isArray(snapshot.support)) fail();
  await validateManifest(snapshot.manifest, scope);
  if (snapshot.archived !== undefined && snapshot.archived !== true) fail();
  if (!Number.isSafeInteger(snapshot.cursor) || snapshot.cursor < 0 || snapshot.cursor > snapshot.manifest.steps.length
    || snapshot.receipts.length < snapshot.cursor || snapshot.receipts.length > Math.min(snapshot.cursor + 1, snapshot.manifest.steps.length)
    || snapshot.receipts.some((receipt, index) => !validReceipt(receipt, snapshot.manifest.steps[index]))
    || Object.entries(snapshot.support).some(([stepId, support]) => !snapshot.manifest.steps.some(step => step.stepId === stepId)
      || !support || Object.keys(support).sort().join(',') !== 'pinyin,reveal,syntheticTts,translation'
      || Object.values(support).some(value => typeof value !== 'boolean'))
    || snapshot.drafts !== undefined && (!snapshot.drafts || Array.isArray(snapshot.drafts)
      || Object.entries(snapshot.drafts).some(([stepId, draft]) => !snapshot.manifest.steps.some(step => step.stepId === stepId
        && step.kind === 'unit' && step.modality === 'text' && step.receiptKind === 'self-review')
        || !draft || Object.keys(draft).sort().join(',') !== 'ime,response' || typeof draft.response !== 'string'
        || draft.response.length > 4000 || typeof draft.ime !== 'boolean'))) fail();
}
export { validate as validateAdaptiveSessionSnapshot };

async function journalsFromEntries(scope: ActiveOwnerLearningScope, entries: readonly WorkspaceEntry[], pending: readonly WorkspaceEntry[]): Promise<AdaptiveJournal[]> {
  const rows = entries.filter(entry => isAdaptiveRecordKey(entry.key)).map(entry => ({ entry,
    snapshot: (entry.value as { adaptiveSnapshot?: AdaptiveSession } | null)?.adaptiveSnapshot }));
  for (const row of rows) {
    if (!row.snapshot) fail();
    await validate(row.snapshot!, scope);
    if (row.entry.key !== key(row.snapshot!.id, row.snapshot!.revision)) fail();
  }
  rows.sort((a, b) => b.entry.changedAt - a.entry.changedAt || b.entry.changeId.localeCompare(a.entry.changeId));
  const perSession = new Map<string, AdaptiveSession>();
  for (const row of rows) {
    const saved = perSession.get(row.snapshot!.id);
    if (!saved || saved.revision < row.snapshot!.revision) perSession.set(row.snapshot!.id, row.snapshot!);
  }
  return [...perSession.values()].map(snapshot => {
    const lineage = rows.filter(row => row.snapshot!.id === snapshot.id).sort((a, b) => a.snapshot!.revision - b.snapshot!.revision);
    if (lineage.some((row, index) => row.snapshot!.revision !== index || row.snapshot!.manifest.binding !== snapshot.manifest.binding
      || index < lineage.length - 1 && row.snapshot!.archived)) fail();
    const unconfirmed = !scope.ownerGeneration.ownerKey.startsWith('anonymous:') && pending.some(entry => isAdaptiveRecordKey(entry.key)
      && (entry.value as { adaptiveSnapshot?: AdaptiveSession } | null)?.adaptiveSnapshot?.id === snapshot.id);
    return { snapshot, pending: unconfirmed, status: snapshot.archived ? 'archived' : snapshot.cursor < snapshot.manifest.steps.length ? 'active'
      : unconfirmed ? 'awaiting-confirmation' : 'finished' };
  });
}

function selectJournal(journals: AdaptiveJournal[]): AdaptiveJournal | null {
  const active = journals.filter(journal => journal.status === 'active');
  if (active.length > 1) throw new Error('Conflicting unfinished adaptive sessions; retain both journals for resolution.');
  return active[0] ?? journals[0] ?? null;
}

/** Every branch remains readable even when selecting a runner would be ambiguous. */
export async function listAdaptiveSessions(scope: ActiveOwnerLearningScope) {
  const workspace = await readWorkspace(scope);
  return journalsFromEntries(scope, workspace.entries, workspace.pending);
}

export async function readAdaptiveSession(scope: ActiveOwnerLearningScope) {
  return selectJournal(await listAdaptiveSessions(scope));
}

async function commit(scope: ActiveOwnerLearningScope, snapshot: AdaptiveSession, expected: AdaptiveSession | null,
  action: string, category: 'session' | 'support' | 'exposure' | 'self-review', archiveBranch = false) {
  await validate(snapshot, scope);
  const step = snapshot.manifest.steps[Math.min(expected?.cursor ?? 0, snapshot.manifest.steps.length - 1)]!;
  const operationId = `adaptive-state:${snapshot.id}:${snapshot.revision}`;
  const event = createActivityHistoryEvent({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch,
    operationId, sourceRecordRef: operationId, module: 'overview', category, sourceId: snapshot.manifest.manifestId,
    itemId: category !== 'session' && step.kind === 'unit' ? step.unitId : step.stepId,
    contentVersion: step.kind === 'unit' ? step.contentVersion : step.offer.wordVersion,
    activityVersion: category !== 'session' && step.kind === 'unit' ? step.unitBinding : snapshot.manifest.binding,
    skill: step.kind === 'unit' ? step.skill : undefined,
    sourceLessonIds: step.kind === 'unit' ? [step.sourceLessonId] : [],
    occurredAt: new Date().toISOString(), modality: step.kind === 'unit' ? step.modality : 'text',
    hint: category === 'support' && ['pinyin', 'translation'].includes(action) ? true : null,
    reveal: category === 'support' && action === 'reveal' ? true : null,
    details: { domain: 'adaptive-session', action, sessionId: snapshot.id, revision: snapshot.revision,
      cursor: snapshot.cursor, manifestBinding: snapshot.manifest.binding, priorExposure: true,
      ime: category === 'self-review' ? snapshot.receipts[expected!.cursor]?.ime ?? null : null,
      unitId: step.kind === 'unit' ? step.unitId : null,
      unitBinding: step.kind === 'unit' ? step.unitBinding : null, kind: category === 'support' ? action : null,
      syntheticTts: category === 'support' && action === 'syntheticTts', measurementEligible: false, shadowOnly: snapshot.manifest.shadowOnly } });
  const value = { ...activityObservationValue(event), adaptiveSnapshot: structuredClone(snapshot) };
  // The full frozen manifest/response is primary data; compact history is derived in the same IDB transaction.
  await saveWorkspaceChanges(scope, [{ key: key(snapshot.id, snapshot.revision), value }], existing => {
    if (!existing) return true;
    if (canonicalStringify({ ...existing.value as object, occurredAt: null }) !== canonicalStringify({ ...value, occurredAt: null })) {
      throw new Error('Conflicting adaptive command; retain first revision.');
    }
    return false;
  }, entries => {
    // Async hashes were checked above. CAS itself stays inside the read/write transaction.
    if (entries.some(entry => entry.key === key(snapshot.id, snapshot.revision))) return;
    const candidates = entries.filter(entry => isAdaptiveRecordKey(entry.key))
      .sort((a, b) => b.changedAt - a.changedAt || b.changeId.localeCompare(a.changeId));
    const sessions = new Map<string, AdaptiveSession>();
    for (const entry of candidates) {
      const candidate = (entry.value as { adaptiveSnapshot?: AdaptiveSession } | null)?.adaptiveSnapshot;
      if (!candidate) fail();
      const previous = sessions.get(candidate!.id);
      if (!previous || previous.revision < candidate!.revision) sessions.set(candidate!.id, candidate!);
    }
    const active = [...sessions.values()].filter(candidate => !candidate.archived && candidate.cursor < candidate.manifest.steps.length);
    if (!archiveBranch && active.length > 1) throw new Error('Conflicting unfinished adaptive sessions; retain both journals for resolution.');
    const saved = archiveBranch ? sessions.get(expected!.id) : active[0] ?? sessions.values().next().value;
    if (saved?.id !== expected?.id || saved?.revision !== expected?.revision
      || canonicalStringify(saved ?? null) !== canonicalStringify(expected)) throw new Error('Adaptive session changed in another tab; reload saved session.');
  });
  return archiveBranch ? (await listAdaptiveSessions(scope)).find(journal => journal.snapshot.id === snapshot.id)!
    : (await readAdaptiveSession(scope))!;
}

/** Durable frozen pilot. Content/rendering still requires the existing source policy adapter. */
export async function startAdaptiveSession(scope: ActiveOwnerLearningScope, manifest: SessionManifest,
  options: { id: string; acceptsTaskChange: boolean }) {
  if (manifest.requiresTaskChange && !options.acceptsTaskChange) throw new Error('Explicit task change required.');
  const journals = await listAdaptiveSessions(scope);
  const previous = selectJournal(journals);
  const reused = journals.find(journal => journal.snapshot.id === options.id);
  if (reused) {
    if (previous?.snapshot.id !== options.id || canonicalStringify(reused.snapshot.manifest) !== canonicalStringify(manifest)) throw new Error('Adaptive session ID is already used; retain the original session.');
    return reused;
  }
  if (journals.some(journal => journal.pending)) throw new Error('Await account confirmation before opening another session.');
  if (previous && previous.snapshot.id !== options.id && !['finished', 'archived'].includes(previous.status)) throw new Error('Retain unfinished adaptive session before starting another.');
  return commit(scope, { version: 1, id: options.id, revision: 0, manifest: structuredClone(manifest), cursor: 0, receipts: [], support: {}, drafts: {} }, previous?.snapshot ?? null, 'open', 'session');
}

export async function recordAdaptivePractice(scope: ActiveOwnerLearningScope, expected: AdaptiveSession, receipt: AdaptivePracticeReceipt) {
  await validate(expected, scope);
  if (expected.archived) throw new Error('Archived session is read-only.');
  const step = unitStep(expected.manifest.steps[expected.cursor]);
  if (!validReceipt(receipt, step)) throw new Error('Practice receipt does not match frozen step.');
  if (expected.receipts.length !== expected.cursor) throw new Error('First practice receipt is already saved.');
  return commit(scope, { ...expected, revision: expected.revision + 1, receipts: [...expected.receipts, structuredClone(receipt)] }, expected, 'practice', receipt.kind);
}

export async function recordAdaptiveSupport(scope: ActiveOwnerLearningScope, expected: AdaptiveSession, kind: keyof Support) {
  await validate(expected, scope);
  if (expected.archived) throw new Error('Archived session is read-only.');
  const step = unitStep(expected.manifest.steps[expected.cursor]);
  if (!['pinyin', 'translation', 'reveal', 'syntheticTts'].includes(kind)) throw new Error('Unknown support.');
  const previous = expected.support[step.stepId] ?? { pinyin: false, translation: false, reveal: false, syntheticTts: false };
  const support = { ...previous, [kind]: true };
  return commit(scope, { ...expected, revision: expected.revision + 1, support: { ...expected.support, [step.stepId]: support } }, expected, kind, 'support');
}

export async function recordAdaptiveDraft(scope: ActiveOwnerLearningScope, expected: AdaptiveSession, draft: { response: string; ime: boolean }) {
  await validate(expected, scope);
  if (expected.archived) throw new Error('Archived session is read-only.');
  const step = unitStep(expected.manifest.steps[expected.cursor]);
  if (step.modality !== 'text' || step.receiptKind !== 'self-review' || expected.receipts.length !== expected.cursor
    || !draft || Object.keys(draft).sort().join(',') !== 'ime,response' || typeof draft.response !== 'string'
    || draft.response.length > 4000 || typeof draft.ime !== 'boolean') throw new Error('Unsupported or already submitted draft.');
  return commit(scope, { ...expected, revision: expected.revision + 1,
    drafts: { ...expected.drafts, [step.stepId]: { ...draft } } }, expected, 'draft', 'session');
}

export async function advanceAdaptiveSession(scope: ActiveOwnerLearningScope, expected: AdaptiveSession) {
  await validate(expected, scope);
  if (expected.archived) throw new Error('Archived session is read-only.');
  if (expected.cursor >= expected.manifest.steps.length || expected.receipts.length !== expected.cursor + 1) throw new Error('Save the current practice receipt before next.');
  const current = await readAdaptiveSession(scope);
  if (current?.pending) throw new Error('Await account confirmation before next.');
  return commit(scope, { ...expected, revision: expected.revision + 1, cursor: expected.cursor + 1 }, expected, 'next', 'session');
}

/** Explicit terminal revision retains every prior answer, draft and frozen manifest. */
export async function archiveAdaptiveSession(scope: ActiveOwnerLearningScope, expected: AdaptiveSession) {
  await validate(expected, scope);
  const journals = await listAdaptiveSessions(scope);
  const saved = journals.find(journal => journal.snapshot.id === expected.id);
  if (saved?.snapshot.archived && saved.snapshot.revision === expected.revision + 1
    && canonicalStringify({ ...saved.snapshot, archived: undefined, revision: expected.revision }) === canonicalStringify(expected)) return saved;
  if (!saved || canonicalStringify(saved.snapshot) !== canonicalStringify(expected)) throw new Error('Adaptive session changed in another tab; reload before archiving.');
  if (expected.archived) return saved;
  return commit(scope, { ...expected, revision: expected.revision + 1, archived: true }, expected, 'archive', 'session', true);
}
