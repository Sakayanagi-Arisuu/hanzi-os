import type {
  ReaderParagraph,
  ReaderParagraphSegment,
} from "./readerContentModel";
import { READER_REFERENCE_ENTRY_BY_SIMPLIFIED } from "./readerLexicon";

const TOKEN_PATTERN = /\[\[([^\]]+)\]\]/gu;

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
  while ((match = TOKEN_PATTERN.exec(markedZhHans)) !== null) {
    const plain = markedZhHans.slice(cursor, match.index);
    if (plain) segments.push({ kind: "text", sequence: segments.length, text: plain });
    const surface = match[1] ?? "";
    const entry = READER_REFERENCE_ENTRY_BY_SIMPLIFIED.get(surface);
    if (!entry) {
      throw new Error(`Reader token ${surface} has no explicit reference entry.`);
    }
    segments.push({
      kind: "token",
      sequence: segments.length,
      surface,
      ...(entry.lexemeId
        ? { lexemeId: entry.lexemeId }
        : { referenceEntryId: entry.entryId }),
    });
    cursor = match.index + match[0].length;
  }
  const tail = markedZhHans.slice(cursor);
  if (tail) segments.push({ kind: "text", sequence: segments.length, text: tail });
  const zhHans = segments.map((segment) =>
    segment.kind === "token" ? segment.surface : segment.text
  ).join("");
  if (!zhHans || !vi || !pinyin || segments.length === 0) {
    throw new Error(`Reader paragraph ${paragraphId} is incomplete.`);
  }
  return { paragraphId, zhHans, pinyin, vi, segments };
};
