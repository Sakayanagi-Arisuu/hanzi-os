import type { MandarinSyllable, MandarinTone } from "../types";

const PINYIN_INITIALS = [
  "zh",
  "ch",
  "sh",
  "b",
  "p",
  "m",
  "f",
  "d",
  "t",
  "n",
  "l",
  "g",
  "k",
  "h",
  "j",
  "q",
  "x",
  "r",
  "z",
  "c",
  "s",
  "y",
  "w",
] as const;

const TONE_MARKS: Record<string, readonly string[]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

const PINYIN_FINALS = new Set([
  "a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "ong", "er",
  "i", "ia", "ie", "iao", "iu", "ian", "in", "iang", "ing", "iong",
  "u", "ua", "uo", "uai", "ui", "uan", "un", "uang", "ueng", "ue",
  "ü", "üe", "üan", "ün",
]);

const NUMBERED_SYLLABLE = /([A-Za-züÜvV:]+)([1-5])/gu;

const normalizeUmlaut = (value: string) =>
  value.replace(/u:/giu, "ü").replace(/v/giu, (match) => match === "V" ? "Ü" : "ü");

const toneFromDigit = (digit: string): MandarinTone =>
  digit === "5" ? 0 : Number(digit) as MandarinTone;

const markVowel = (spelling: string, tone: MandarinTone) => {
  if (tone === 0) return spelling;

  const lower = spelling.toLocaleLowerCase("en");
  let targetIndex = lower.indexOf("a");
  if (targetIndex < 0) targetIndex = lower.indexOf("e");
  if (targetIndex < 0) {
    const ouIndex = lower.indexOf("ou");
    if (ouIndex >= 0) targetIndex = ouIndex;
  }
  if (targetIndex < 0) {
    for (let index = lower.length - 1; index >= 0; index -= 1) {
      if ("aeiouü".includes(lower[index])) {
        targetIndex = index;
        break;
      }
    }
  }
  if (targetIndex < 0) return spelling;

  const vowel = lower[targetIndex];
  const marked = TONE_MARKS[vowel]?.[tone - 1];
  if (!marked) return spelling;
  const original = spelling[targetIndex];
  const replacement = original === original.toLocaleUpperCase("en")
    ? marked.toLocaleUpperCase("en")
    : marked;
  return `${spelling.slice(0, targetIndex)}${replacement}${spelling.slice(targetIndex + 1)}`;
};

export const splitPinyinSyllable = (spelling: string) => {
  const normalized = normalizeUmlaut(spelling);
  const lower = normalized.toLocaleLowerCase("en");
  const initial = PINYIN_INITIALS.find((candidate) => lower.startsWith(candidate)) ?? "";
  return {
    initial,
    final: lower.slice(initial.length),
  };
};

export const parseNumberedPinyin = (numberedPinyin: string): MandarinSyllable[] => {
  const compact = numberedPinyin.replace(/[\s'’-]/gu, "");
  const matches = [...compact.matchAll(NUMBERED_SYLLABLE)];
  const consumed = matches.map((match) => match[0]).join("");
  if (!matches.length || consumed.toLocaleLowerCase("en") !== compact.toLocaleLowerCase("en")) {
    throw new Error(`Pinyin số không hợp lệ: ${numberedPinyin}`);
  }

  return matches.map((match, index) => {
    const spelling = normalizeUmlaut(match[1]);
    const lexicalTone = toneFromDigit(match[2]);
    const { initial, final } = splitPinyinSyllable(spelling);
    if (!final) throw new Error(`Âm tiết pinyin thiếu vận mẫu: ${match[0]}`);
    if (!PINYIN_FINALS.has(final)) throw new Error(`Vận mẫu pinyin không hợp lệ: ${match[0]}`);
    return {
      index,
      spelling,
      marked: markVowel(spelling, lexicalTone),
      numbered: `${spelling}${lexicalTone === 0 ? 5 : lexicalTone}`,
      initial,
      final,
      lexicalTone,
      surfaceTone: lexicalTone,
      neutralTone: lexicalTone === 0,
    };
  });
};

export const applyToneSandhi = (
  syllables: readonly MandarinSyllable[],
): MandarinSyllable[] => syllables.map((syllable, index) => {
  const nextTone = syllables[index + 1]?.lexicalTone;
  const spelling = syllable.spelling.toLocaleLowerCase("en");
  let surfaceTone = syllable.lexicalTone;

  if (surfaceTone === 3 && nextTone === 3) surfaceTone = 2;
  if (spelling === "bu" && syllable.lexicalTone === 4 && nextTone === 4) surfaceTone = 2;
  if (spelling === "yi" && syllable.lexicalTone === 1 && nextTone !== undefined && nextTone !== 0) {
    surfaceTone = nextTone === 4 ? 2 : 4;
  }

  return {
    ...syllable,
    surfaceTone,
    marked: markVowel(syllable.spelling, surfaceTone),
  };
});

export const formatMarkedPinyin = (
  syllables: readonly MandarinSyllable[],
  separator = "",
) => syllables.map((syllable) => syllable.marked).join(separator);

export const stripPinyinMarks = (value: string) => normalizeUmlaut(value)
  .normalize("NFD")
  .replace(/u\u0308/giu, (match) => match.startsWith("U") ? "V" : "v")
  .replace(/[\u0300-\u036f]/gu, "")
  .replace(/[^a-zv]/giu, "")
  .replace(/v/giu, (match) => match === "V" ? "Ü" : "ü")
  .toLocaleLowerCase("en");
