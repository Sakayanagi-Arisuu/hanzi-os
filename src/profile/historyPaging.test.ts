import { expect, it } from 'vitest';
import { advanceHistoryPage as advance, emptyHistoryPage as empty, hasMoreHistory as more, nextHistoryCursor as next } from './historyPaging';

const cursor = (attemptId: string) => ({ receivedAt: 200, attemptId });
const page = (ids: string[], after: string | null) => ({ events: ids.map(eventId => ({ eventId })), nextCursor: after === null ? null : cursor(after) });

it('does not reopen exhausted history when focus refreshes the first page', () => {
  let state = advance(empty(), page(['a3', 'a2'], 'older'), 'refresh');
  state = advance(state, page(['a1'], null), 'more');
  expect(more(state)).toBe(false);
  state = advance(state, page(['a3', 'a2'], 'older'), 'refresh');
  expect(next(state)).toBeNull(); expect(more(state)).toBe(false);
});

it('keeps the older frontier after a refresh with a few new events', () => {
  let state = advance(empty(), page(['a3', 'a2'], 'older'), 'refresh');
  state = advance(state, page(['a1'], 'oldest'), 'more');
  state = advance(state, page(['a4', 'a3'], 'head'), 'refresh');
  expect(next(state)).toEqual(cursor('oldest'));
});

it('fills an entirely new head range before resuming older loaded history', () => {
  let state = advance(empty(), page(['a3', 'a2'], 'older'), 'refresh');
  state = advance(state, page(['b3', 'b2'], 'bridge'), 'refresh');
  expect(next(state)).toEqual(cursor('bridge'));
  state = advance(state, page(['b1', 'a3'], 'bridge-end'), 'more');
  expect(next(state)).toEqual(cursor('older')); expect(state.gaps).toHaveLength(0);
});

it('does not discard an unfilled range when focus refreshes the same head again', () => {
  let state = advance(empty(), page(['a3'], 'older'), 'refresh');
  state = advance(state, page(['b3'], 'bridge'), 'refresh');
  state = advance(state, page(['b3'], 'bridge'), 'refresh');
  expect(next(state)).toEqual(cursor('bridge')); expect(state.gaps).toHaveLength(1);
});

it('joins multiple new head windows without skipping an intermediate range', () => {
  let state = advance(empty(), page(['a3'], 'older'), 'refresh');
  state = advance(state, page(['b3'], 'b-to-a'), 'refresh');
  state = advance(state, page(['c3'], 'c-to-b'), 'refresh');
  expect(state.gaps).toHaveLength(2); expect(next(state)).toEqual(cursor('c-to-b'));
  state = advance(state, page(['c2'], 'c-page2'), 'more');
  expect(next(state)).toEqual(cursor('c-page2'));
  state = advance(state, page(['b3'], 'c-joined'), 'more');
  expect(next(state)).toEqual(cursor('b-to-a'));
  state = advance(state, page(['a3'], 'b-joined'), 'more');
  expect(next(state)).toEqual(cursor('older'));
});

it('closes a pending range when a head refresh already reaches its join', () => {
  let state = advance(empty(), page(['a3'], 'older'), 'refresh');
  state = advance(state, page(['b3'], 'bridge'), 'refresh');
  state = advance(state, page(['b3', 'a3'], 'head'), 'refresh');
  expect(state.gaps).toHaveLength(0); expect(next(state)).toEqual(cursor('older'));
});

it('stops at the server end even when a previously seen join has disappeared', () => {
  let state = advance(empty(), page(['a3'], 'older'), 'refresh');
  state = advance(state, page(['b3'], 'bridge'), 'refresh');
  state = advance(state, page(['b2'], null), 'more');
  expect(next(state)).toBeNull(); expect(state.gaps).toHaveLength(0);
});

it('can page new history after an initially empty source', () => {
  let state = advance(empty(), page([], null), 'refresh');
  state = advance(state, page(['new3'], 'older'), 'refresh');
  expect(next(state)).toEqual(cursor('older'));
});

it('rejects a stalled cursor without mutating the retry position', () => {
  const state = advance(empty(), page(['a3'], 'same'), 'refresh');
  expect(() => advance(state, page(['a3'], 'same'), 'more')).toThrow('no progress');
  expect(next(state)).toEqual(cursor('same'));
});

it('retains the known frontier when a head refresh is temporarily empty', () => {
  const state = advance(empty(), page(['a3'], 'older'), 'refresh');
  expect(advance(state, page([], null), 'refresh')).toBe(state);
});

it('returns to the exhausted frontier after loading new events since the last visit', () => {
  let state = advance(empty(), page(['a3', 'a2'], 'older'), 'refresh');
  state = advance(state, page(['a1'], null), 'more');
  state = advance(state, page(['b3', 'b2'], 'bridge'), 'refresh');
  expect(more(state)).toBe(true);
  state = advance(state, page(['b1', 'a3'], 'joined'), 'more');
  expect(more(state)).toBe(false); expect(next(state)).toBeNull();
});

it('anchors the first valid event found after an empty initial page', () => {
  let state = advance(empty(), page([], 'older'), 'refresh');
  state = advance(state, page(['a1'], null), 'more');
  expect(state.headEventId).toBe('a1');
  state = advance(state, page([], 'older'), 'refresh');
  expect(more(state)).toBe(false);
});

it('keeps source frontiers independent and never mutates page events or prior cursors', () => {
  const lesson = advance(empty(), page(['lesson3'], 'lesson-older'), 'refresh');
  let activity = advance(empty(), page(['a3'], 'older'), 'refresh');
  activity = advance(activity, page(['b3'], 'bridge'), 'refresh');
  const original = structuredClone(activity), received = page(['b2'], 'bridge2');
  Object.freeze(activity.gaps[0]); Object.freeze(activity.gaps); Object.freeze(activity);
  Object.freeze(received.events[0]); Object.freeze(received.events); Object.freeze(received.nextCursor); Object.freeze(received);
  const result = advance(activity, received, 'more');
  expect(activity).toEqual(original); expect(result).not.toBe(activity);
  expect(next(result)).toEqual(cursor('bridge2')); expect(next(lesson)).toEqual(cursor('lesson-older'));
});
