import { expect, it } from 'vitest';
import { learnerRuntimeScopeKey } from './learnerRuntimeScope';
it('separates local UI sessions across account switches, reused owners and resets', () => {
  const initial = learnerRuntimeScopeKey('account:a', 1, 0);
  expect(learnerRuntimeScopeKey('account:a', 1, 0)).toBe(initial);
  expect(new Set([initial, learnerRuntimeScopeKey('account:b', 1, 0),
    learnerRuntimeScopeKey('account:a', 2, 0), learnerRuntimeScopeKey('account:a', 1, 1)]).size).toBe(4);
});
