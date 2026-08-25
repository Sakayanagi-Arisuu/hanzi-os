import type {
  ReaderParagraph,
  ReaderParagraphSegment,
} from "./readerContentModel";
import {
  createReaderLookupEntry,
  READER_REFERENCE_ENTRY_BY_SIMPLIFIED,
  type ReaderReferenceEntry,
} from "./readerLexicon";

const TOKEN_PATTERN = /\[\[([^\]]+)\]\]/gu;
const HAN_RUN_PATTERN = /\p{Script=Han}+/gu;

const pushToken = (
  segments: ReaderParagraphSegment[],
  entry: ReaderReferenceEntry,
) => {
  segments.push({
    kind: "token",
    sequence: segments.length,
    surface: entry.simplified,
    ...(entry.lexemeId
      ? { lexemeId: entry.lexemeId }
      : { referenceEntryId: entry.entryId }),
  });
};

const pushText = (segments: ReaderParagraphSegment[], text: string) => {
  if (!text) return;
  const previous = segments.at(-1);
  if (previous?.kind === "text") {
    previous.text += text;
    return;
  }
  segments.push({ kind: "text", sequence: segments.length, text });
};

const pushLookupableText = (
  segments: ReaderParagraphSegment[],
  text: string,
) => {
  let cursor = 0;
  HAN_RUN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HAN_RUN_PATTERN.exec(text)) !== null) {
    pushText(segments, text.slice(cursor, match.index));
    const run = match[0];
    [...run].forEach((surface) => {
      const entry = READER_REFERENCE_ENTRY_BY_SIMPLIFIED.get(surface)
        ?? createReaderLookupEntry(surface);
      pushToken(segments, entry);
    });
    cursor = match.index + run.length;
  }
  pushText(segments, text.slice(cursor));
};

export const authorReaderParagraph = ({
  paragraphId,
  markedZhHans,
  pinyin,
  vi,
}: {
  paragraphId: string;
  markedZhHans: string;
  pinyin: string;
  vi: string;
}): ReaderParagraph => {
  const segments: ReaderParagraphSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(markedZhHans)) !== null) {
    const plain = markedZhHans.slice(cursor, match.index);
    pushLookupableText(segments, plain);
    const surface = match[1] ?? "";
    pushLookupableText(segments, surface);
    cursor = match.index + match[0].length;
  }
  const tail = markedZhHans.slice(cursor);
  pushLookupableText(segments, tail);
  const zhHans = segments.map((segment) =>
    segment.kind === "token" ? segment.surface : segment.text
  ).join("");
  if (!zhHans || !vi || !pinyin || segments.length === 0) {
    throw new Error(`Reader paragraph ${paragraphId} is incomplete.`);
  }
  return { paragraphId, zhHans, pinyin, vi, segments };
};
