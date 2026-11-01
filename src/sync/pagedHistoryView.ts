import { compareHistoryEvents, projectLessonHistory, reconcileLessonHistoryEvent, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { createHistoryYieldCheckpoint } from '../lib/historyWork';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { createPagedHistoryView, historyViewLayout, historyViewRecords, HistoryViewUnavailableError,
  type HistoryView, type HistoryViewRecord } from './historyViewStore';
import { historyViewEvent } from './historyViewEvent';

const cancelled = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('History cancelled', 'AbortError'); };

/** The local reader already returns canonical, unique events. Sort only two
 * compact integer index buffers; never clone the complete event array again. */
export async function canonicalPagedHistoryView(scope: ActiveOwnerLearningScope, events: readonly LessonHistoryEventV1[], signal?: AbortSignal, orderIndex = true) {
  const checkpoint = createHistoryYieldCheckpoint();
  let source = Uint32Array.from({ length: events.length }, (_, i) => i), target = new Uint32Array(events.length);
  let work = 0, deadline = performance.now() + 8;
  for (let width = 1; width < events.length; width *= 2) {
    for (let start = 0; start < events.length; start += width * 2) {
      const middle = Math.min(start + width, events.length), end = Math.min(start + 2 * width, events.length);
      let left = start, right = middle, position = start;
      while (left < middle || right < end) {
        target[position++] = left < middle && (right >= end || events[source[left]].eventId <= events[source[right]].eventId) ? source[left++] : source[right++];
        if (++work % 1024 === 0 && performance.now() >= deadline) { cancelled(signal); await checkpoint(); deadline = performance.now() + 8; }
      }
    }
    [source, target] = [target, source];
  }
  const indices = source;
  return createPagedHistoryView(scope, events.length, async function* (lane) {
    for (let start = 0; start < events.length; start += 128) {
      cancelled(signal);
      const batch: HistoryViewRecord[] = [];
      for (let i = start; i < Math.min(events.length, start + 128); i++) {
        const ordinal = lane === 'order' ? i : indices[i]; batch.push({ ordinal, event: events[ordinal] });
      }
      yield batch; await checkpoint();
    }
  }, signal, orderIndex);
}

type Update = { observations: LessonHistoryEventV1[]; oldOrdinal?: number; final?: LessonHistoryEventV1; priority: number; rank?: number };
const lowerBound = (values: readonly number[], value: number) => {
  let low = 0, high = values.length;
  while (low < high) { const middle = (low + high) >>> 1; if (values[middle] < value) low = middle + 1; else high = middle; }
  return low;
};

/** At most three 50-event API pages are overlaid on an immutable remote view.
 * All old data is streamed in blocks. Only the incoming receipts/changed ranks
 * remain in RAM, including when the remote history spans many API pages. */
export async function updatePagedHistoryView(scope: ActiveOwnerLearningScope, previous: HistoryView | null,
  groups: readonly (readonly LessonHistoryEventV1[])[], signal?: AbortSignal) {
  cancelled(signal);
  if (groups.reduce((sum, group) => sum + group.length, 0) > 150) throw new HistoryViewUnavailableError('History API page exceeded its requested limit; retain sources.');
  const updates = new Map<string, Update>();
  const owner = { ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch };
  for (const group of groups) for (const raw of group) {
    const event = historyViewEvent(raw); reconcileLessonHistoryEvent(owner, event);
    const current = updates.get(event.eventId);
    if (current) current.observations.push(event);
    else updates.set(event.eventId, { observations: [event], priority: 0 });
  }
  const layout = previous ? await historyViewLayout(previous) : { count: 0, paged: true, orderIndex: true };
  if (previous && (!layout.paged || !layout.orderIndex || previous.scope.ownerGeneration.ownerKey !== owner.ownerKey
    || previous.scope.ownerGeneration.generation !== scope.ownerGeneration.generation || previous.scope.resetEpoch !== owner.resetEpoch)) {
    throw new HistoryViewUnavailableError('Remote display cache needs rebuilding from its source.');
  }
  const checkpoint = createHistoryYieldCheckpoint();
  if (previous) for await (const batch of historyViewRecords(previous, 'id', signal)) {
    for (const row of batch) {
      const update = updates.get(row.event.eventId); if (!update) continue;
      update.oldOrdinal = row.ordinal; update.priority = row.ordinal; update.final = row.event;
      for (const observation of update.observations) update.final = reconcileLessonHistoryEvent(owner, observation, update.final);
    }
    await checkpoint();
  }
  let newCount = 0;
  for (const update of updates.values()) if (update.oldOrdinal === undefined) {
    update.priority = layout.count + newCount++;
    for (const observation of update.observations) update.final = reconcileLessonHistoryEvent(owner, observation, update.final);
  }
  const count = layout.count + newCount;
  if (!previous) {
    const canonical = projectLessonHistory(owner, [...updates.values()].map(update => update.final!));
    return canonicalPagedHistoryView(scope, canonical, signal);
  }
  const sorted = [...updates.values()].sort((a, b) => compareHistoryEvents(a.final!, b.final!) || a.priority - b.priority);
  const removed = [...updates.values()].flatMap(update => update.oldOrdinal === undefined ? [] : [update.oldOrdinal]).sort((a, b) => a - b);
  const newById = [...updates.values()].filter(update => update.oldOrdinal === undefined).sort((a, b) => a.final!.eventId < b.final!.eventId ? -1 : 1);
  const updatedBefore = (row: HistoryViewRecord) => {
    let low = 0, high = sorted.length;
    while (low < high) {
      const middle = (low + high) >>> 1, update = sorted[middle];
      if ((compareHistoryEvents(update.final!, row.event) || update.priority - row.ordinal) < 0) low = middle + 1; else high = middle;
    }
    return low;
  };
  async function* oldRows(lane: 'id' | 'order') {
    for await (const batch of historyViewRecords(previous!, lane, signal)) { yield* batch; await checkpoint(); }
  }
  async function* records(lane: 'id' | 'order'): AsyncGenerator<HistoryViewRecord[]> {
    const iterator = oldRows(lane); let batch: HistoryViewRecord[] = [], index = 0, rank = 0;
    const add = (record: HistoryViewRecord) => { batch.push(record); };
    if (lane === 'order') {
      for await (const row of iterator) {
        if (updates.has(row.event.eventId)) continue;
        while (index < sorted.length && (compareHistoryEvents(sorted[index].final!, row.event) || sorted[index].priority - row.ordinal) < 0) {
          const update = sorted[index++]; update.rank = rank; add({ ordinal: rank++, event: update.final! });
          if (batch.length === 128) { yield batch; batch = []; }
        }
        add({ ordinal: rank++, event: row.event }); if (batch.length === 128) { yield batch; batch = []; }
      }
      while (index < sorted.length) {
        const update = sorted[index++]; update.rank = rank; add({ ordinal: rank++, event: update.final! });
        if (batch.length === 128) { yield batch; batch = []; }
      }
      if (rank !== count) throw new HistoryViewUnavailableError('Remote history count changed; retain sources.');
    } else {
      for await (const row of iterator) {
        while (index < newById.length && newById[index].final!.eventId < row.event.eventId) {
          const update = newById[index++]; add({ ordinal: update.rank!, event: update.final! });
          if (batch.length === 128) { yield batch; batch = []; }
        }
        const update = updates.get(row.event.eventId);
        add(update ? { ordinal: update.rank!, event: update.final! }
          : { ordinal: row.ordinal - lowerBound(removed, row.ordinal) + updatedBefore(row), event: row.event });
        if (batch.length === 128) { yield batch; batch = []; }
      }
      while (index < newById.length) {
        const update = newById[index++]; add({ ordinal: update.rank!, event: update.final! });
        if (batch.length === 128) { yield batch; batch = []; }
      }
    }
    if (batch.length) yield batch;
  }
  return createPagedHistoryView(scope, count, records, signal);
}
