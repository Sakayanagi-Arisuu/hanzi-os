import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
import type {GrammarDecision} from './hsk2-grammar-decisions';

/** Authoring only: the resulting pages are ordinary editable Studio blocks. */
export function buildGrammarPages(lessonId:string,decisions:GrammarDecision[]):LessonPageDocument['pages']{
 const rich=getRichLessonContent(lessonId);
 if(!rich?.grammar.length)throw Error(`No grammar source: ${lessonId}`);
 const byRow=new Map(decisions.map(d=>[d.row,d]));
 if(byRow.size!==decisions.length)throw Error('Duplicate editorial grammar decision');
 const pages:LessonPageDocument['pages']=rich.grammar.flatMap(grammar=>{
  const decision=byRow.get(grammar.id);
  if(!decision)throw Error(`Missing editorial decision: ${grammar.id}`);
  const base=`${lessonId}:v2:grammar:${grammar.id}`;
  const example=grammar.modelExample;
  return [{id:`${base}:understand`,title:decision.title,layout:'focus' as const,stage:'understand' as const,blocks:[
   {...emptyLessonBlock(`${base}:note`),title:'Cách dùng và giới hạn',body:decision.note},
   {...emptyLessonBlock(`${base}:example`),kind:'dialogue' as const,title:'Đọc mẫu trong ngữ cảnh',hanzi:example.hanzi,pinyin:example.pinyin,meaningVi:example.meaningVi},
  ]},{id:`${base}:practice`,title:`Tự kiểm · ${decision.title}`,layout:'workshop' as const,stage:'practice' as const,blocks:[
   {...emptyLessonBlock(`${base}:activity`),kind:'activity' as const,title:'Chọn theo ý nghĩa cần diễn đạt',body:decision.prompt,activity:{...emptyLessonActivity(),type:'cloze' as const,acceptedAnswers:[...decision.answers],explanation:decision.feedback,hint:'Có thể trở lại mẫu để tìm trợ giúp; lần làm này chưa chứng minh đã nhớ độc lập.',learningTarget:{skill:'grammar' as const,objective:decision.title,sources:[{kind:'grammar' as const,id:grammar.id}]}}},
  ]}];
 });
 const document:LessonPageDocument={version:1,pages};
 const errors=[...validateLessonPages(document),...validateLessonActivitySources(lessonId,document)];
 if(errors.length)throw Error(errors.join('\n'));
 return pages;
}
