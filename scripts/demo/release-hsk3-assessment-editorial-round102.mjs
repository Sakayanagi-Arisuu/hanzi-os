import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {canonicalStudioJson,studioStarterContent} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {ContentReleaseWorker,ContentReleaseWorkerRepository} from '../../src/server/contentReleaseWorker.ts';
import {loadPublishedEditorialHskMockExamDefinitions,resolveHskMockExamDefinitionByBlueprint} from '../../src/server/hskMockExamEditorialRepository.ts';
import {getHskMockExamDefinition} from '../../src/server/hskMockExamBank.ts';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,fingerprint,d1Adapter} from './local-demo-database.mjs';
const plan=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-assessment-editorial-round102.json','utf8'));
const apply=process.argv.includes('--apply'),receiptPath=plan.evidenceDocument.replace('.md','.json');
if(plan.entries.length!==23||plan.selected.length!==80||plan.humanReviewed!==false)throw Error('Invalid pinned plan');
for(const f of plan.sourceFiles)if(createHash('sha256').update(readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Pinned source changed');
if(apply&&existsSync(receiptPath))throw Error('Preserve existing receipt; do not replay');
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
 requireDemoAccounts(db);
 const backup=apply?await backupLocalDatabase(db,process.cwd(),'before-hsk3-assessment-editorial-round102'):null;
 db.exec('BEGIN IMMEDIATE');
 if(db.prepare("SELECT count(*) n FROM content_release_outbox_events WHERE status IN ('pending','processing')").get().n)throw Error('Unrelated release jobs pending');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
 const before=tables.map(t=>fingerprint(db,t)),oldHeads=db.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all();
 const api=d1Adapter(db),repo=new ContentStudioRepository(api);
 if((await loadPublishedEditorialHskMockExamDefinitions(api)).some(d=>d.examLevel==='hsk3'&&d.formKey==='h'))throw Error('Preserve existing editorial H');
 for(const key of [...plan.entries.map(e=>e.stableKey),plan.formStableKey])if(db.prepare('SELECT id FROM content_items WHERE stable_key=?').get(key))throw Error('Preserve existing content: '+key);
 const oldDefinition=canonicalStudioJson(getHskMockExamDefinition('hsk3','b'));
 const author={actorUserId:'local-demo-user-2',actorSessionId:null},admin={actorUserId:'local-demo-user-3',actorSessionId:null},released=[];
 async function publish(entry){
  const key=entry.stableKey;
  let r=await repo.createDraft({...author,...entry,idempotencyKey:key+':create'});
  r=await repo.validateRevision({...author,revisionId:r.id,expectedRowVersion:r.rowVersion,idempotencyKey:key+':validate'});
  if(!r.validation?.valid)throw Error(JSON.stringify(r.validation));
  for(const toState of ['submitted','approved','published'])r=await repo.transition({...(toState==='submitted'?author:admin),revisionId:r.id,expectedRowVersion:r.rowVersion,toState,idempotencyKey:key+':'+toState,requestId:randomUUID(),note:'AI-assisted local assessment editorial correction; humanReviewed:false.'});
  released.push({stableKey:key,revisionId:r.id,itemId:r.itemId,content:entry.content});return r;
 }
 const revisions=new Map(), reusedPackages=[];
 for(const pinned of plan.reused){const source=await repo.getRevision(pinned.revisionId),publication=await repo.releasedRuntimeRevision(pinned.revisionId);if(!publication||source.contentSha256!==pinned.contentSha256||publication.contentSha256!==pinned.contentSha256||!['published','archived'].includes(source.workflowState))throw Error('Immutable reused source changed');revisions.set(pinned.sourceItemVersion,pinned.revisionId);reusedPackages.push({id:pinned.revisionId,package:canonicalStudioJson(publication)});}
 for(const e of plan.entries)revisions.set(e.sourceItemVersion,(await publish(e)).id);
 const worker=new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:128,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
 async function drain(expected){let completed=0;for(let pass=0;completed<expected&&pass<10;pass++){const r=await worker.drain();if(r.retried||r.deadLettered||!r.completed)throw Error(JSON.stringify(r));completed+=r.completed;}if(completed!==expected)throw Error('Incomplete release');}
 await drain(23);
 const content={...studioStarterContent('exam_form','hsk3'),examLevel:'hsk3',formKey:'h',timeLimitMinutes:90,itemStableKeys:plan.selected.map(v=>revisions.get(v)),coverage:{listening:40,reading:30,writing:10},review:{humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}},editorialOrigin:{evidenceDocument:plan.evidenceDocument,humanReviewed:false,scope:'Future local form with reviewed source explanations; synthetic listening and writing selection remain practice only.'}};
 const form=await publish({stableKey:plan.formStableKey,itemType:'exam_form',title:'HSK3 · Khảo Luyện H · Nội dung đã rà',level:'hsk3',content});
 await drain(1);
 const definitions=await loadPublishedEditorialHskMockExamDefinitions(api),definition=definitions.find(d=>d.blueprint.id==='hsk-mock-editorial-'+form.id);
 if(!definition||definition.bank.length!==80||definition.bank.some(x=>![...revisions.values()].includes(x.sourceItemVersion)))throw Error(JSON.stringify({reason:'Runtime form references unreviewed sources',formId:form.id,definitions:definitions.map(d=>({id:d.blueprint.id,count:d.bank.length})),publishedForm:(await repo.releasedRuntimeRevision(form.id))?.content}));
 if(canonicalStudioJson(definition)!==canonicalStudioJson(await resolveHskMockExamDefinitionByBlueprint(api,definition.blueprint.id)))throw Error('Pinned resume mismatch');
 for(const r of released){if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(r.itemId)?.revision_id!==r.revisionId)throw Error('Head mismatch');const p=await repo.releasedRuntimeRevision(r.revisionId);const {review,...expected}=r.content;if(r.stableKey!==plan.formStableKey){delete expected.answerIndex;delete expected.answer;delete expected.explanationVi;}if(canonicalStudioJson(p?.content)!==canonicalStudioJson(expected))throw Error('Runtime mismatch');if(r.stableKey!==plan.formStableKey&&('answerIndex' in p.content||'explanationVi' in p.content))throw Error('Private answers exposed');}
 const newIds=new Set(released.map(r=>r.itemId));
 if(canonicalStudioJson(oldHeads)!==canonicalStudioJson(db.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all().filter(r=>!newIds.has(r.item_id))))throw Error('Other heads changed');
 for(const p of reusedPackages)if(p.package!==canonicalStudioJson(await repo.releasedRuntimeRevision(p.id)))throw Error('Reused package changed');
 if(oldDefinition!==canonicalStudioJson(getHskMockExamDefinition('hsk3','b')))throw Error('Old form changed');
 tables.forEach((t,i)=>{if(fingerprint(db,t)!==before[i])throw Error('Protected data changed: '+t);});
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('FK failure');
 db.exec(apply?'COMMIT':'ROLLBACK');
 const receipt={mode:apply?'apply':'rehearse-rollback',backup,protectedTables:tables.length,completed:24,formBlueprintId:definition.blueprint.id,formVersion:definition.blueprint.formVersion,releases:released.map(({stableKey,revisionId})=>({stableKey,revisionId}))};
 if(apply)writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
 console.log({mode:receipt.mode,backup,completed:24,protectedTables:tables.length,formBlueprintId:receipt.formBlueprintId});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}finally{db.close();}
