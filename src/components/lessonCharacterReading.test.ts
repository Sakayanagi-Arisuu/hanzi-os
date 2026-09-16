import {createElement} from 'react';
import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {LessonDepthPanel} from './LessonDepthPanel';
import {getRichLessonContent} from '../learning/richLessonContent';
import {CHARACTER_CONTEXT_EXCEPTIONS} from '../learning/characterContextExceptions';
it('labels character and word pronunciations separately in the actual lesson panel',()=>{
 const source=getRichLessonContent('characters-1')!;
 const content={...source,dialogue:[],grammar:[],tasks:[],topics:[],characters:source.characters.filter(c=>c.hanzi==='常'||c.hanzi==='爸')};
 const html=renderToStaticMarkup(createElement(LessonDepthPanel,{lessonId:"characters-1",contentOverride:content}));
 expect(html).toContain('Âm trong từ: cháng');
 expect(html).toContain('Âm trong từ: bà / ba');
 expect(html).toContain('Âm cả từ: fēicháng');
 expect(html).not.toContain('<span>fēicháng</span>');
 expect(html).toContain('Nghe từ 非常');
});
it('explains exceptional context readings instead of presenting them as the universal character sound',()=>{
 const source=getRichLessonContent('characters-1')!;
 const content={...source,dialogue:[],grammar:[],tasks:[],topics:[],characters:CHARACTER_CONTEXT_EXCEPTIONS.map((item,index)=>({...source.characters[0],...item,id:`context-${index}`}))};
 const html=renderToStaticMarkup(createElement(LessonDepthPanel,{lessonId:'characters-1',contentOverride:content}));
 for(const item of CHARACTER_CONTEXT_EXCEPTIONS){
  expect(html).toContain(`Âm trong từ: ${item.reading}`);
  expect(html).toContain(item.note);
 }
});
