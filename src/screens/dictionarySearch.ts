import type { DictionaryWord } from '../content/publishedStudioVocabulary';

export const normalizeDictionaryQuery = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/** Separate fields prevent accidental matches across a Hanzi/Pinyin boundary.
 * Pinyin may be entered with tones, tone numbers, or without spaces. */
export function dictionarySearchIndex(words: readonly DictionaryWord[]) {
  return words.map(word => ({ word, fields: [word.simplified, word.traditional,
    word.pinyin, word.pinyinNumbered, word.pinyin.replace(/\s/g, ''),
    ...word.meaning.split(/[;,；，]/u), word.meaning]
    .filter((value): value is string => Boolean(value)).map(normalizeDictionaryQuery),
    tags: word.tags.map(normalizeDictionaryQuery) }));
}

export function searchDictionary(index: ReturnType<typeof dictionarySearchIndex>, query: string) {
  const needle = normalizeDictionaryQuery(query);
  if (!needle) return index.map(item => item.word);
  return index.map(({ word, fields, tags }, order) => ({ word, order, rank: fields.reduce((best, field) =>
    Math.min(best, field === needle ? 0 : field.startsWith(needle) ? 1 : field.includes(needle) ? 2 : 4), tags.some(tag => tag.includes(needle)) ? 3 : 4) }))
    .filter(item => item.rank < 4)
    .sort((a, b) => a.rank - b.rank || Number(b.word.isCore) - Number(a.word.isCore)
      || a.word.simplified.length - b.word.simplified.length || a.order - b.order)
    .map(item => item.word);
}
