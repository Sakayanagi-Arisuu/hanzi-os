/** Route-local sessions belong to an owner generation/reset, never to a progress cursor. */
export function learnerRuntimeScopeKey(ownerKey: string, generation: number | null, resetEpoch: number | null) {
  return JSON.stringify([ownerKey, generation, resetEpoch]);
}
