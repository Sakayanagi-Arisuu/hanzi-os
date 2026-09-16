import {RELEASED_VOCABULARY} from '../data/curriculum';
import type {RichLessonCharacter} from './richLessonContent';
import {characterContextException} from './characterContextExceptions';

const normalize=(value:string)=>value.normalize('NFC').toLowerCase().replace(/[\s'’·-]/gu,'');
const candidates=new Map<string,typeof RELEASED_VOCABULARY>();
for(const word of RELEASED_VOCABULARY){
 const key=word.simplified;
 candidates.set(key,[...(candidates.get(key)??[]),word]);
}

/** Align only an exact context reading with one syllable per Han character.
 * Repeated characters retain their position-specific readings (爸爸: bà / ba).
 * Erhua and unbound/polyphonic inputs fall back to the explicitly labelled word.
 */
export function characterContextReading(character:Pick<RichLessonCharacter,'hanzi'|'contextWord'|'contextPinyin'>):string|null {
 const editorial=characterContextException(character);
 if(editorial)return editorial.reading;
 if([...character.hanzi].length!==1)return null;
 const glyphs=[...character.contextWord];
 if(!glyphs.includes(character.hanzi)||glyphs.some(g=>!/^\p{Script=Han}$/u.test(g)))return null;
 const matches=(candidates.get(character.contextWord)??[]).filter(word=>
  normalize(word.pinyin)===normalize(character.contextPinyin)
  &&word.syllables.length===glyphs.length);
 const readings=matches.map(word=>[...new Set(glyphs.flatMap((glyph,index)=>glyph===character.hanzi?[word.syllables[index].marked]:[]))].join(' / '));
 const unique=[...new Set(readings.map(reading=>reading.toLowerCase()))];
 return unique.length===1&&unique[0]?unique[0]:null;
}
