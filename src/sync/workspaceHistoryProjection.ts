import { readActiveOwnerLearningScope, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';
import { projectWorkspaceStorage } from './workspaceStorage';
import type { WorkspaceEntry } from './workspaceProtocol';
import { isWorkspaceHistoryDescriptor, WORKSPACE_HISTORY_PREFIX, workspaceHistoryEntry,
  workspaceHistoryEventsCooperatively } from './workspaceHistory';
import { forEachHistoryBatch } from '../lib/historyWork';

type HistoryCell = { key: string; changeId: string; descriptor?: WorkspaceEntry; derived?: WorkspaceEntry | null };

function projectEntry(entry: WorkspaceEntry, lane: 'entries' | 'pending'): HistoryCell {
  const cell: HistoryCell = { key: entry.key, changeId: entry.changeId };
  if (lane === 'pending') return cell;
  if (entry.key.startsWith(WORKSPACE_HISTORY_PREFIX)) {
    if (!isWorkspaceHistoryDescriptor(entry.value) || entry.key !== `${WORKSPACE_HISTORY_PREFIX}${entry.value.sourceChangeId}`
      || entry.changeId !== entry.value.sourceChangeId) throw new Error('Unreadable workspace history; retain journal.');
    // Preserve every field consumed by workspaceHistoryEvent without retaining
    // unknown raw properties that older writers may have attached to the row.
    const { version, module, category, sourceKey, sourceChangeId, itemId, contentVersion, occurredAt, outcome,
      hint, reveal, supportKind, sourceVersion, sourceId, sourceLessonIds, skill, modality, details } = entry.value;
    cell.descriptor = { key: entry.key, changeId: entry.changeId, changedAt: entry.changedAt,
      value: { version, module, category, sourceKey, sourceChangeId, itemId, contentVersion, occurredAt, outcome,
        hint, reveal, supportKind, sourceVersion, sourceId, sourceLessonIds, skill, modality, details } };
  }
  // Still inspect every source, even when a stored descriptor will take
  // precedence. This preserves the canonical malformed-source rejection.
  cell.derived = workspaceHistoryEntry(entry);
  return cell;
}

/** Paged raw values are released page by page. Compact identities/descriptors
 * and the complete history output still scale with the number of activities. */
export async function readWorkspaceHistoryProjection(scope: ActiveOwnerLearningScope) {
  scope = structuredClone(scope);
  const projected = await projectWorkspaceStorage(scope, projectEntry);
  const keys = new Set<string>(), descriptors: WorkspaceEntry[] = [];
  await forEachHistoryBatch(projected.entries.length, index => {
    // The legacy parser skips holes, but its history rebuild cannot consume
    // missing source entries. Keep that read fail-closed as well.
    if (!(index in projected.entries)) throw new Error('Unreadable workspace history; retain journal.');
    const cell = projected.entries[index];
    keys.add(cell.key);
    if (cell.descriptor) descriptors.push(cell.descriptor);
  });
  await forEachHistoryBatch(projected.entries.length, index => {
    if (!(index in projected.entries)) return;
    const derived = projected.entries[index].derived;
    if (derived && !keys.has(derived.key)) { keys.add(derived.key); descriptors.push(derived); }
  });
  const events = await workspaceHistoryEventsCooperatively({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch },
    descriptors, projected.pending);
  const active = await readActiveOwnerLearningScope();
  if (!active || active.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
    || active.ownerGeneration.generation !== scope.ownerGeneration.generation || active.resetEpoch !== scope.resetEpoch) throw new StaleOwnerGenerationError();
  return events;
}
