import { createHistoryYieldCheckpoint } from '../lib/historyWork';
import type { LessonHistoryEventV1 } from '../learning/lessonHistory';
import { readActiveOwnerLearningScope, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { readLocalLearningHistory } from '../sync/reviewHistory';
import { canonicalPagedHistoryView, updatePagedHistoryView } from '../sync/pagedHistoryView';
import { appendHistoryViewGroups, createHistoryView, dropHistoryView, historyViewBatches, readHistoryViewsPage, sealHistoryView,
  type HistoryView, type HistoryViewQuery } from '../sync/historyViewStore';

export type HistoryDisplayView = { local: HistoryView; remote: HistoryView | null };

export async function assertHistoryViewScope(scope: ActiveOwnerLearningScope, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('History cancelled', 'AbortError');
  const active = await readActiveOwnerLearningScope();
  if (signal?.aborted) throw new DOMException('History cancelled', 'AbortError');
  if (!active || active.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
    || active.ownerGeneration.generation !== scope.ownerGeneration.generation || active.resetEpoch !== scope.resetEpoch) throw new StaleOwnerGenerationError();
}

export async function buildHistoryView(scope: ActiveOwnerLearningScope,
  groups: AsyncIterable<readonly LessonHistoryEventV1[]> | Iterable<readonly LessonHistoryEventV1[]>, signal?: AbortSignal) {
  scope = structuredClone(scope);
  await assertHistoryViewScope(scope, signal);
  const view = await createHistoryView(scope), checkpoint = createHistoryYieldCheckpoint();
  try {
    await appendHistoryViewGroups(view, groups, signal, checkpoint);
    await assertHistoryViewScope(scope, signal);
    await sealHistoryView(view);
    await assertHistoryViewScope(scope, signal);
    return view;
  } catch (error) { await dropHistoryView(view).catch(() => undefined); throw error; }
}

export async function localHistoryView(scope: ActiveOwnerLearningScope, signal?: AbortSignal) {
  scope = structuredClone(scope);
  // Source adapters are still migrated independently. Do not retain this array
  // in the UI or across the subsequent remote request.
  const local = await readLocalLearningHistory(scope);
  await assertHistoryViewScope(scope, signal);
  const view = await canonicalPagedHistoryView(scope, local, signal, false);
  try { await assertHistoryViewScope(scope, signal); return view; }
  catch (error) { await dropHistoryView(view).catch(() => undefined); throw error; }
}

export async function remoteHistoryView(scope: ActiveOwnerLearningScope, previous: HistoryView | null,
  groups: readonly (readonly LessonHistoryEventV1[])[], signal?: AbortSignal) {
  scope = structuredClone(scope);
  await assertHistoryViewScope(scope, signal);
  const view = await updatePagedHistoryView(scope, previous, groups, signal);
  try { await assertHistoryViewScope(scope, signal); return view; }
  catch (error) { await dropHistoryView(view).catch(() => undefined); throw error; }
}

export async function* historyViewGroups(views: readonly (HistoryView | null)[], additions: readonly (readonly LessonHistoryEventV1[])[] = [], signal?: AbortSignal) {
  for (const view of views) if (view) yield* historyViewBatches(view, signal);
  yield* additions;
}

export async function combineHistoryViews(local: HistoryView, remote: HistoryView | null, signal?: AbortSignal): Promise<HistoryDisplayView> {
  const view = { local, remote };
  // Check conflicts across all rows before a remote cursor can be committed.
  if (remote) await queryHistoryView(view, { module: 'all', skill: 'all' }, signal);
  else await assertHistoryViewScope(local.scope, signal);
  return view;
}

export async function queryHistoryView(view: HistoryView | HistoryDisplayView, query: HistoryViewQuery, signal?: AbortSignal) {
  const inputs = ('local' in view ? view.remote ? [view.local, view.remote] : [view.local] : [view]).map(input => structuredClone(input));
  const scope = inputs[0].scope;
  await assertHistoryViewScope(scope, signal);
  const page = await readHistoryViewsPage(inputs, query, signal);
  await assertHistoryViewScope(scope, signal);
  return page;
}
