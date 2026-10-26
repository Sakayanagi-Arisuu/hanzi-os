import { readActiveOwnerLearningScope, readLessonResume, updateLessonResume, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';
import { mergeWorkspaceEntries, validWorkspaceEntry, WORKSPACE_EXTENSIONS_HEADER, type WorkspaceDocument, type WorkspaceEntry } from './workspaceProtocol';
import { workspaceHistoryEntry } from './workspaceHistory';
import { isImmutableActivityRecordKey } from './immutableActivityRecord';
import { forEachHistoryBatch, HISTORY_COOPERATIVE_THRESHOLD } from '../lib/historyWork';

const KEY = 'workspace-sync:v1';
export const WORKSPACE_CHANGED = 'hanzi-workspace-changed';
type Journal = { version: 1; entries: WorkspaceEntry[]; pending: WorkspaceEntry[] };
const empty = (): Journal => ({ version: 1, entries: [], pending: [] });
const parse = (value: unknown): Journal => {
  if (value === undefined) return empty();
  const journal = value as Journal | undefined;
  if (journal?.version === 1 && Array.isArray(journal.entries) && Array.isArray(journal.pending)
    && journal.entries.every(validWorkspaceEntry) && journal.pending.every(validWorkspaceEntry)) return journal;
  throw new Error('Không đọc được dữ liệu đọc và luyện đã lưu. Hãy giữ dữ liệu trên thiết bị để khôi phục.');
};
const scopeFor = (scope: ActiveOwnerLearningScope) => ({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: KEY });
export async function readWorkspace(scope: ActiveOwnerLearningScope) {
  return parse((await readLessonResume(scopeFor(scope)))?.value);
}

/** Same parser predicates as readWorkspace, scheduled in batches for large IDB
 * snapshots. The final owner fence is required after yielding to other tasks. */
export async function readWorkspaceCooperatively(scope: ActiveOwnerLearningScope) {
  const value = (await readLessonResume(scopeFor(scope)))?.value;
  const journal = value as Journal | undefined;
  if (journal?.version !== 1 || !Array.isArray(journal.entries) || !Array.isArray(journal.pending)
    || journal.entries.length + journal.pending.length < HISTORY_COOPERATIVE_THRESHOLD) return parse(value);
  for (const entries of [journal.entries, journal.pending]) {
    await forEachHistoryBatch(entries.length, index => {
      // Array.every skips sparse holes; retain that exact parser behavior.
      if (index in entries && !validWorkspaceEntry(entries[index])) {
        throw new Error('Không đọc được dữ liệu đọc và luyện đã lưu. Hãy giữ dữ liệu trên thiết bị để khôi phục.');
      }
    });
  }
  const active = await currentWorkspaceScope(scope.ownerGeneration.ownerKey);
  if (!active || active.resetEpoch !== scope.resetEpoch || active.ownerGeneration.generation !== scope.ownerGeneration.generation) {
    throw new StaleOwnerGenerationError();
  }
  return journal;
}
export async function saveWorkspaceChanges(scope: ActiveOwnerLearningScope, changes: Array<{ key: string; value: unknown; changedAt?: number }>,
  shouldReplace?: (existing: WorkspaceEntry | undefined, value: unknown) => boolean,
  validateCurrent?: (entries: readonly WorkspaceEntry[]) => void) {
  if (!changes.length) return;
  let changed = false;
  await updateLessonResume(scopeFor(scope), previous => {
    const journal = parse(previous);
    validateCurrent?.(journal.entries);
    const stamp = journal.entries.reduce((latest, entry) => Math.max(latest, entry.changedAt + 1), Date.now());
    const entries = changes.filter(change => {
      const existing = journal.entries.find(entry => entry.key === change.key);
      if (shouldReplace && !shouldReplace(existing, change.value)) return false;
      return !existing || JSON.stringify(existing.value) !== JSON.stringify(change.value);
    }).map(change => ({ ...change, changedAt: change.changedAt ?? stamp, changeId: crypto.randomUUID() }));
    if (!entries.every(validWorkspaceEntry)) throw new Error('Invalid workspace changes');
    if (!entries.length) return journal;
    changed = true;
    const durableEntries = [...entries, ...entries.flatMap(entry => {
      const history = workspaceHistoryEntry(entry);
      return history ? [history] : [];
    })];
    return { version: 1, entries: mergeWorkspaceEntries(journal.entries, durableEntries),
      pending: mergeWorkspaceEntries(journal.pending, durableEntries) } satisfies Journal;
  });
  if (changed) window.dispatchEvent(new Event(WORKSPACE_CHANGED));
}
export async function syncWorkspace(scope: ActiveOwnerLearningScope, signal: AbortSignal, send: typeof fetch = fetch) {
  const journal = await readWorkspace(scope);
  const batch: WorkspaceEntry[] = [];
  let bytes = 0;
  for (const entry of journal.pending.slice(0, 100)) {
    const size = new TextEncoder().encode(JSON.stringify(entry)).byteLength;
    if (batch.length && bytes + size > 400_000) break;
    batch.push(entry); bytes += size;
  }
  const response = await send('/api/learning/workspace', { method: 'POST', signal,
    credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-learning-owner': scope.ownerGeneration.ownerKey, [WORKSPACE_EXTENSIONS_HEADER]: '3' },
    body: JSON.stringify({ version: 1, resetEpoch: scope.resetEpoch, entries: batch }) });
  if (!response.ok) throw new Error(`Workspace unavailable: ${response.status}`);
  const received = await response.json() as WorkspaceDocument;
  if (received.version !== 1 || received.resetEpoch !== scope.resetEpoch || !Array.isArray(received.entries)
    || !received.entries.every(validWorkspaceEntry)) throw new Error('Invalid workspace response');
  const sent = new Set(batch.filter(entry => received.entries.some(remote => remote.key === entry.key
    && (isImmutableActivityRecordKey(entry.key) ? remote.changeId === entry.changeId && JSON.stringify(remote.value) === JSON.stringify(entry.value)
      : remote.changedAt > entry.changedAt || (remote.changedAt === entry.changedAt && remote.changeId >= entry.changeId))))
    .map(entry => entry.changeId));
  await updateLessonResume(scopeFor(scope), previous => {
    const current = parse(previous);
    return { version: 1, entries: mergeWorkspaceEntries(current.entries, received.entries),
      pending: current.pending.filter(entry => !sent.has(entry.changeId)) } satisfies Journal;
  });
  window.dispatchEvent(new Event('hanzi-workspace-received'));
}

export async function currentWorkspaceScope(ownerKey: string) {
  const scope = await readActiveOwnerLearningScope();
  return scope?.ownerGeneration.ownerKey === ownerKey ? scope : null;
}
