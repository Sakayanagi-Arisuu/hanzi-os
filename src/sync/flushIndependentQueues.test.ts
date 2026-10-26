import { expect, it, vi } from 'vitest';
import { flushIndependentQueues } from './flushIndependentQueues';
it('continues mock and reader synchronization when the reward service fails, while reporting retained failures', async () => {
  const xp = vi.fn().mockRejectedValue(new Error('XP unavailable'));
  const mock = vi.fn().mockRejectedValue(new Error('Exam unavailable'));
  const reader = vi.fn().mockResolvedValue(undefined);
  await expect(flushIndependentQueues([xp, mock, reader])).rejects.toBeInstanceOf(AggregateError);
  expect(reader).toHaveBeenCalledOnce();
  expect(mock).toHaveBeenCalledOnce();
  await expect(flushIndependentQueues([reader])).resolves.toBeUndefined();
});
