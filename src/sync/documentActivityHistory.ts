import type { CloudSyncDocumentV1, SyncClock } from './types';
import type { SyncOperationKind } from './indexedDb';
import { sha256Hex } from './canonicalHash';
import { workspaceHistoryEvent, type WorkspaceHistoryDescriptor } from './workspaceHistory';
import type { WorkspaceEntry } from './workspaceProtocol';

export async function documentActivityHistoryEntries(document: CloudSyncDocumentV1, operationId: string, kind: SyncOperationKind): Promise<WorkspaceEntry[]> {
  if (kind === 'reset') return [];
  const sources: Array<{ clock: SyncClock; module: 'profile' | 'dictionary'; itemId: string;
    category: 'preference' | 'saved-item'; details: Record<string, string | number | boolean | null> }> = [];
  if (document.profile.clock.operationId === operationId) sources.push({ clock: document.profile.clock,
    module: 'profile', itemId: 'profile', category: 'preference', details: { goal: document.profile.value.goal,
      dailyMinutes: document.profile.value.dailyMinutes, script: document.profile.value.script,
      startingLevel: document.profile.value.startingLevel, onboarded: document.profile.value.onboarded,
      ...(document.profile.value.learningPreferences ? {
        sessionMinutes: document.profile.value.learningPreferences.sessionMinutes,
        preferenceSource: document.profile.value.learningPreferences.source,
        allowInference: document.profile.value.learningPreferences.allowInference,
        sessionAudio: document.profile.value.learningPreferences.audio,
        sessionMicrophone: document.profile.value.learningPreferences.microphone,
      } : {}) } });
  for (const [itemId, value] of Object.entries(document.savedWords)) {
    if (value.clock.operationId === operationId) sources.push({ clock: value.clock, module: 'dictionary',
      itemId, category: 'saved-item', details: { present: value.present } });
  }
  return Promise.all(sources.map(async source => {
    const changeId = `document:${await sha256Hex([source.clock, source.module, source.itemId])}`;
    const validTime = Number.isFinite(Date.parse(source.clock.observedAt));
    const descriptor: WorkspaceHistoryDescriptor = { version: 1, module: source.module, category: source.category,
      sourceKey: `document:${source.module}:${source.itemId}`, sourceChangeId: changeId, sourceId: source.itemId,
      itemId: source.itemId, contentVersion: 'unknown', sourceVersion: 'cloud-document-v1',
      occurredAt: validTime ? source.clock.observedAt : null, outcome: 'unknown', hint: null, reveal: null,
      supportKind: null, details: { ...source.details, clockOperationId: source.clock.operationId,
        clockCounter: source.clock.counter, imported: kind === 'local-import' } };
    return { key: `history.activity:${changeId}`, value: descriptor,
      changeId, changedAt: validTime ? Date.parse(source.clock.observedAt) : 0 };
  }));
}

export function documentActivityHistoryEvent(ownerKey: string, resetEpoch: number, entry: WorkspaceEntry) {
  const event = workspaceHistoryEvent(ownerKey, resetEpoch, entry.value as WorkspaceHistoryDescriptor);
  return { ...event, authority: ownerKey.startsWith('anonymous:') ? 'local-practice' as const : 'unknown' as const,
    lineage: ownerKey.startsWith('anonymous:') ? 'guest-business-commit' as const : 'command-journal' as const };
}
