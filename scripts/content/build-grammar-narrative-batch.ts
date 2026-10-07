import {readFileSync,writeFileSync} from 'node:fs';
import {buildNarrativeBatch,type NarrativeBatchOptions} from './build-narrative-batch';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
import type {LessonDiagram} from '../../src/learning/lessonDiagram';
import type {LessonActivityTarget} from '../../src/learning/lessonActivityTarget';

export type GrammarDecision={row:string;title:string;prompt:string;answer:string;answerPinyin:string;answerVi:string;feedback:string;example?:[string,string,string];boundary?:string};
export type NarrativeVisual={type:LessonDiagram['type'];title:string;description:string;nodes:Array<[string,string,string,string,string]>};
type SourceGrammar={grammarRowId:string;explanationVi:string;usageBoundaryVi:string;example:{hanzi:string;pinyin:string;vietnamese:string}};
type GrammarBatchOptions=NarrativeBatchOptions & {
 sourcePack:string;outputFile:string;decisions:GrammarDecision[];visuals:Record<string,NarrativeVisual>;
 targets:Record<string,{reading:string[];guided:string[];writing:string[]}>;
};

/** Shared mechanics only. Text, diagrams, answers, target mappings and corrections are authored per batch. */
export function buildGrammarNarrativeBatch(options:GrammarBatchOptions){
 const source=JSON.parse(readFileSync(`content/drafts/${options.sourcePack}.json`,'utf8')) as {lessons:Array<{lessonId:string;grammar:SourceGrammar[]}>};
 const items=buildNarrativeBatch(options);
 const expected=source.lessons.flatMap(lesson=>lesson.grammar.map(g=>g.grammarRowId)).sort();
 const selected=options.decisions.map(d=>`${options.level}-grammar-row-${d.row}`).sort();
 if(JSON.stringify(expected)!==JSON.stringify(selected))throw Error('Grammar inventory differs from the source pack');
 for(const item of items){
  const suffix=item.lessonId.slice(options.lessonPrefix.length+1),visual=options.visuals[suffix],mapping=options.targets[suffix];
  const sourceLesson=source.lessons.find(entry=>entry.lessonId===item.lessonId),rich=getRichLessonContent(item.lessonId);
  if(!visual||!sourceLesson||!rich||!mapping)throw Error(`Incomplete lesson: ${item.lessonId}`);
  const target=(skill:LessonActivityTarget['skill'],rows:string[],objective:string):LessonActivityTarget=>({skill,objective,sources:rows.map(row=>({kind:'grammar',id:`${options.level}-grammar-row-${row}`}))});
  const diagram:LessonDiagram={type:visual.type,description:visual.description,nodes:visual.nodes.map(([id,label,pinyin,meaningVi,note],index)=>({id,label,pinyin,meaningVi,note,x:visual.type==='timeline'?0:index,y:visual.type==='timeline'?index:0}))};
  item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:diagram`,title:visual.title,layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:diagram`),kind:'diagram',title:visual.title,diagram}]});
  const corrected=sourceLesson.grammar.map(grammar=>{
   const decision=options.decisions.find(row=>`${options.level}-grammar-row-${row.row}`===grammar.grammarRowId);
   if(!decision||!rich.grammar.some(row=>row.id===grammar.grammarRowId))throw Error(`Missing decision: ${grammar.grammarRowId}`);
   const example=decision.example??[grammar.example.hanzi,grammar.example.pinyin,grammar.example.vietnamese];
   return {grammar,decision,example,explanation:`${grammar.explanationVi}\n${decision.boundary??grammar.usageBoundaryVi}`};
  });
  const grammarPages:LessonPageDocument['pages']=corrected.map(({grammar,decision,example,explanation},index)=>{
   const base=`${item.lessonId}:v2:grammar:${grammar.grammarRowId}`;
   return {id:base,title:`${index+1}/${corrected.length} · ${decision.title}`,layout:'focus',stage:'practice',blocks:[
    {...emptyLessonBlock(`${base}:explain`),title:decision.title,body:explanation},
    {...emptyLessonBlock(`${base}:example`),kind:'dialogue',title:'Câu mẫu có ngữ cảnh',hanzi:example[0],pinyin:example[1],meaningVi:example[2]},
    {...emptyLessonBlock(`${base}:practice`),kind:'activity',title:'Tự điền trước khi xem đáp án',body:decision.prompt,activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:[decision.answer],explanation:`${decision.feedback} ${decision.answer} · ${decision.answerPinyin} · ${decision.answerVi}.`,learningTarget:target('grammar',[decision.row],decision.title)}},
   ]};
  });
  item.lessonPages.pages.splice(item.lessonPages.pages.findIndex(page=>page.id.endsWith(':transfer')),0,...grammarPages);
  for(const [pageSuffix,skill,rows] of [['choice','reading',mapping.reading],['guided','grammar',mapping.guided],['transfer','writing',mapping.writing]] as const){
   const block=item.lessonPages.pages.find(page=>page.id.endsWith(`:${pageSuffix}`))!.blocks.find(block=>block.activity)!;
   block.activity!.learningTarget=target(skill,rows,block.body);
  }
  item.studioContent.grammar=corrected.map(({decision,example,explanation})=>({pattern:decision.title,explanationVi:explanation,modelExample:{speaker:'Ví dụ',hanzi:example[0],pinyin:example[1],meaningVi:example[2]},guidedPractice:{promptVi:decision.prompt,modelAnswerHanzi:decision.answer,modelAnswerPinyin:decision.answerPinyin,modelAnswerMeaningVi:decision.answerVi}}));
  const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];
  if(errors.length)throw Error(`${item.lessonId}: ${errors.join('; ')}`);
 }
 writeFileSync(`content/drafts/${options.outputFile}.json`,JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',sourcePack:options.sourcePack,items},null,2)+'\n');
 console.log(items.map(item=>({lessonId:item.lessonId,pages:item.lessonPages.pages.length,activities:item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.activity)).length})));
 return items;
}
