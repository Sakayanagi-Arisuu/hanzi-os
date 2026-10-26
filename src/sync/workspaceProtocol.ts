import { isWorkspaceHistoryDescriptor } from './workspaceHistory';
import { isAdaptiveRecordKey, isAdaptiveDraftRecoveryRecordKey } from './immutableActivityRecord';
export type WorkspaceEntry = { key: string; value: unknown; changedAt: number; changeId: string };
export type WorkspaceDocument = { version: 1; resetEpoch: number; entries: WorkspaceEntry[] };
export const WORKSPACE_EXTENSIONS_HEADER = 'x-learning-workspace-version';
export function workspaceEntriesForClient(entries: readonly WorkspaceEntry[], supportsExtensions: boolean, supportsHistory = false) {
  return entries.filter(entry => (!/^(history\.activity:|activity\.record:)/.test(entry.key) || supportsHistory)
    && (supportsExtensions || !/^(reader\.answer:|practice\.(mistake|correction):)/.test(entry.key)));
}
export const validWorkspaceEntry = (value: unknown): value is WorkspaceEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as WorkspaceEntry;
  return typeof entry.key === 'string' && /^(activity\.record:|history\.activity:|reader\.(chapter|answer|saved|bookmark|position|support):|practice\.(mistake|correction):|access:|exam\.practice:)/.test(entry.key)
    && (!entry.key.startsWith('history.activity:') || isWorkspaceHistoryDescriptor(entry.value)
      && entry.key === `history.activity:${entry.value.sourceChangeId}` && entry.changeId === entry.value.sourceChangeId)
    && entry.key.length <= 500 && Number.isSafeInteger(entry.changedAt) && entry.changedAt >= 0
    && typeof entry.changeId === 'string' && entry.changeId.length > 0 && entry.changeId.length <= 160
    && JSON.stringify(entry.value ?? null).length <= 50_000;
};
export function mergeWorkspaceEntries(left: readonly WorkspaceEntry[], right: readonly WorkspaceEntry[]) {
  const entries = new Map<string, WorkspaceEntry>();
  for (const entry of [...left, ...right]) {
    const old = entries.get(entry.key);
    if (old && (isAdaptiveRecordKey(entry.key) || isAdaptiveDraftRecoveryRecordKey(entry.key)) && (old.changeId !== entry.changeId || JSON.stringify(old.value) !== JSON.stringify(entry.value))) {
      throw new Error('Conflicting adaptive revision; retain local journal and pending command.');
    }
    if (old && entry.key.startsWith('history.activity:') && JSON.stringify(old.value) !== JSON.stringify(entry.value)) throw new Error('Conflicting history records; retain both sources.');
    if (!old || entry.changedAt > old.changedAt || (entry.changedAt === old.changedAt && entry.changeId > old.changeId)) entries.set(entry.key, entry);
  }
  return [...entries.values()].sort((a, b) => a.key.localeCompare(b.key));
}
