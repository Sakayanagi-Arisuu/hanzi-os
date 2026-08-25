import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { MegaVocabularyItem } from "../content/megaLexicon";
import {
  MEGA_LEXICON_LOOKUP_SHARD_COUNT,
  MEGA_LEXICON_VERSION,
} from "../content/megaLexicon";
import { READER_REFERENCE_ENTRY_BY_SIMPLIFIED } from "../reader/library/readerLexicon";

const shardCache = new Map<string, Promise<MegaVocabularyItem[]>>();

const shardId = (surface: string) => String(
  (surface.codePointAt(0) ?? 0) % MEGA_LEXICON_LOOKUP_SHARD_COUNT,
).padStart(2, "0");

const loadShard = (id: string) => {
  const cached = shardCache.get(id);
  if (cached) return cached;
  const pending = readFile(resolve(
    process.cwd(),
    "public",
    "content",
    MEGA_LEXICON_VERSION,
    `lookup-${id}.json`,
  ), "utf8").then((source) => {
    const artifact = JSON.parse(source) as {
      schemaVersion: number;
      contentVersion: string;
      bucket: string;
      entries: MegaVocabularyItem[];
    };
    if (
      artifact.schemaVersion !== 1
      || artifact.contentVersion !== MEGA_LEXICON_VERSION
      || artifact.bucket !== id
      || !Array.isArray(artifact.entries)
    ) throw new Error("Mảnh Tàng Tự Khố không hợp lệ khi quét bản thảo.");
    return artifact.entries;
  }).catch((error: unknown) => {
    shardCache.delete(id);
    throw error;
  });
  shardCache.set(id, pending);
  return pending;
};

export const lookupEditorialReaderSurface = async (surface: string) => {
  const direct = READER_REFERENCE_ENTRY_BY_SIMPLIFIED.get(surface);
  if (direct && direct.sourceType !== "reader-character-fallback") return true;
  const entries = await loadShard(shardId(surface));
  return entries.some((entry) => entry.simplified === surface);
};
