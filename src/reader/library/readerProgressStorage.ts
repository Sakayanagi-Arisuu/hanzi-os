import {
  LEARNING_OWNER_STORAGE_KEY,
  readLocalStorage,
  writeLocalStorage,
} from "../../lib/storageKeys";
import {
  readActiveOwnerLearningScope,
} from "../../sync/indexedDb";
import {
  createEmptyReaderProgress,
  parseReaderProgress,
  type ReaderProgressDocument,
  type ReaderProgressScope,
} from "./readerProgress";

export const READER_PROGRESS_STORAGE_PREFIX = "hanzi-os-reader-progress-v2";
export const READER_PROGRESS_LEGACY_STORAGE_KEY = "hanzi-os-reader-progress-v1";

export const readerProgressStorageKey = (scope: ReaderProgressScope) =>
  `${READER_PROGRESS_STORAGE_PREFIX}:${encodeURIComponent(scope.ownerKey)}:${scope.ownerGeneration}:${scope.resetEpoch}`;

export const initialReaderProgressScope = (
  preferredOwnerKey = "",
): ReaderProgressScope => ({
  ownerKey: preferredOwnerKey
    || readLocalStorage(LEARNING_OWNER_STORAGE_KEY)
    || "anonymous:reader-bootstrap",
  ownerGeneration: 0,
  resetEpoch: 0,
});

const parseStoredValue = (
  raw: string | null,
  scope: ReaderProgressScope,
) => {
  if (!raw) return null;
  try {
    return parseReaderProgress(JSON.parse(raw), scope);
  } catch {
    return createEmptyReaderProgress(scope);
  }
};

export const readReaderProgress = (
  scope: ReaderProgressScope,
): ReaderProgressDocument => {
  const current = parseStoredValue(
    readLocalStorage(readerProgressStorageKey(scope)),
    scope,
  );
  if (current) return current;
  const legacy = parseStoredValue(
    readLocalStorage(READER_PROGRESS_LEGACY_STORAGE_KEY),
    scope,
  );
  return legacy ?? createEmptyReaderProgress(scope);
};

export const writeReaderProgress = (document: ReaderProgressDocument) =>
  writeLocalStorage(
    readerProgressStorageKey(document),
    JSON.stringify(document),
  );

export const resolveReaderProgressScope = async (
  fallback: ReaderProgressScope,
) => {
  try {
    const active = await readActiveOwnerLearningScope();
    if (!active || active.ownerGeneration.ownerKey !== fallback.ownerKey) return fallback;
    return {
      ownerKey: active.ownerGeneration.ownerKey,
      ownerGeneration: active.ownerGeneration.generation,
      resetEpoch: active.resetEpoch,
    } satisfies ReaderProgressScope;
  } catch {
    return fallback;
  }
};

export const adoptReaderProgressScope = (
  document: ReaderProgressDocument,
  scope: ReaderProgressScope,
): ReaderProgressDocument => ({
  ...document,
  ...scope,
  schemaVersion: 2,
  updatedAt: new Date().toISOString(),
});
