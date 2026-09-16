/** Local-only reconciliation of the known pre-note batch with generated drafts.
 * Any editor divergence aborts the entire transaction; never publish here.
 */
import {readFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {authoredBatches} from '../content/authored-batch-registry.mjs';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,fingerprint,d1Adapter} from './local-demo-database.mjs';
const baselinePath=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11);
if(!baselinePath)throw new Error('Provide the exact pre-edit batch as --baseline');
const baseline=JSON.parse(readFileSync(baselinePath,'utf8')).items;
const batch=process.argv.find(a=>a.startsWith('--batch='))?.slice(8)??'characters';
if(!Object.hasOwn(authoredBatches,batch))throw new Error('Unknown authored batch');
const updated=JSON.parse(readFileSync(`content/drafts/${authoredBatches[batch].file}.json`,'utf8')).items;
const expected=authoredBatches[batch].lessonIds;
for(const items of [baseline,updated])if(JSON.stringify(items.map(i=>i.lessonId))!==JSON.stringify(expected))throw new Error('Unexpected batch inventory');
const apply=process.argv.includes('--apply');
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
 requireDemoAccounts(db);
 if(apply)await backupLocalDatabase(db,process.cwd(),`before-${batch}-draft-update`);
 db.exec('BEGIN IMMEDIATE');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(name=>/^[a-z_]+$/.test(name)&&!['content_revisions','content_workflow_events'].includes(name));
 const before=tables.map(t=>fingerprint(db,t));
 const eventsBefore=db.prepare('SELECT * FROM content_workflow_events ORDER BY id').all();
 const revisionsBefore=db.prepare('SELECT * FROM content_revisions ORDER BY id').all();
 const changedIds=new Set();
 const repo=new ContentStudioRepository(d1Adapter(db));
 let changed=0;
 for(let i=0;i<updated.length;i++){
  const old=baseline[i],next=updated[i];
  if(next.studioContent.targetLessonId!==next.lessonId)throw new Error('Target mismatch');
  const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(`thien-lo-v2-${next.lessonId}`);
  if(!row)throw new Error('Draft is missing');
  const revision=await repo.getRevision(row.id);
  if(revision.workflowState!=='draft')throw new Error('Only existing draft state is allowed');
  if(canonicalStudioJson(revision.content)===canonicalStudioJson(next.studioContent))continue;
  if(canonicalStudioJson(revision.content)!==canonicalStudioJson(old.studioContent)||revision.title!==old.title||revision.level!==old.level)throw new Error(`Preserve editor divergence: ${next.lessonId}`);
  const checksum=await studioSha256(canonicalStudioJson(next.studioContent));
  const saved=await repo.updateDraft({actorUserId:'local-demo-user-2',actorSessionId:null,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:next.title,level:next.level,content:next.studioContent,idempotencyKey:`character-notes:${next.lessonId}:${checksum}`});
  if(canonicalStudioJson(saved.content)!==canonicalStudioJson(next.studioContent))throw new Error('Saved payload differs');
  changed++;
  changedIds.add(revision.id);
 }
 const eventsAfter=db.prepare('SELECT * FROM content_workflow_events ORDER BY id').all();
 const priorEventIds=new Set(eventsBefore.map(e=>e.id));
 if(JSON.stringify(eventsAfter.filter(e=>priorEventIds.has(e.id)))!==JSON.stringify(eventsBefore))throw new Error('Existing workflow history changed');
 const newEvents=eventsAfter.filter(e=>!priorEventIds.has(e.id));
 if(newEvents.length!==changed||newEvents.some(e=>!changedIds.has(e.revision_id)||e.from_state!=='draft'||e.to_state!=='draft'||JSON.parse(e.metadata_json).action!=='edited'))throw new Error('Unexpected workflow event');
 const unchangedBefore=revisionsBefore.filter(r=>!changedIds.has(r.id));
 const unchangedAfter=db.prepare('SELECT * FROM content_revisions ORDER BY id').all().filter(r=>!changedIds.has(r.id));
 if(JSON.stringify(unchangedBefore)!==JSON.stringify(unchangedAfter))throw new Error('Unrelated revision changed');
 tables.forEach((t,i)=>{if(fingerprint(db,t)!==before[i])throw new Error(`Protected data changed: ${t}`);});
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Foreign key violation');
 db.exec(apply?'COMMIT':'ROLLBACK');
 console.log({mode:apply?'apply':'rehearse-rollback',changed,protectedTables:tables.length,published:false});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}finally{db.close();}
