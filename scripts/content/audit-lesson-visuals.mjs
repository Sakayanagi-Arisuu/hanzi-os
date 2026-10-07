/** Full baseline inventory from local release heads; never infer visual completion from lesson count. */
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {RELEASED_LESSONS} from '../../src/data/curriculum.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const drafts=new Map();
 for(const file of readdirSync('content/drafts').filter(f=>f.startsWith('thien-lo-')&&f.endsWith('-v2.json'))){
  const value=JSON.parse(readFileSync(`content/drafts/${file}`,'utf8'));
  for(const item of value.items??[value])if(item.lessonId&&item.lessonPages)drafts.set(item.lessonId,{file,...item});
 }
 const lessons=RELEASED_LESSONS.map(lesson=>{
  const release=runtime.items.find(item=>item.content.targetLessonId===lesson.id&&item.content.lessonPages);
  const document=release?.content.lessonPages;
  const draft=drafts.get(lesson.id);
  const pages=(document?.pages??[]).map(page=>({id:page.id,title:page.title,layout:page.layout,illustration:page.illustration??null,
   instructionalVisuals:page.blocks.filter(b=>b.kind==='diagram'||b.kind==='image').map(b=>({id:b.id,kind:b.kind,title:b.title,src:b.imageSrc||null})),
   usesSharedScene:!page.illustration&&(page.layout==='scene'||page.layout==='dialogue')}));
  return {lessonId:lesson.id,title:lesson.title,objective:lesson.objective,unitId:lesson.unitId,revisionId:release?.revisionId??null,
   status:'NEEDS-EDITORIAL-VISUAL-REVIEW',pages,
   draftSceneAssignments:(draft?.lessonPages.pages??[]).filter(p=>p.illustration).map(p=>({pageId:p.id,...p.illustration})),
   manuscript:draft?.file??null};
 });
 const summary={baselineLessons:lessons.length,publishedPageLessons:lessons.filter(l=>l.revisionId).length,
  lessonsWithPublishedPageArt:lessons.filter(l=>l.pages.some(p=>p.illustration)).length,
  lessonsWithInstructionalVisual:lessons.filter(l=>l.pages.some(p=>p.illustration||p.instructionalVisuals.length)).length,
  lessonsWithoutInstructionalVisual:lessons.filter(l=>!l.pages.some(p=>p.illustration||p.instructionalVisuals.length)).length,
  sharedScenePages:lessons.flatMap(l=>l.pages).filter(p=>p.usesSharedScene).length,
  pendingEditorialVisualReview:lessons.length};
 writeFileSync('docs/thien-lo-redesign-review/lesson-visual-audit.json',JSON.stringify({version:1,generatedAt:new Date().toISOString(),summary,lessons},null,2)+'\n');
 console.log(summary);
}finally{db.close();}
