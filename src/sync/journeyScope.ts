import { readActiveOwnerLearningScope } from './indexedDb';

export async function readJourneyScope(ownerKey: string, expectedResetEpoch: number | null = null) {
  const scope = await readActiveOwnerLearningScope();
  if (!scope || scope.ownerGeneration.ownerKey !== ownerKey || expectedResetEpoch !== null && scope.resetEpoch !== expectedResetEpoch) return null;
  return { ...scope, scopeKey: `${ownerKey}:${scope.resetEpoch}` };
}
