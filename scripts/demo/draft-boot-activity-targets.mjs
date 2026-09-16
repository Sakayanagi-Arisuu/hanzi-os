import {readFileSync} from 'node:fs';
import {applyEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,d1Adapter,fingerprint} from './local-demo-database.mjs';
const plan=JSON.parse(readFileSync('content/drafts/thien-lo-boot-1-activity-targets.json','utf8'));
const apply=process.argv.includes('--apply'),db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
 requireDemoAccounts(db);
 const backup=apply?await backupLocalDatabase(db,process.cwd(),'before-boot-activity-target-draft'):null;
 db.exec('BEGIN IMMEDIATE');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
 const before=tables.map(t=>fingerprint(db,t));
 const headBefore=fingerprint(db,'content_release_heads');
 const repo=new ContentStudioRepository(d1Adapter(db));
 const row=db.prepare('SELECT h.revision_id FROM content_release_heads h JOIN content_items i ON i.id=h.item_id WHERE i.stable_key=?').get('thien-lo-v2-boot-1');
 if(!row)throw new Error('Published boot-1 absent');
 const source=await repo.getRevision(row.revision_id);
 const pages=applyEditorialActivityTargets('boot-1',source.content.lessonPages,plan.targets);
 const content={...source.content,lessonPages:pages,review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 delete content.localReview;
 const latest=await repo.getLatestRevision(source.itemId);
 let draft;
 if(latest.id!==source.id){
  if(latest.workflowState!=='draft'||canonicalStudioJson(latest.content)!==canonicalStudioJson(content))throw new Error('Existing editor revision must be preserved');
  draft=latest;
 }else{
  const actor={actorUserId:'local-demo-user-2',actorSessionId:null};
  const key=`boot-targets-v1:${await studioSha256(canonicalStudioJson(plan))}`;
  draft=await repo.forkRevision({...actor,sourceRevisionId:source.id,idempotencyKey:`${key}:fork`});
  draft=await repo.updateDraft({...actor,revisionId:draft.id,expectedRowVersion:draft.rowVersion,title:draft.title,level:draft.level,content,idempotencyKey:`${key}:update`});
 }
 for(let i=0;i<tables.length;i++)if(fingerprint(db,tables[i])!==before[i])throw new Error(`Protected table changed: ${tables[i]}`);
 if(fingerprint(db,'content_release_heads')!==headBefore)throw new Error('Release changed');
 if(canonicalStudioJson((await repo.getRevision(source.id)).content)!==canonicalStudioJson(source.content))throw new Error('Source revision changed');
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('FK violation');
 db.exec(apply?'COMMIT':'ROLLBACK');
 console.log({mode:apply?'draft-created':'rehearsed-rollback',lessonId:'boot-1',revisionId:draft.id,protectedTables:tables.length,targets:4,published:false,backup});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
finally{db.close();}
