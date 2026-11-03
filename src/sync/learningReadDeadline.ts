/** Bound network reads and time spent waiting for another tab's read lock. */
export const LEARNING_READ_TIMEOUT_MS = 15_000;

export async function withLearningReadDeadline<T>(
  callerSignal: AbortSignal | undefined,
  read: (signal: AbortSignal) => Promise<T>,
  unavailable: () => T,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(callerSignal?.reason);
  callerSignal?.addEventListener('abort', cancel, { once: true });
  if (callerSignal?.aborted) cancel();
  const timer = setTimeout(() => controller.abort(new DOMException(
    'Learning read timed out', 'TimeoutError',
  )), LEARNING_READ_TIMEOUT_MS);
  try {
    controller.signal.throwIfAborted();
    return await read(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) return unavailable();
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', cancel);
  }
}
