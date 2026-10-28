import type { HistoryModule, LessonHistoryEventV1 } from '../learning/lessonHistory';

/** Keep only the requested display window; counting matches must not allocate
 * another array proportional to the complete loaded history. */
export function selectHistoryWindow(events: readonly LessonHistoryEventV1[], module: HistoryModule | 'all', skill: string, limit: number) {
  if (!Number.isSafeInteger(limit) || limit < 0) throw Error('Invalid history display window');
  const displayed: LessonHistoryEventV1[] = [];
  let count = 0;
  for (const event of events) {
    if ((module !== 'all' && event.module !== module) || (skill !== 'all' && (skill === 'unknown' ? event.skill !== null : event.skill !== skill))) continue;
    count++;
    if (displayed.length < limit) displayed.push(event);
  }
  return { count, displayed };
}
