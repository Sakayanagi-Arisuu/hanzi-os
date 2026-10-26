import { expect, it, vi } from 'vitest';
import { createActivityHistoryEvent } from './activityHistory';
import { projectLessonHistory, projectLessonHistoryCooperatively, type LessonHistoryEventV1 } from './lessonHistory';
import { forEachHistoryBatch } from '../lib/historyWork';

const scope = { ownerKey: 'anonymous:cooperative-history', resetEpoch: 0 };
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
