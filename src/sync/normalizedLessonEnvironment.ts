import {
  readLocalStorage,
  SYNC_DEVICE_STORAGE_KEY,
  SYNC_INSTALLATION_STORAGE_KEY,
} from "../lib/storageKeys";
import type { NormalizedLessonQueueEnvironment } from "../learning/normalizedLessonCommands";
import {
  readActiveOwnerLearningScope,
  type OwnerGeneration,
} from "./indexedDb";

const boundedIdentifier = (value: string | null): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 160;

export type ReadExactNormalizedLessonEnvironmentInput = {
  accountKey: string;
  expectedOwnerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
};

/**
 * Re-reads every mutable browser identity fence immediately before a command
 * is enqueued. Callers must not reuse an environment after an await that can
 * switch owners or reset learning data.
 */
export async function readExactNormalizedLessonEnvironment(
  input: ReadExactNormalizedLessonEnvironmentInput,
): Promise<NormalizedLessonQueueEnvironment | null> {
  if (
    !input.accountKey
    || input.accountKey !== input.expectedOwnerGeneration.ownerKey
    || !Number.isSafeInteger(input.expectedOwnerGeneration.generation)
    || input.expectedOwnerGeneration.generation < 1
    || !Number.isSafeInteger(input.expectedResetEpoch)
    || input.expectedResetEpoch < 0
  ) return null;

  const scope = await readActiveOwnerLearningScope();
  if (
    !scope
    || scope.ownerGeneration.ownerKey !== input.accountKey
    || scope.ownerGeneration.generation
      !== input.expectedOwnerGeneration.generation
    || scope.resetEpoch !== input.expectedResetEpoch
  ) return null;

  const installationId = readLocalStorage(SYNC_INSTALLATION_STORAGE_KEY);
  const deviceId = readLocalStorage(SYNC_DEVICE_STORAGE_KEY);
  if (!boundedIdentifier(installationId) || !boundedIdentifier(deviceId)) {
    return null;
  }

  return {
    ownerGeneration: scope.ownerGeneration,
    resetEpoch: scope.resetEpoch,
    installationId,
    deviceId,
  };
}
