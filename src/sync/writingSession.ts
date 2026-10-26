import { parseCharacterForgeSession, type CharacterForgeSession } from '../characters/characterForgeSession';
import { createActivityHistoryEvent, type ActivityHistoryInput } from '../learning/activityHistory';
import { activityObservationValue } from './activityObservations';
import { canonicalStringify, sha256Hex } from './canonicalHash';
import type { ActiveOwnerLearningScope } from './indexedDb';
import type { WorkspaceEntry } from './workspaceProtocol';
import { readWorkspace, saveWorkspaceChanges } from './workspaceSync';
import { isWritingRecordKey, writingRecordsEquivalent } from './writingRecord';

export type WritingSession = {
  version: 1; id: string; revision: number; contentVersion: string; sourceVersion: string;
  session: CharacterForgeSession; legacy: boolean; pending: boolean;
  responses: Record<string, { firstAnswer: string; firstCorrect: boolean; latestAnswer: string; latestCorrect: boolean; attempts: number }>;
  itemSources?: Record<string, { id: string; lessonId: string }>;
};
const domain = 'writing-session';
export function writingChangeNeedsCommit(previous: CharacterForgeSession, next: CharacterForgeSession,
  category: ActivityHistoryInput['category'], details: ActivityHistoryInput['details']) {
  return next !== previous || category === 'support' && typeof details?.kind === 'string' && details.kind.length > 0;
}
const recordKey = (id: string, revision: number) => `activity.record:${JSON.stringify(['writing', `writing-state:${id}:${revision}`])}`;

export async function writingSourceVersion(contentVersion: string, entries: readonly unknown[]) {
  return `writing-source-v1:${await sha256Hex([contentVersion, entries])}`;
}

function fromEntries(entries: readonly WorkspaceEntry[], pending: readonly WorkspaceEntry[], account: boolean): WritingSession | null {
  const rows = entries.filter(entry => entry.key.startsWith('activity.record:')).flatMap(entry => {
    const value = entry.value as { module?: unknown; details?: { domain?: unknown }; writingSnapshot?: unknown } | null;
    if (value?.module !== 'writing' || value.details?.domain !== domain) return [];
    if (!value.writingSnapshot || typeof value.writingSnapshot !== 'object') throw new Error('Unreadable writing snapshot; retain journal.');
    const snapshot = value.writingSnapshot as WritingSession;
    const parsed = parseCharacterForgeSession(JSON.stringify(snapshot.session));
    if (snapshot.version !== 1 || typeof snapshot.id !== 'string' || !snapshot.id
      || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0
      || typeof snapshot.contentVersion !== 'string' || typeof snapshot.sourceVersion !== 'string'
      || typeof snapshot.legacy !== 'boolean' || !snapshot.responses || typeof snapshot.responses !== 'object' || Array.isArray(snapshot.responses)
      || Object.values(snapshot.responses).some(response => !response || typeof response.firstAnswer !== 'string'
        || typeof response.firstCorrect !== 'boolean' || typeof response.latestAnswer !== 'string'
        || typeof response.latestCorrect !== 'boolean' || !Number.isSafeInteger(response.attempts) || response.attempts < 1)
      || !parsed || canonicalStringify(parsed) !== canonicalStringify(snapshot.session)
      || !Number.isInteger(parsed.currentIndex) || new Set(parsed.hanzis).size !== parsed.hanzis.length
      || [parsed.completedHanzis, parsed.needsReplay, parsed.paperHanzis].some(items => items.some(item => !parsed.hanzis.includes(item)))
      || Array.isArray(parsed.assistanceByHanzi) || Object.entries(parsed.assistanceByHanzi).some(([hanzi, level]) => !parsed.hanzis.includes(hanzi)
        || !Number.isInteger(level) || level < 0 || level > 5)
      || snapshot.itemSources !== undefined && (!snapshot.itemSources || typeof snapshot.itemSources !== 'object' || Array.isArray(snapshot.itemSources)
        || Object.entries(snapshot.itemSources).some(([hanzi, source]) => !parsed.hanzis.includes(hanzi) || !source
          || typeof source.id !== 'string' || !source.id || typeof source.lessonId !== 'string' || !source.lessonId))
      || entry.key !== recordKey(snapshot.id, snapshot.revision)) throw new Error('Unsupported writing snapshot; retain journal.');
    return [{ entry, snapshot }];
  });
  const latest = rows.sort((left, right) => right.entry.changedAt - left.entry.changedAt
    || right.entry.changeId.localeCompare(left.entry.changeId))[0];
  if (!latest) return null;
  const sessionRows = rows.filter(row => row.snapshot.id === latest.snapshot.id);
  const revisions = sessionRows.map(row => row.snapshot.revision).sort((left, right) => left - right);
  if (revisions.some((revision, index) => revision !== index)) throw new Error('Incomplete writing lineage; retain journal.');
  return { ...latest.snapshot, pending: account && pending.some(entry => isWritingRecordKey(entry.key)
    && (entry.value as { writingSnapshot?: { id?: unknown } } | null)?.writingSnapshot?.id === latest.snapshot.id) };
}

export async function readWritingSession(scope: ActiveOwnerLearningScope) {
  const journal = await readWorkspace(scope);
  return fromEntries(journal.entries, journal.pending, !scope.ownerGeneration.ownerKey.startsWith('anonymous:'));
}

async function commit(scope: ActiveOwnerLearningScope, snapshot: WritingSession, expected: WritingSession | null,
  category: ActivityHistoryInput['category'], details: ActivityHistoryInput['details']) {
  const persisted = { ...snapshot, pending: false };
  const operationId = `writing-state:${snapshot.id}:${snapshot.revision}`;
  const hanzi = snapshot.session.hanzis[snapshot.session.currentIndex]!;
  const itemSource = snapshot.itemSources?.[hanzi];
  const lessonId = snapshot.session.lessonId ?? itemSource?.lessonId;
  const event = createActivityHistoryEvent({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch,
    operationId, sourceRecordRef: operationId, module: 'writing', category,
    sourceId: `character-forge:${snapshot.session.lessonId ?? 'free'}`, itemId: itemSource?.id ?? hanzi,
    sourceLessonIds: lessonId ? [lessonId] : [], contentVersion: snapshot.contentVersion,
    activityVersion: snapshot.sourceVersion, occurredAt: new Date().toISOString(),
    modality: ['structure', 'prediction', 'context'].includes(String(details?.phase)) || details?.practiceMode === 'choice' ? 'text' : 'handwriting', skill: 'writing',
    outcome: category === 'objective' && typeof details?.correct === 'boolean' ? details.correct ? 'correct' : 'incorrect' : undefined,
    hint: details?.kind === 'stroke-rescue' || typeof details?.assistanceLevel === 'number' && details.assistanceLevel > 0 ? true : null,
    reveal: details?.kind === 'reveal' || details?.kind === 'order-replay' ? true : null,
    details: { ...details, domain, sessionId: snapshot.id, revision: snapshot.revision, hanzi,
      itemIdentity: itemSource ? 'released-character-id' : 'hanzi-only', legacySourceVersion: snapshot.legacy ? 'unknown' : null,
      measurementEligible: false } });
  const value = { ...activityObservationValue(event), writingSnapshot: persisted };
  await saveWorkspaceChanges(scope, [{ key: recordKey(snapshot.id, snapshot.revision), value }], (existing) => {
    if (!existing) return true;
    if (!writingRecordsEquivalent(existing.value, value)) {
      throw new Error('Conflicting writing mutation; retain first activity.');
    }
    return false;
  }, entries => {
    const retry = entries.find(entry => entry.key === recordKey(snapshot.id, snapshot.revision));
    if (retry) return;
    const current = fromEntries(entries, [], false);
    if (current?.id !== expected?.id || current?.revision !== expected?.revision) {
      throw new Error('Writing session changed in another tab; reopen saved session.');
    }
  });
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('hanzi-writing-journal-v1');
      channel.postMessage({ ownerKey: scope.ownerGeneration.ownerKey }); channel.close();
    } catch { window.dispatchEvent(new Event('hanzi-workspace-changed')); }
  }
  return (await readWritingSession(scope))!;
}

export async function startWritingSession(scope: ActiveOwnerLearningScope, session: CharacterForgeSession,
  contentVersion: string, sourceVersion: string, legacy = false, sessionId: string = crypto.randomUUID(), itemSources?: WritingSession['itemSources']) {
  if (!parseCharacterForgeSession(JSON.stringify(session))) throw new Error('Invalid writing source.');
  const previous = await readWritingSession(scope);
  const snapshot: WritingSession = { version: 1, id: sessionId, revision: 0, session, contentVersion, sourceVersion, legacy,
    pending: false, responses: {}, ...(itemSources ? { itemSources } : {}) };
  return commit(scope, snapshot, previous, 'session', { action: legacy ? 'adopt-legacy' : 'open', previousTimeKnown: !legacy });
}

export async function updateWritingSession(scope: ActiveOwnerLearningScope, expected: WritingSession,
  session: CharacterForgeSession, category: ActivityHistoryInput['category'], details: ActivityHistoryInput['details']) {
  if (session.hanzis.join('') !== expected.session.hanzis.join('') || session.source !== expected.session.source
    || session.lessonId !== expected.session.lessonId || !parseCharacterForgeSession(JSON.stringify(session))) throw new Error('Writing source changed.');
  if (category === 'support' && details?.phase === 'assistance' && typeof details.hanzi === 'string' && typeof details.assistanceLevel === 'number') {
    const current = await readWritingSession(scope);
    if (current?.id === expected.id && current.sourceVersion === expected.sourceVersion
      && current.session.assistanceByHanzi[details.hanzi] === details.assistanceLevel) return current;
  }
  return commit(scope, { ...expected, session, revision: expected.revision + 1 }, expected, category, details);
}

export async function recordWritingResponse(scope: ActiveOwnerLearningScope, expected: WritingSession, answer: string, correct: boolean) {
  const phase = expected.session.phase;
  if (!['prediction', 'context'].includes(phase) || !answer || answer.length > 100) throw new Error('Unsupported writing response');
  const key = `${expected.session.currentIndex}:${phase}`;
  const previous = expected.responses[key];
  const response = { firstAnswer: previous?.firstAnswer ?? answer, firstCorrect: previous?.firstCorrect ?? correct,
    latestAnswer: answer, latestCorrect: correct, attempts: (previous?.attempts ?? 0) + 1 };
  const hanzi = expected.session.hanzis[expected.session.currentIndex]!;
  const session = { ...expected.session, needsReplay: correct ? expected.session.needsReplay : [...new Set([...expected.session.needsReplay, hanzi])] };
  return commit(scope, { ...expected, revision: expected.revision + 1, session, responses: { ...expected.responses, [key]: response } },
    expected, previous ? 'support' : 'objective', { phase, answer, correct, firstResponse: !previous,
      priorExposure: true, scoring: 'local-choice-comparison', correction: Boolean(previous) });
}
