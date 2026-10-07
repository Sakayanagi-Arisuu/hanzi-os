import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {RELEASED_LESSONS} from '../../src/data/curriculum.ts';
import {EDITORIAL_WORD_BY_ID,LEXICAL_EDITORIAL_VERSION} from '../../src/content/lexicalEditorialCatalog.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';

const path='docs/thien-lo-redesign-review/203-FINAL-LOCAL-DELIVERY.json';
if(existsSync(path))throw Error('Keep final audit artifact; do not replay.');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const rt=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const ids=new Set(rt.items.map(x=>x.content.targetLessonId));
 const inv=JSON.parse(readFileSync('content/sources/hsk-syllabus-2026/inventory.json','utf8'));
 const wordTupleIssues=inv.vocabulary.flatMap(v=>{
  const w=EDITORIAL_WORD_BY_ID.get(v.id);
  return !w||[w.meaning,w.example,w.examplePinyin,w.exampleMeaning].some(x=>!x?.trim())
   ||/本课的重点词语|本单元的重点词语|词汇项目/.test(w.example)
   ?[{id:v.id,word:v.word,example:w?.example}]:[];
 });
 const family=rt.items.find(x=>x.content.targetLessonId==='hsk3-study-work-accounts-campus-education');
 const receipt=JSON.parse(readFileSync('docs/thien-lo-redesign-review/202-REVIEW-HSK3-FAMILY-EDUCATION-ROUND108.json','utf8'));
 const audit={scope:'Final release/consumer consistency and known editorial triage; this scan is not semantic review of every string or proof of HSK mastery.',humanReviewed:false,
  lessonHeads:rt.items.length,missingLessonIds:RELEASED_LESSONS.filter(l=>!ids.has(l.id)).map(l=>l.id),duplicateLessonIds:rt.items.length-ids.size,
  syllabusWords:inv.vocabulary.length,wordTupleIssues,lexicalCatalog:LEXICAL_EDITORIAL_VERSION,
  pendingReleaseJobs:db.prepare("SELECT count(*) n FROM content_release_outbox_events WHERE status IN ('pending','processing')").get().n,
  familyRevision:family?.revisionId,familyAddedPages:family?.content.lessonPages.pages.filter(p=>p.id.includes(':family-r108:')).length,
  familyMatchesReceipt:family?.revisionId===receipt.releases[0].revisionId,foreignKeyViolations:db.prepare('PRAGMA foreign_key_check').all().length,
  lessonHeadsById:rt.items.map(x=>({lessonId:x.content.targetLessonId,revisionId:x.revisionId})).sort((a,b)=>a.lessonId.localeCompare(b.lessonId))};
 if(audit.lessonHeads!==217||audit.missingLessonIds.length||audit.duplicateLessonIds||wordTupleIssues.length||audit.pendingReleaseJobs||audit.familyAddedPages!==3||!audit.familyMatchesReceipt||audit.foreignKeyViolations)throw Error(JSON.stringify({...audit,lessonHeadsById:undefined}));
 writeFileSync(path,JSON.stringify(audit,null,2)+'\n');
 console.log({...audit,lessonHeadsById:undefined,artifact:path});
}finally{db.close();}
