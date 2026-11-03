import { afterEach, expect, it, vi } from 'vitest';
import { withLearningReadDeadline, LEARNING_READ_TIMEOUT_MS } from './learningReadDeadline';
import { fetchNormalizedLearningProjection, fetchNormalizedLearningProjectionV2,
  fetchNormalizedLearningProjectionV3, fetchNormalizedLearningProjectionV4 } from './learningProjectionClient';
import { fetchReviewQueue } from './reviewQueueClient';

vi.mock('./indexedDb', () => ({
  readLearningProjection: vi.fn(async () => null),
  writeLearningProjection: vi.fn(),
  writeLearningProjectionBatchWithMonotonicCursor: vi.fn(),
}));

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const readers = [fetchNormalizedLearningProjection, fetchNormalizedLearningProjectionV2,
  fetchNormalizedLearningProjectionV3, fetchNormalizedLearningProjectionV4, fetchReviewQueue];
const abortable = (signal: AbortSignal) => new Promise<never>((_resolve, reject) => {
  signal.throwIfAborted();
  signal.addEventListener('abort', () => reject(signal.reason), { once: true });
});
const input = { expectedOwnerGeneration: { ownerKey: 'test-owner', generation: 1 },
  expectedResetEpoch: 0, origin: 'http://localhost' };

it.each(readers)('ends a stalled %s network read within the deadline', async reader => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', {});
  let signal: AbortSignal | undefined;
  const fetcher = vi.fn((_url: unknown, init?: RequestInit) => {
    signal = init?.signal ?? undefined;
    return signal ? abortable(signal) : new Promise<Response>(() => undefined);
  });
  let outcome: unknown;
  const pending = reader({ ...input, fetch: fetcher as typeof fetch }).then(value => { outcome = value; });
  await vi.advanceTimersByTimeAsync(LEARNING_READ_TIMEOUT_MS);
  expect(signal?.aborted).toBe(true);
  expect(outcome).toMatchObject({ state: 'retryable', reason: 'network-unavailable' });
  await pending;
  expect(vi.getTimerCount()).toBe(0);
});

it.each(readers.slice(0, 4))('cancels %s while another tab holds the projection lock', async reader => {
  vi.useFakeTimers();
  const fetcher = vi.fn();
  const request = vi.fn((_name: string, options: LockOptions) => abortable(options.signal!));
  vi.stubGlobal('navigator', { locks: { request } });
  const controller = new AbortController();
  const pending = reader({ ...input, signal: controller.signal, fetch: fetcher });
  controller.abort();
  await expect(pending).resolves.toMatchObject({ state: 'retryable', reason: 'network-unavailable' });
  expect(fetcher).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(readers.slice(0, 4))('times out %s waiting for a lock without starting a fetch', async reader => {
  vi.useFakeTimers();
  const fetcher = vi.fn();
  vi.stubGlobal('navigator', { locks: {
    request: (_name: string, options: LockOptions) => abortable(options.signal!),
  } });
  let outcome: unknown;
  const pending = reader({ ...input, fetch: fetcher }).then(value => { outcome = value; });
  await vi.advanceTimersByTimeAsync(LEARNING_READ_TIMEOUT_MS);
  expect(outcome).toMatchObject({ state: 'retryable', reason: 'network-unavailable' });
  await pending;
  expect(fetcher).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it('does not hide ownership/storage failures and cleans the timer on success or failure', async () => {
  vi.useFakeTimers();
  await expect(withLearningReadDeadline(undefined, async () => 'ready', () => 'retry')).resolves.toBe('ready');
  const error = new Error('owner changed');
  await expect(withLearningReadDeadline(undefined, async () => { throw error; }, () => 'retry')).rejects.toBe(error);
  expect(vi.getTimerCount()).toBe(0);
});
