type DictionaryIdentity = { id: string; sourceStableKey?: string };

/** Explicit source links must resolve to that entry, never a nearby result. */
export function selectDictionaryEntry<T extends DictionaryIdentity>(input: {
  words: readonly T[]; results: readonly T[]; detail: boolean;
  requestedWordId: string | null; selectedId: string;
}): T | undefined {
  const candidates = input.detail ? input.words : input.results;
  if (input.requestedWordId !== null) {
    const exact = candidates.find(word => word.id === input.requestedWordId);
    if (exact) return exact;
    const aliases = candidates.filter(word => word.sourceStableKey === input.requestedWordId);
    if (aliases.length === 1) return aliases[0];
    if (input.detail) return undefined;
  }
  return input.results.find(word => word.id === input.selectedId) ?? input.results[0];
}
