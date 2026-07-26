export type StoredStateSource = "primary" | "recovery" | "default";

export type StoredStateResult<T> = {
  state: T;
  source: StoredStateSource;
};

type SelectStoredStateOptions<T> = {
  primaryRaw: string | null;
  readRecoveryRaw: () => string | null;
  deserialize: (raw: string) => T;
  fallback: T;
  onPrimaryCorrupt?: (raw: string) => void;
};

/**
 * Selects the startup snapshot without reviving an intentionally removed
 * primary value. Recovery is only eligible when a primary snapshot exists but
 * cannot be decoded.
 */
export const selectStoredState = <T>({
  primaryRaw,
  readRecoveryRaw,
  deserialize,
  fallback,
  onPrimaryCorrupt,
}: SelectStoredStateOptions<T>): StoredStateResult<T> => {
  if (!primaryRaw) return { state: fallback, source: "default" };

  try {
    return { state: deserialize(primaryRaw), source: "primary" };
  } catch {
    onPrimaryCorrupt?.(primaryRaw);
    const recoveryRaw = readRecoveryRaw();
    if (recoveryRaw) {
      try {
        return { state: deserialize(recoveryRaw), source: "recovery" };
      } catch {
        // A corrupt recovery never replaces the known-safe fallback.
      }
    }
    return { state: fallback, source: "default" };
  }
};
