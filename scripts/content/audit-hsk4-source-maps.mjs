/** Match instructional maps by complete Hanzi source, never by title or keyword. */
import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
const auditPath='content/drafts/hsk4-source-map-audit-v1.json';
if(existsSync(auditPath))throw Error('Preserve source-map audit used by release plans; use a new version for a new audit');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const lessons=runtime.items.filter(i=>i.content.targetLessonId?.startsWith('hsk4-'));
 const sources=new Map();
 const key=b=>b.reading.paragraphs.map(p=>p.hanzi).join('\n');
 for(const item of lessons)for(const page of item.content.lessonPages.pages){
  const reading=page.blocks.find(b=>b.kind==='reading');if(!reading)continue;
  const suffix=page.id.match(/:source:(\d+)$/)?.[1];if(suffix===undefined)continue;
  const map=item.content.lessonPages.pages.find(p=>p.id===`${item.content.targetLessonId}:v2:map:${suffix}`);
  if(map)sources.set(key(reading),{lessonId:item.content.targetLessonId,revisionId:item.revisionId,pageId:map.id,diagram:map.blocks.find(b=>b.kind==='diagram')?.diagram});
 }
 const decisions=lessons.filter(i=>!i.content.lessonPages.pages.some(p=>p.illustration||p.blocks.some(b=>['image','diagram'].includes(b.kind)))).map(item=>({lessonId:item.content.targetLessonId,revisionId:item.revisionId,sources:item.content.lessonPages.pages.flatMap(p=>p.blocks.filter(b=>b.kind==='reading').map(b=>({pageId:p.id,title:b.title,sourceHanzi:key(b),matchingMap:sources.get(key(b))??null}))),status:'NEEDS-PEDAGOGICAL-DECISION'}));
 writeFileSync(auditPath,JSON.stringify({humanReviewed:false,decisions},null,2)+'\n');
 console.log({lessons:decisions.length,readingSources:decisions.reduce((n,d)=>n+d.sources.length,0),exactSourceMapMatches:decisions.flatMap(d=>d.sources).filter(s=>s.matchingMap).length});
}finally{db.close();}
