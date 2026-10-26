import type { ActiveOwnerLearningScope } from './indexedDb';
import { readWorkspace } from './workspaceSync';

export async function practiceObservationsConfirmed(scope: ActiveOwnerLearningScope, operationIds: readonly string[], sourceKeys: readonly string[] = []) {
  const journal = await readWorkspace(scope);
  const acknowledged = (changeId: string) => !journal.pending.some(candidate => candidate.changeId === changeId);
  return operationIds.length > 0 && operationIds.every(operationId => {
    const entry = journal.entries.find(candidate => candidate.key.startsWith('activity.record:')
      && candidate.value && typeof candidate.value === 'object' && (candidate.value as { operationId?: unknown }).operationId === operationId);
    return entry && acknowledged(entry.changeId);
  }) && sourceKeys.every(key => {
    const entry = journal.entries.find(candidate => candidate.key === key);
    return entry && acknowledged(entry.changeId);
  });
}
