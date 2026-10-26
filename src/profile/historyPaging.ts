import type { LessonHistoryPageV1 } from '../learning/lessonHistory';

type HistoryCursor = NonNullable<LessonHistoryPageV1['nextCursor']>;
export type HistoryLoadMode = 'refresh' | 'more';
export type HistoryPageState = {
  started: boolean;
  cursor: HistoryCursor | null;
  headEventId: string | null;
  gaps: { cursor: HistoryCursor; joinEventId: string }[];
};
type Page = { events: readonly { eventId: string }[]; nextCursor: HistoryCursor | null };

export const emptyHistoryPage = (): HistoryPageState => ({ started: false, cursor: null, headEventId: null, gaps: [] });
export const nextHistoryCursor = (state: HistoryPageState) => state.gaps.at(-1)?.cursor ?? state.cursor;
export const hasMoreHistory = (state: HistoryPageState) => !state.started || nextHistoryCursor(state) !== null;
const sameCursor = (a: HistoryCursor | null, b: HistoryCursor | null) => a !== null && b !== null
  && a.receivedAt === b.receivedAt && a.attemptId === b.attemptId;

/** Refreshing recent rows must not rewind the cursor for older history. */
export function advanceHistoryPage(state: HistoryPageState, page: Page, mode: HistoryLoadMode): HistoryPageState {
  if (mode === 'more' && state.started && sameCursor(nextHistoryCursor(state), page.nextCursor)) {
    throw Error('History cursor made no progress');
  }
  if (!state.started || mode === 'refresh' && state.headEventId === null) return {
    started: true, cursor: page.nextCursor, headEventId: page.events[0]?.eventId ?? null, gaps: [],
  };
  const ids = new Set(page.events.map(event => event.eventId));
  const covered = state.gaps.findIndex(gap => ids.has(gap.joinEventId));
  const gaps = covered < 0 ? [...state.gaps] : state.gaps.slice(0, covered);
  if (mode === 'refresh') {
    if (!page.events.length) return state;
    if (page.nextCursor === null) return { started: true, cursor: null, headEventId: page.events[0].eventId, gaps: [] };
    // More than one page may arrive between visits. Fill that new range before
    // resuming the older cursor; later refreshes must retain earlier gaps too.
    if (!ids.has(state.headEventId!)) gaps.push({ cursor: page.nextCursor, joinEventId: state.headEventId! });
    return { ...state, headEventId: page.events[0].eventId, gaps };
  }
  const headEventId = state.headEventId ?? page.events[0]?.eventId ?? null;
  if (page.nextCursor === null) return { ...state, headEventId, cursor: null, gaps: [] };
  if (state.gaps.length) {
    if (covered < 0) gaps[gaps.length - 1] = { ...gaps[gaps.length - 1], cursor: page.nextCursor };
    return { ...state, headEventId, gaps };
  }
  return { ...state, headEventId, cursor: page.nextCursor };
}
