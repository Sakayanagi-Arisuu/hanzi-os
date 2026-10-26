export const HISTORY_COOPERATIVE_THRESHOLD = 2_000;
const BATCH_SIZE = 500;

export async function yieldHistoryWork(): Promise<void> {
  const scheduler = (globalThis as unknown as { scheduler?: { yield?: () => Promise<unknown> } }).scheduler;
  if (typeof scheduler?.yield === 'function') await scheduler.yield();
  else await new Promise<void>(resolve => setTimeout(resolve, 0));
}

/** Process an owned read snapshot without monopolizing the UI event loop. */
export async function forEachHistoryBatch(length: number, visit: (index: number) => void,
  yieldWork: () => Promise<void> = yieldHistoryWork): Promise<void> {
  for (let start = 0; start < length; start += BATCH_SIZE) {
    const end = Math.min(length, start + BATCH_SIZE);
    for (let index = start; index < end; index++) visit(index);
    if (end < length) await yieldWork();
  }
}
