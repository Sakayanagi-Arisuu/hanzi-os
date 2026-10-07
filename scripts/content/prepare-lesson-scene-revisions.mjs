/** Prepare exact-current-head visual revisions without changing any published content. */
import {writeFileSync} from 'node:fs';
import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {validateLessonPages} from '../../src/learning/lessonPages.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
const remaining=process.argv.includes('--remaining-survival');
const learningScenes=process.argv.includes('--learning-scenes');
if(remaining&&learningScenes)throw Error('Choose one visual scope');
const file=learningScenes?'thien-lo-hsk1-learning-scenes-v1':remaining?'thien-lo-survival-remaining-scenes-v1':'thien-lo-survival-scene-revisions-v1';
const assignments=learningScenes?[['daily-2','breakfast-water-order','daily-2:v2:context'],['journey-1','home-school-taxi-call','journey-1:v2:context'],['professional-1','secondary-school-introduction','professional-1:v2:arrival']]:remaining?[['survival-2','pronoun-group'],['survival-3','fictional-profile'],['survival-4','family-album']]:[['survival-1','polite-help'],['survival-5','pets-introduction'],['survival-6','clothes-opinion'],['survival-7','conversation-invitation'],['survival-8','phone-callback'],['survival-9','morning-routine']];
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const items=[];
 for(const [lessonId,key,overridePageId]of assignments){
  const head=runtime.items.find(i=>i.content.targetLessonId===lessonId&&i.content.lessonPages);
  if(!head)throw Error(`Missing release ${lessonId}`);
  const illustration=LESSON_SCENES.find(s=>s.src.endsWith(`/${key}-v1.webp`));
  if(!illustration)throw Error(`Missing scene ${key}`);
  const source=await repo.getRevision(head.revisionId);
  const content=structuredClone(source.content);
  const page=content.lessonPages.pages.find(p=>p.id===(overridePageId??`${lessonId}:v2:context`));
  if(!page||page.layout!=='scene'||page.illustration)throw Error(`Unexpected context ${lessonId}`);
  page.illustration={...illustration};
  const errors=validateLessonPages(content.lessonPages);if(errors.length)throw Error(errors.join('\n'));
  items.push({lessonId,title:head.title,baseRevisionId:head.revisionId,baseContentSha256:await studioSha256(canonicalStudioJson(source.content)),
   changedPageIds:[page.id],status:'prepared-not-imported-not-published',content});
 }
 writeFileSync(`content/drafts/${file}.json`,JSON.stringify({version:1,humanReviewed:false,scope:'Only context-page illustration; all learning content and identities unchanged.',items},null,2)+'\n');
 console.log({prepared:items.length,published:false});
}finally{db.close();}
