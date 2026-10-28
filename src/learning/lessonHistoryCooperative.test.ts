import { afterEach, expect, it, vi } from 'vitest';
import { createActivityHistoryEvent } from './activityHistory';
import { projectLessonHistory, projectLessonHistoryCooperatively, projectLessonHistoryGroupsCooperatively, type LessonHistoryEventV1 } from './lessonHistory';
import { forEachHistoryBatch } from '../lib/historyWork';

const scope = { ownerKey: 'anonymous:cooperative-history', resetEpoch: 0 };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const make = (index: number) => createActivityHistoryEvent({ ...scope, operationId: `observation-${index}`, module: 'profile',
  category: 'preference', sourceId: `source-${index}`, itemId: `source-${index}`, contentVersion: 'fixture-v1',
  activityVersion: 'fixture-v1', occurredAt: new Date(1_700_000_000_000 + index).toISOString(), sourceRecordRef: `source-${index}` });

it('keeps ordering, confirmation precedence and dedup across batch boundaries without changing input', async () => {
  const events = Array.from({ length: 2_200 }, (_, index) => make(index));
  const confirmed: LessonHistoryEventV1 = { ...events[1], confirmationState: 'confirmed', authority: 'server-recorded', receiptRef: 'original-receipt' };
  const input = [confirmed, ...events, events[0]], before = structuredClone(input);
  expect(await projectLessonHistoryCooperatively(scope, input)).toEqual(projectLessonHistory(scope, input));
  expect(await projectLessonHistoryCooperatively(scope, input)).toHaveLength(2_200);
  expect(input).toEqual(before);
});

it('rejects conflicts or another owner appearing after several batches instead of returning a partial result', async () => {
  const events = Array.from({ length: 2_100 }, (_, index) => make(index));
  const confirmed: LessonHistoryEventV1 = { ...events[0], confirmationState: 'confirmed', authority: 'server-recorded', receiptRef: 'first' };
  for (const last of [{ ...confirmed, receiptRef: 'conflict' }, { ...events[0], itemId: 'changed-identity' }, { ...events[0], ownerKey: 'anonymous:other' }]) {
    const input = [confirmed, ...events, last];
    expect(() => projectLessonHistory(scope, input)).toThrow();
    await expect(projectLessonHistoryCooperatively(scope, input)).rejects.toThrow();
  }
});

it('yields between bounded batches while visiting every index exactly once, and stops on failure', async () => {
  const visited: number[] = [], checkpoints: number[] = [];
  await forEachHistoryBatch(1_201, index => { visited.push(index); }, async () => { checkpoints.push(visited.length); });
  expect(visited).toEqual(Array.from({ length: 1_201 }, (_, index) => index));
  expect(checkpoints).toEqual([500, 1_000]);
  const yieldWork = vi.fn(async () => undefined);
  await expect(forEachHistoryBatch(1_201, index => { if (index === 600) throw Error('retain source'); }, yieldWork)).rejects.toThrow('retain source');
  expect(yieldWork).toHaveBeenCalledOnce();
});

it.each([1_999, 2_000, 2_001, 4_097])('matches native ordering and preserves input at sort boundaries: %s', async length => {
  const events = Array.from({ length }, (_, index) => make(index));
  let seed = 17;
  for (let i = events.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1); [events[i], events[j]] = [events[j], events[i]];
  }
  const before = structuredClone(events);
  expect(await projectLessonHistoryCooperatively(scope, events)).toEqual(projectLessonHistory(scope, events));
  expect(events).toEqual(before);
});

it('keeps stable order when Unicode event IDs compare equal and action time is unknown', async () => {
  const tie = (operationId: string) => createActivityHistoryEvent({ ...scope, operationId, module: 'profile', category: 'preference',
    sourceId: 'same-source', itemId: 'same-item', contentVersion: 'fixture-v1', activityVersion: 'fixture-v1', occurredAt: null, sourceRecordRef: operationId });
  const first = tie('é'), second = tie('e\u0301');
  expect(first.eventId.localeCompare(second.eventId)).toBe(0);
  const input = [first, ...Array.from({ length: 2_001 }, (_, i) => make(i)), second];
  const projected = await projectLessonHistoryCooperatively(scope, input);
  expect(projected).toEqual(projectLessonHistory(scope, input));
  expect(projected.filter(event => [first.eventId, second.eventId].includes(event.eventId))).toEqual([first, second]);
});

it('gives ordinary timers a turn when native continuations exceed the fairness deadline', async () => {
  let now = 0;
  const nativeYield = vi.fn(async () => undefined);
  vi.stubGlobal('scheduler', { yield: nativeYield });
  vi.stubGlobal('performance', { now: () => { now += 20; return now; } });
  const timer = vi.spyOn(globalThis, 'setTimeout'), visited: number[] = [];
  await forEachHistoryBatch(1_201, index => { visited.push(index); });
  expect(nativeYield).toHaveBeenCalledTimes(2);
  expect(timer).toHaveBeenCalledWith(expect.any(Function), 0);
  expect(visited).toHaveLength(1_201);
});

it.each([0, 1, 1_999, 2_000, 2_001])('reconciles grouped sources exactly like the flat canonical reducer: %s', async length => {
  const input = Array.from({ length }, (_, index) => make(index));
  const confirmed: LessonHistoryEventV1[] = length ? [{ ...input[0], confirmationState: 'confirmed', authority: 'server-recorded', receiptRef: 'synthetic-receipt' }] : [];
  const groups = [[], input.slice(0, 500), [], confirmed, input.slice(500), []];
  const before = structuredClone(groups);
  expect(await projectLessonHistoryGroupsCooperatively(scope, groups)).toEqual(projectLessonHistory(scope, groups.flat()));
  expect(groups).toEqual(before);
});

it('yields across thousands of individually small groups and still rejects late conflicts', async () => {
  const groups = Array.from({ length: 2_100 }, (_, index) => [make(index)]);
  const yieldWork = vi.fn(async () => undefined); vi.stubGlobal('scheduler', { yield: yieldWork });
  expect(await projectLessonHistoryGroupsCooperatively(scope, groups)).toHaveLength(groups.length);
  expect(yieldWork).toHaveBeenCalled();
  await expect(projectLessonHistoryGroupsCooperatively(scope, [...groups, [{ ...groups[0][0], itemId: 'conflict' }]])).rejects.toThrow('Conflicting');
});
