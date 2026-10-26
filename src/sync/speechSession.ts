import type { ActiveOwnerLearningScope } from './indexedDb';
import { readWorkspace } from './workspaceSync';
import { saveDescriptiveActivity } from './activityObservations';
import { sha256Hex } from './canonicalHash';

export type SpeechMissionSource = { missionId: string; lessonId: string; contentVersion: string; version: string; itemIds: string[] };
export type SpeechMissionResume = { id: string; completed: string[]; manual: string[]; index: number; pending: boolean };

export async function readSpeechSession(scope: ActiveOwnerLearningScope, source: SpeechMissionSource): Promise<SpeechMissionResume | null> {
  const journal = await readWorkspace(scope);
  const rows = journal.entries.filter(entry => entry.key.startsWith('activity.record:')).map(entry => ({ entry,
    value: entry.value as { version?: number; module?: string; sourceId?: string; category?: string; operationId?: string;
      itemId?: string; contentVersion?: string; details?: { domain?: string; kind?: string; sessionId?: string;
        sourceVersion?: string; manual?: boolean; total?: number } } }));
  const opens = rows.filter(row => row.value.module === 'speech' && row.value.sourceId === source.missionId && row.value.details?.domain === 'speech-session'
    && row.value.contentVersion === source.contentVersion && row.value.details.sourceVersion === source.version);
  if (opens.some(row => row.value.version !== 1 || row.value.details?.kind !== 'open'
    || typeof row.value.details.sessionId !== 'string' || !row.value.details.sessionId || row.value.details.total !== source.itemIds.length)) {
    throw new Error('Unreadable speech session; retain journal.');
  }
  const open = opens.sort((left, right) => right.entry.changedAt - left.entry.changedAt
    || right.entry.changeId.localeCompare(left.entry.changeId))[0];
  if (!open) return null;
  const sessionId = open.value.details!.sessionId!;
  const completedRows = rows.filter(row => row.value.module === 'speech' && row.value.category === 'self-review' && row.value.details?.sessionId === sessionId
    && row.value.details.sourceVersion === source.version);
  if (completedRows.some(row => row.value.version !== 1 || row.value.contentVersion !== source.contentVersion || !source.itemIds.includes(row.value.itemId ?? '')
    || typeof row.value.details?.manual !== 'boolean')) throw new Error('Unreadable speech completion; retain journal.');
  const completed = source.itemIds.filter(itemId => completedRows.some(row => row.value.itemId === itemId));
  const manual = completedRows.filter(row => row.value.details?.manual).map(row => row.value.itemId!);
  const index = source.itemIds.findIndex(itemId => !completed.includes(itemId));
  const pendingIds = new Set(journal.pending.map(entry => entry.changeId));
  return { id: sessionId, completed, manual, index: index < 0 ? source.itemIds.length - 1 : index,
    pending: !scope.ownerGeneration.ownerKey.startsWith('anonymous:') && [open, ...completedRows].some(row => pendingIds.has(row.entry.changeId)) };
}

export async function openSpeechSession(scope: ActiveOwnerLearningScope, source: SpeechMissionSource, restart = false) {
  if (!source.itemIds.length || new Set(source.itemIds).size !== source.itemIds.length) throw new Error('Invalid speech mission source.');
  const previous = await readSpeechSession(scope, source);
  if (previous && !restart) return previous;
  const sessionId = restart ? crypto.randomUUID() : await sha256Hex([source.missionId, source.version]);
  await saveDescriptiveActivity(scope, { operationId: `speech-open:${sessionId}`, module: 'speech', category: 'session',
    sourceId: source.missionId, itemId: source.missionId, sourceLessonIds: [source.lessonId], contentVersion: source.contentVersion,
    activityVersion: source.version, details: { domain: 'speech-session', kind: 'open', sessionId,
      sourceVersion: source.version, total: source.itemIds.length, measurementEligible: false } });
  return (await readSpeechSession(scope, source))!;
}

export async function completeSpeechSessionItem(scope: ActiveOwnerLearningScope, source: SpeechMissionSource,
  sessionId: string, itemId: string, activityId: string,
  details: { manual: boolean; acousticReportAvailable: boolean; wordPlaybackCompleted: boolean; sentencePlaybackCompleted: boolean }) {
  const current = await readSpeechSession(scope, source);
  if (!current || current.id !== sessionId || !source.itemIds.includes(itemId)) throw new Error('Speech session changed; reopen saved mission.');
  await saveDescriptiveActivity(scope, { operationId: `speech:${sessionId}:${itemId}`, module: 'speech', category: 'self-review',
    sourceId: activityId, itemId, contentVersion: source.contentVersion, activityVersion: source.version,
    sourceLessonIds: [source.lessonId], modality: 'speech', skill: 'speaking', details: { ...details, sessionId, sourceVersion: source.version, measurementEligible: false } });
  return (await readSpeechSession(scope, source))!;
}
