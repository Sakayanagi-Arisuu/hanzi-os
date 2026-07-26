import {
  readActiveOwnerLearningScope,
  StaleOwnerGenerationError,
  type ActiveOwnerLearningScope,
  type OwnerScopedCacheScope,
} from "./indexedDb";

export const resolveLearningResumeOwnerScope = async (
  expectedOwnerKey: string,
): Promise<ActiveOwnerLearningScope> => {
  const scope = await readActiveOwnerLearningScope();
  if (!scope || scope.ownerGeneration.ownerKey !== expectedOwnerKey) {
    throw new StaleOwnerGenerationError();
  }
  return scope;
};

export const lessonResumeEntryKey = ({
  lessonId,
  contentVersion,
  script,
}: {
  lessonId: string;
  contentVersion: string;
  script: "simplified" | "traditional";
}) => `lesson:v5:${JSON.stringify([lessonId, contentVersion, script])}`;

export const assessmentResumeEntryKey = ({
  blueprintId,
  formVersion,
}: {
  blueprintId: string;
  formVersion: string;
}) => `assessment:v4:${JSON.stringify([blueprintId, formVersion])}`;

export const ownerScopedResumeCacheScope = (
  scope: ActiveOwnerLearningScope,
  entryKey: string,
): OwnerScopedCacheScope => ({
  expectedOwnerGeneration: scope.ownerGeneration,
  resetEpoch: scope.resetEpoch,
  entryKey,
});

export const isStaleLearningResumeError = (error: unknown) =>
  error instanceof StaleOwnerGenerationError;

export const reportLearningResumeStorageError = (error: unknown) => {
  if (isStaleLearningResumeError(error)) return;
  queueMicrotask(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hanzi-storage-error"));
    }
  });
};
