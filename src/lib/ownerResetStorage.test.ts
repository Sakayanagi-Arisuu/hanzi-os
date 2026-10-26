import { expect, it } from 'vitest';
import { isOwnerResetStorageKey } from './ownerResetStorage';
import { getCharacterForgeSessionStorageKey, getOwnedPlacementStorageKey, HSK1_LEVEL_CHECK_SESSION_STORAGE_KEY } from './storageKeys';
it('clears only the active owner sessions while preserving another profile, backups and settings', () => {
  expect(isOwnerResetStorageKey(getCharacterForgeSessionStorageKey('a'), 'a')).toBe(true);
  expect(isOwnerResetStorageKey(getOwnedPlacementStorageKey(HSK1_LEVEL_CHECK_SESSION_STORAGE_KEY, 'a'), 'a')).toBe(true);
  for (const key of [getCharacterForgeSessionStorageKey('b'), getOwnedPlacementStorageKey(HSK1_LEVEL_CHECK_SESSION_STORAGE_KEY, 'b'),
    'hanzi-os-learning-state-v1-recovery', 'hanzi-os-learning-state-v1-corrupt', 'hanzi-os-system-preferences-v1',
    'hanzi-os-reader-progress-v2:b:1:0']) expect(isOwnerResetStorageKey(key, 'a')).toBe(false);
});
