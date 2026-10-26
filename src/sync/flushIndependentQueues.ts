/** A failed service must not starve unrelated durable journals on reconnect. */
export async function flushIndependentQueues(tasks: ReadonlyArray<() => Promise<unknown>>) {
  const failures: unknown[] = [];
  for (const task of tasks) {
    try { await task(); } catch (error) { failures.push(error); }
  }
  if (failures.length) throw new AggregateError(failures, 'Some learning queues remain pending');
}
