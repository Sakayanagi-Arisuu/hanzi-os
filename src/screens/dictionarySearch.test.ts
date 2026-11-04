import { describe, expect, it } from 'vitest';
import type { DictionaryWord } from '../content/publishedStudioVocabulary';
import { dictionarySearchIndex, searchDictionary } from './dictionarySearch';

const word = (id: string, simplified: string, pinyin: string, meaning: string, isCore = false): DictionaryWord => ({
  id, simplified, traditional: simplified, pinyin, meaning, isCore, pinyinNumbered: '',
  senses: [meaning], classifiers: [], partOfSpeech: '', toneNumbers: [], tags: [],
});
describe('dictionary relevance', () => {
  const words = [word('contains', '大学', 'dàxué', 'đại học', true), word('prefix', '学校', 'xuéxiào', 'trường học', true),
    word('exact', '学', 'xué', 'học'), word('study', '学习', 'xué xí', 'học tập', true),
    word('homophone', '穴', 'xué', 'hang')];
  it('ranks exact Hanzi before prefix before containment, even when exact is extended', () => {
    expect(searchDictionary(dictionarySearchIndex(words), '学').map(item => item.id)).toEqual(['exact', 'prefix', 'study', 'contains']);
  });
  it('supports Vietnamese without accents and compact or spaced Pinyin', () => {
    const index = dictionarySearchIndex(words);
    expect(searchDictionary(index, 'dai hoc')[0].id).toBe('contains');
    expect(searchDictionary(index, 'xuexi')[0].id).toBe('study');
    expect(searchDictionary(index, 'xué xí')[0].id).toBe('study');
  });
  it('retains distinct homophones and does not invent cross-field matches', () => {
    const index = dictionarySearchIndex(words);
    expect(searchDictionary(index, 'xue').map(item => item.id)).toContain('homophone');
    expect(searchDictionary(index, '学 xue')).toEqual([]);
    expect(searchDictionary(index, 'zzzz')).toEqual([]);
    expect(searchDictionary(index, '')).toEqual(words);
  });
  it('keeps topic matches behind actual word meanings', () => {
    const tagged = { ...word('teacher', '老师', 'lǎoshī', 'giáo viên', true), tags: ['trường học'] };
    const exact = word('school', '学校', 'xuéxiào', 'trường học');
    expect(searchDictionary(dictionarySearchIndex([tagged, exact]), 'truong hoc').map(item => item.id)).toEqual(['school', 'teacher']);
  });
});
