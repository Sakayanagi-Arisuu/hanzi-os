import type { EditorialReaderChapter } from "./editorialReaderContent";

export const EDITORIAL_READER_LEXICON_SCAN_VERSION = "reader-lexicon-scan-v1" as const;

export type EditorialReaderLexiconScan = {
  version: typeof EDITORIAL_READER_LEXICON_SCAN_VERSION;
  contentFingerprint: string;
  scannedAt: string;
  characterCount: number;
  uniqueCharacterCount: number;
  coveredCharacterCount: number;
  missingCharacters: string[];
  candidateWordCount: number;
  coveredWordCount: number;
  unresolvedWords: string[];
  aiAssisted: false;
  humanReviewed: false;
};

type LexiconLookup = (surface: string) => Promise<boolean>;

const HAN_CHARACTER_PATTERN = /\p{Script=Han}/u;
const HAN_WORD_PATTERN = /^\p{Script=Han}{2,8}$/u;
const WORD_SEGMENTER = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter("zh-CN", { granularity: "word" })
  : null;

const fnv1a = (value: string) => {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const readerChineseText = (chapters: EditorialReaderChapter[]) => chapters
  .flatMap((chapter) => chapter.paragraphs.map((paragraph) => paragraph.zhHans.trim()))
  .join("\n");

export const editorialReaderContentFingerprint = (chapters: EditorialReaderChapter[]) =>
  `fnv1a:${fnv1a(readerChineseText(chapters))}`;

const candidateWords = (text: string) => {
  if (!WORD_SEGMENTER) return [];
  return [...WORD_SEGMENTER.segment(text)]
    .map((part) => part.segment.trim())
    .filter((surface) => HAN_WORD_PATTERN.test(surface));
};

const scanSurfaces = async (surfaces: string[], lookup: LexiconLookup) => {
  const results = await Promise.all(surfaces.map(async (surface) => ({
    surface,
    covered: await lookup(surface),
  })));
  return {
    covered: results.filter((result) => result.covered).map((result) => result.surface),
    missing: results.filter((result) => !result.covered).map((result) => result.surface),
  };
};

export const scanEditorialReaderVocabulary = async (
  chapters: EditorialReaderChapter[],
  lookup: LexiconLookup,
  now = new Date().toISOString(),
): Promise<EditorialReaderLexiconScan> => {
  const text = readerChineseText(chapters);
  const characters = [...text].filter((character) => HAN_CHARACTER_PATTERN.test(character));
  const uniqueCharacters = [...new Set(characters)].sort((left, right) => left.localeCompare(right, "zh-CN"));
  const uniqueWords = [...new Set(candidateWords(text))].sort((left, right) => left.localeCompare(right, "zh-CN"));
  const [characterScan, wordScan] = await Promise.all([
    scanSurfaces(uniqueCharacters, lookup),
    scanSurfaces(uniqueWords, lookup),
  ]);

  return {
    version: EDITORIAL_READER_LEXICON_SCAN_VERSION,
    contentFingerprint: editorialReaderContentFingerprint(chapters),
    scannedAt: now,
    characterCount: characters.length,
    uniqueCharacterCount: uniqueCharacters.length,
    coveredCharacterCount: characterScan.covered.length,
    missingCharacters: characterScan.missing.slice(0, 120),
    candidateWordCount: uniqueWords.length,
    coveredWordCount: wordScan.covered.length,
    unresolvedWords: wordScan.missing.slice(0, 120),
    aiAssisted: false,
    humanReviewed: false,
  };
};
