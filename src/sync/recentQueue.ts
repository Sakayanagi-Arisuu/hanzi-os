/** Short-lived, in-memory reuse only. Never promotes a disk cache to authority. */
export function createRecentQueue<T>(maxAgeMs = 60_000) {
  let entry: { key: string; value: T; at: number } | null = null;
  return {
    read(key: string | null, now = Date.now()): T | null {
      if (!key || !entry || entry.key !== key || now < entry.at || now - entry.at >= maxAgeMs) return null;
      return entry.value;
    },
    write(key: string | null, value: T, now = Date.now()) {
      if (key) entry = { key, value, at: now };
    },
    clear() { entry = null; },
  };
}
