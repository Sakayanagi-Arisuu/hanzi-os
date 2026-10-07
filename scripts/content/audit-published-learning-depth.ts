/** Read-only release audit. Counts describe structure, never mastery or editorial approval. */
import {writeFileSync} from 'node:fs';
import {RELEASED_LESSONS} from '../../src/data/curriculum';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository';
import {isLessonPageDocument} from '../../src/learning/lessonPages';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';

const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try {
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const lessons=RELEASED_LESSONS.map(lesson=>{
  const item=runtime.items.find(row=>row.content.targetLessonId===lesson.id);
  const document=item?.content.lessonPages;
  if(!item||!isLessonPageDocument(document))throw Error(`Missing valid published pages: ${lesson.id}`);
  const blocks=document.pages.flatMap(page=>page.blocks);
  const activities=blocks.filter(block=>block.kind==='activity');
  const targets=activities.flatMap(block=>block.activity?.learningTarget?[block.activity.learningTarget]:[]);
  return {
   lessonId:lesson.id,revisionId:item.revisionId,objective:lesson.objective,
   prerequisites:lesson.prerequisiteIds,stages:[...new Set(document.pages.map(page=>page.stage??'unspecified'))],
   pages:document.pages.length,blockKinds:Object.fromEntries([...new Set(blocks.map(block=>block.kind))].map(kind=>[kind,blocks.filter(block=>block.kind===kind).length])),
   activities:activities.length,targetedActivities:targets.length,targetSkills:[...new Set(targets.map(target=>target.skill))],
   unboundActivities:activities.filter(block=>!block.activity?.learningTarget).map(block=>({id:block.id,title:block.title,type:block.activity?.type})),
   timedActivities:activities.filter(block=>block.activity?.timeLimitSeconds).map(block=>({id:block.id,seconds:block.activity!.timeLimitSeconds})),
   practicePages:document.pages.filter(page=>page.stage==='practice').length,
   transferPages:document.pages.filter(page=>page.stage==='transfer').length,
   readingParagraphs:blocks.reduce((sum,block)=>sum+(block.reading?.paragraphs.length??0),0),
  };
 });
 const summary={lessons:lessons.length,pages:lessons.reduce((sum,lesson)=>sum+lesson.pages,0),
  activities:lessons.reduce((sum,lesson)=>sum+lesson.activities,0),
  targetedActivities:lessons.reduce((sum,lesson)=>sum+lesson.targetedActivities,0),
  timedActivities:lessons.reduce((sum,lesson)=>sum+lesson.timedActivities.length,0),
  noPracticeStage:lessons.filter(lesson=>!lesson.practicePages).map(lesson=>lesson.lessonId),
  noTransferStage:lessons.filter(lesson=>!lesson.transferPages).map(lesson=>lesson.lessonId)};
 writeFileSync('docs/thien-lo-redesign-review/published-learning-depth-audit.json',JSON.stringify({generatedAt:new Date().toISOString(),scope:'Structural inventory of current local release heads; not semantic review, HSK coverage or mastery.',summary,lessons},null,2)+'\n');
 console.log(summary);
}finally{db.close();}
