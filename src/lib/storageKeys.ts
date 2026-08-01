export const LEARNING_STORAGE_KEY = "hanzi-os-learning-state-v1";
export const LEARNING_RECOVERY_STORAGE_KEY = `${LEARNING_STORAGE_KEY}-recovery`;
export const LEARNING_CORRUPT_STORAGE_KEY = `${LEARNING_STORAGE_KEY}-corrupt`;
export const LEARNING_OWNERSHIP_QUARANTINE_STORAGE_KEY =
  `${LEARNING_STORAGE_KEY}-ownership-quarantine`;
export const LEARNING_OWNER_STORAGE_KEY = "hanzi-os-learning-owner-v1";
export const SYNC_INSTALLATION_STORAGE_KEY = "hanzi-os-sync-installation-v1";
export const SYNC_DEVICE_STORAGE_KEY = "hanzi-os-sync-device-v1";
export const LESSON_SESSION_STORAGE_PREFIX = "hanzi-os-lesson-session-v4:";
const LESSON_SESSION_STORAGE_FAMILY_PREFIX = "hanzi-os-lesson-session-v";
export const ASSESSMENT_SESSION_STORAGE_KEY = "hanzi-os-assessment-session-v1";
export const HSK1_LEVEL_CHECK_SESSION_STORAGE_KEY =
  "hanzi-os-hsk1-level-check-session-v1";
export const HSK2_LEVEL_CHECK_SESSION_STORAGE_KEY =
  "hanzi-os-hsk2-level-check-session-v1";
export const HSK3_LEVEL_CHECK_SESSION_STORAGE_KEY =
  "hanzi-os-hsk3-level-check-session-v1";
export const HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY =
  "hanzi-os-hsk4-level-check-session-v1";

export const isLegacyLearningResumeStorageKey = (key: string) =>
  key === ASSESSMENT_SESSION_STORAGE_KEY
  || key.startsWith(LESSON_SESSION_STORAGE_FAMILY_PREFIX);

export const isLearningProgressStorageKey = (key: string) =>
  key === LEARNING_STORAGE_KEY
  || key === LEARNING_RECOVERY_STORAGE_KEY
  || key === LEARNING_CORRUPT_STORAGE_KEY
  || key === LEARNING_OWNERSHIP_QUARANTINE_STORAGE_KEY
  || key === LEARNING_OWNER_STORAGE_KEY
  || key === HSK1_LEVEL_CHECK_SESSION_STORAGE_KEY
  || key === HSK2_LEVEL_CHECK_SESSION_STORAGE_KEY
  || key === HSK3_LEVEL_CHECK_SESSION_STORAGE_KEY
  || key === HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY
  || isLegacyLearningResumeStorageKey(key);

export const isHanziOsStorageKey = (key: string) => key.startsWith("hanzi-os-");

const reportStorageError = () => {
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent("hanzi-storage-error"));
  });
};

export const writeLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    reportStorageError();
    return false;
  }
};

export const removeLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    reportStorageError();
    return false;
  }
};

/**
 * Discards legacy global lesson/assessment resumes. They intentionally are not
 * migrated because no trustworthy owner can be assigned to those records.
 */
export const removeLegacyLearningResumeStorage = () => {
  try {
    const keys = Array.from(
      { length: localStorage.length },
      (_, index) => localStorage.key(index),
    ).filter((key): key is string => key !== null);
    keys.filter(isLegacyLearningResumeStorageKey).forEach((key) => {
      localStorage.removeItem(key);
    });
    return true;
  } catch {
    reportStorageError();
    return false;
  }
};

export const readLocalStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    reportStorageError();
    return null;
  }
};

export const getOrCreateLocalIdentifier = (
  key: string,
  prefix: string,
): string => {
  const existing = readLocalStorage(key);
  if (existing) return existing;

  const random = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const identifier = `${prefix}_${random}`;
  writeLocalStorage(key, identifier);
  return identifier;
};
