import {expect,it} from 'vitest';
import {characterContextReading} from './characterContextReading';
import {CHARACTER_CONTEXT_EXCEPTIONS,characterContextException} from './characterContextExceptions';
it('aligns syllables to the target character rather than returning the whole word',()=>{
 expect(characterContextReading({hanzi:'常',contextWord:'非常',contextPinyin:'fēicháng'})).toBe('cháng');
 expect(characterContextReading({hanzi:'床',contextWord:'起床',contextPinyin:'qǐchuáng'})).toBe('chuáng');
 expect(characterContextReading({hanzi:'电',contextWord:'打电话',contextPinyin:'dǎ diànhuà'})).toBe('diàn');
 expect(characterContextReading({hanzi:'爸',contextWord:'爸爸',contextPinyin:'bàba'})).toBe('bà / ba');
 expect(characterContextReading({hanzi:'中',contextWord:'中国',contextPinyin:'Zhōngguó'})).toBe('zhōng');
});
it('does not guess from unmatched readings, multi-character targets or erhua alignment',()=>{
 expect(characterContextReading({hanzi:'常',contextWord:'非常',contextPinyin:'fēichǎng'})).toBeNull();
 expect(characterContextReading({hanzi:'非常',contextWord:'非常',contextPinyin:'fēicháng'})).toBeNull();
 expect(characterContextReading({hanzi:'儿',contextWord:'这儿',contextPinyin:'zhèr'})).toBeNull();
 expect(characterContextReading({hanzi:'常',contextWord:'学校',contextPinyin:'xuéxiào'})).toBeNull();
});
it('uses exact editorial contexts for sandhi, alternate readings and fused erhua only',()=>{
 for(const item of CHARACTER_CONTEXT_EXCEPTIONS){
  expect(characterContextReading(item)).toBe(item.reading);
  expect(characterContextException(item)?.note).toBeTruthy();
  expect(characterContextException({...item,contextPinyin:'not-the-reviewed-reading'})).toBeUndefined();
 }
 expect(characterContextReading({hanzi:'儿',contextWord:'面条儿',contextPinyin:'miàntiáor'})).toBeNull();
 expect(characterContextReading({hanzi:'条',contextWord:'面条儿',contextPinyin:'miàntiǎor'})).toBeNull();
});
