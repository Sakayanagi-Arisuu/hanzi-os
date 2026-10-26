import type { ActiveOwnerLearningScope } from './indexedDb';
import { readWorkspace } from './workspaceSync';
import { saveDescriptiveActivity } from './activityObservations';
import { sha256Hex } from './canonicalHash';

export type ExpansionSource = { missionId: string; contentVersion: string; itemIds: string[] };
export type ExpansionSession = { id: string; index: number; revealed: boolean; pending: boolean };

export async function readExpansionSession(scope: ActiveOwnerLearningScope, source: ExpansionSource): Promise<ExpansionSession | null> {
  const journal = await readWorkspace(scope);
  const rows = journal.entries.filter(entry => {
    const value = entry.value as { sourceId?: unknown; contentVersion?: unknown; details?: { domain?: unknown } } | null;
    return entry.key.startsWith('activity.record:') && value?.sourceId === source.missionId
      && value.contentVersion === source.contentVersion && value.details?.domain === 'expansion';
  }).map(entry => {
    const value = entry.value as { version: number; details: { sessionId: string; kind: string; index: number; total: number } };
    if (value.version !== 1 || typeof value.details.sessionId !== 'string' || !value.details.sessionId
      || !['open', 'reveal', 'review', 'tts'].includes(value.details.kind)
      || !Number.isInteger(value.details.index) || value.details.index < 0 || value.details.index >= source.itemIds.length
      || value.details.total !== source.itemIds.length) throw new Error('Unreadable expansion session; retain source.');
    return { entry, ...value.details };
  });
  const open = rows.filter(row => row.kind === 'open').sort((left, right) => right.entry.changedAt - left.entry.changedAt
    || right.entry.changeId.localeCompare(left.entry.changeId))[0];
  if (!open) {
    if (rows.length) throw new Error('Missing expansion session source; retain journal.');
    return null;
  }
  const sessionRows = rows.filter(row => row.sessionId === open.sessionId);
  const reviewed = new Set(sessionRows.filter(row => row.kind === 'review').map(row => row.index));
  let index = 0;
  while (reviewed.has(index)) index++;
  const pendingIds = new Set(journal.pending.map(entry => entry.changeId));
  return { id: open.sessionId, index, revealed: sessionRows.some(row => row.kind === 'reveal' && row.index === index),
    pending: !scope.ownerGeneration.ownerKey.startsWith('anonymous:') && sessionRows.some(row => pendingIds.has(row.entry.changeId)) };
}

export async function openExpansionSession(scope: ActiveOwnerLearningScope, source: ExpansionSource, restart = false) {
  if (!source.itemIds.length) throw new Error('Expansion content is empty');
  const previous = await readExpansionSession(scope, source);
  if (previous && !restart) return previous;
  const sessionId = restart ? crypto.randomUUID() : await sha256Hex([source.missionId, source.contentVersion]);
  await saveExpansionActivity(scope, source, sessionId, 0, 'open');
  return (await readExpansionSession(scope, source))!;
}

async function saveExpansionActivity(scope: ActiveOwnerLearningScope, source: ExpansionSource, sessionId: string,
  index: number, kind: 'open' | 'reveal' | 'review' | 'tts') {
  await saveDescriptiveActivity(scope, { operationId: `expansion:${sessionId}:${index}:${kind}`,
    module: 'lessons', category: kind === 'open' ? 'session' : kind === 'review' ? 'self-review' : 'support',
    sourceId: source.missionId, itemId: source.itemIds[index], contentVersion: source.contentVersion,
    activityVersion: source.contentVersion, modality: kind === 'tts' ? 'audio' : 'text',
    reveal: kind === 'reveal' || kind === 'review' ? true : null,
    details: { domain: 'expansion', sessionId, index, total: source.itemIds.length, kind,
      syntheticTts: kind === 'tts', playback: kind === 'tts' ? 'requested' : null, measurementEligible: false } });
}

export async function advanceExpansionSession(scope: ActiveOwnerLearningScope, source: ExpansionSource,
  expected: ExpansionSession, kind: 'reveal' | 'review' | 'tts') {
  const current = await readExpansionSession(scope, source);
  if (!current || current.id !== expected.id || current.index !== expected.index || current.index >= source.itemIds.length
    || kind === 'review' && !current.revealed) throw new Error('Expansion changed in another tab; reopen the saved session.');
  await saveExpansionActivity(scope, source, current.id, current.index, kind);
  return (await readExpansionSession(scope, source))!;
}
