const fnv1a = (value: string, seed: number) => {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

export const studioGradedTextSeriesId = (stableKey: string) =>
  `studio-text-${fnv1a(stableKey, 0x811c9dc5)}${fnv1a(`hanzi-os:${stableKey}`, 0x9e3779b9)}`;

export const isStudioGradedTextSeriesId = (value: unknown): value is string =>
  typeof value === "string" && /^studio-text-[0-9a-f]{16}$/u.test(value);
