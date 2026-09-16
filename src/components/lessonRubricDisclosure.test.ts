import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {LessonActivityBlock} from './LessonActivityBlock';
import {emptyLessonActivity} from '../learning/lessonActivities';
import type {ReadingDraft} from '../learning/lessonReadingSession';
const activity={...emptyLessonActivity(),type:'rubric' as const,rubric:[{id:'tone',label:'Cách đọc',guidance:'一 trước 起 đọc yì.'}],explanation:'Đáp án: yì qǐ.'};
const render=(draft:ReadingDraft)=>renderToStaticMarkup(createElement(LessonActivityBlock,{activity,draft,onDraft:()=>{}}));
it('does not reveal answer-bearing rubric guidance before a first attempt is compared',()=>{
 for(const text of ['', 'Tôi đang thử']){
  const html=render({text,revealed:false,compared:false});
  expect(html).not.toContain('一 trước 起');
  expect(html).not.toContain('Đáp án:');
  expect(html).toContain('Xem hướng dẫn đối chiếu');
 }
});
it('restores guidance for reviewed and legacy drafts in a collapsed checklist',()=>{
 for(const fields of [{compared:true},{compared:false,everChecked:true},{compared:false,answerIds:['tone']}]){
  const html=render({text:'Tôi đã thử',revealed:false,...fields});
  expect(html).toContain('一 trước 起');
  expect(html).toContain('<details class="jade-rubric-checklist">');
  expect(html).not.toContain('<details open');
 }
});
