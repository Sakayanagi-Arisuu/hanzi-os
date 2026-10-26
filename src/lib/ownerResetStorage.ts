import { getCharacterForgeSessionStorageKey, getOwnedPlacementStorageKey, getPlacementGateSessionStorageKey, HSK_LEVEL_CHECK_SESSION_STORAGE_KEYS } from './storageKeys';

/** Reset the selected learner's unversioned sessions; keep other owners and shared assets. */
export function isOwnerResetStorageKey(key: string, ownerKey: string) {
  return key === getCharacterForgeSessionStorageKey(ownerKey)
    || HSK_LEVEL_CHECK_SESSION_STORAGE_KEYS.some(base => key === getOwnedPlacementStorageKey(base, ownerKey)
      || key === getOwnedPlacementStorageKey(getPlacementGateSessionStorageKey(base), ownerKey));
}
