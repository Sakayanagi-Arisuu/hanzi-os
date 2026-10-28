import { expect, it } from 'vitest';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { selectHistoryWindow } from './historyWindow';

const events = Array.from({ length: 100_000 }, (_, index) => ({
  ...createActivityHistoryEvent({ ownerKey: 'anonymous:history-window', resetEpoch: 0, operationId: `window-${index}`,
    module: index % 2 ? 'reader' : 'profile', category: 'visit', sourceId: 'fixture', itemId: String(index),
    contentVersion: 'fixture-v1', activityVersion: 'fixture-v1', occurredAt: null, sourceRecordRef: String(index) }),
  skill: index % 3 ? null : 'reading' as const,
}));

it('counts the full loaded history but retains only the requested window in source order', () => {
  const first = selectHistoryWindow(events, 'all', 'all', 20);
  expect(first.count).toBe(100_000);
  expect(first.displayed).toEqual(events.slice(0, 20));
  const next = selectHistoryWindow(events, 'all', 'all', 40);
  expect(next.count).toBe(first.count);
  expect(next.displayed.slice(0, 20)).toEqual(first.displayed);
  expect(next.displayed[39]).toBe(events[39]);
});

it.each([['reader', 'unknown'], ['reader', 'reading'], ['all', 'unknown'], ['profile', 'speaking']] as const)(
  'keeps exact filter counts and stable order for %s/%s', (module, skill) => {
    const expected = events.filter(event => (module === 'all' || event.module === module) && (skill === 'unknown' ? event.skill === null : event.skill === skill));
    const actual = selectHistoryWindow(events, module, skill, 20);
    expect(actual.count).toBe(expected.length); expect(actual.displayed).toEqual(expected.slice(0, 20));
  });

it('allows a zero window while counting matches and rejects invalid allocation limits', () => {
  expect(selectHistoryWindow(events, 'all', 'all', 0)).toEqual({ count: events.length, displayed: [] });
  for (const limit of [-1, 1.5, NaN, Infinity]) expect(() => selectHistoryWindow([], 'all', 'all', limit)).toThrow('window');
});
