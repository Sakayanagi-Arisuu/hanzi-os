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
  legacy = false,
) => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ReaderProgressDocument>;
    if (legacy && value?.ownerKey !== scope.ownerKey) return null;
    if (!value || ![1, 2].includes(Number(value.schemaVersion)) || value.ownerKey !== scope.ownerKey) throw new Error('Unsupported reader progress');
    if (value.schemaVersion === 2 && (value.ownerGeneration !== scope.ownerGeneration || value.resetEpoch !== scope.resetEpoch
      || !value.chapters || typeof value.chapters !== 'object' || Array.isArray(value.chapters)
      || value.savedEntries !== undefined && (!value.savedEntries || typeof value.savedEntries !== 'object')
      || value.supportEvents !== undefined && !Array.isArray(value.supportEvents))) throw new Error('Unreadable reader scope');
    const document = parseReaderProgress(value, scope, new Date().toISOString(), true);
    if (value.schemaVersion === 2 && (
      Object.keys(value.chapters!).length > 0 && Object.keys(document.chapters).length === 0
      || Object.keys(value.savedEntries ?? {}).length > 0 && Object.keys(document.savedEntries).length === 0
      || (value.supportEvents?.length ?? 0) > 0 && document.supportEvents.length === 0)) throw new Error('Unreadable reader data');
    return document;
  } catch {
    throw new Error('Không đọc được dữ liệu Reader. Bản gốc được giữ để khôi phục; không ghi đè bằng dữ liệu rỗng.');
  }
};

export const readReaderProgress = (
  scope: ReaderProgressScope,
): ReaderProgressDocument => {
  const current = parseStoredValue(
    readReaderStorage(readerProgressStorageKey(scope)),
    scope,
  );
  if (current) return current;
  const legacy = parseStoredValue(
    readReaderStorage(READER_PROGRESS_LEGACY_STORAGE_KEY),
    scope,
    true,
  );
  return legacy ?? createEmptyReaderProgress(scope);
};

function readReaderStorage(key: string) {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key); }
  catch { throw new Error('Chưa đọc được kho Reader. Dữ liệu cũ không bị thay thế.'); }
}

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
