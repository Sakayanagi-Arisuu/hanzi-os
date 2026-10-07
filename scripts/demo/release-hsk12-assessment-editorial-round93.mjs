import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {canonicalStudioJson,studioStarterContent} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {ContentReleaseWorker,ContentReleaseWorkerRepository} from '../../src/server/contentReleaseWorker.ts';
import {loadPublishedEditorialHskMockExamDefinitions,resolveHskMockExamDefinitionByBlueprint} from '../../src/server/hskMockExamEditorialRepository.ts';
import {getHskMockExamDefinition} from '../../src/server/hskMockExamBank.ts';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,fingerprint,d1Adapter} from './local-demo-database.mjs';
const plan=JSON.parse(readFileSync('content/drafts/thien-lo-hsk12-assessment-editorial-round93.json','utf8'));
const apply=process.argv.includes('--apply'),receiptPath=plan.evidenceDocument.replace('.md','.json');
if(plan.entries.length!==110||plan.forms.length!==2||plan.humanReviewed!==false)throw Error('Invalid pinned plan');
for(const f of plan.sourceFiles)if(createHash('sha256').update(readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Pinned source changed');
if(apply&&existsSync(receiptPath))throw Error('Preserve receipt; do not replay');
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
 requireDemoAccounts(db);const backup=apply?await backupLocalDatabase(db,process.cwd(),'before-hsk12-assessment-editorial-round93'):null;
 db.exec('BEGIN IMMEDIATE');
 if(db.prepare("SELECT count(*) n FROM content_release_outbox_events WHERE status IN ('pending','processing')").get().n)throw Error('Unrelated jobs pending');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
 const before=tables.map(t=>fingerprint(db,t)),oldHeads=db.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all(),api=d1Adapter(db),repo=new ContentStudioRepository(api);
 const existing=await loadPublishedEditorialHskMockExamDefinitions(api);
 for(const f of plan.forms)if(existing.some(d=>d.examLevel===f.level&&d.formKey==='g'))throw Error('Preserve existing editorial G');
 for(const key of [...plan.entries.map(e=>e.stableKey),...plan.forms.map(f=>f.stableKey)])if(db.prepare('SELECT id FROM content_items WHERE stable_key=?').get(key))throw Error('Preserve content: '+key);
 const oldForms=canonicalStudioJson(plan.forms.map(f=>getHskMockExamDefinition(f.level,'a'))),author={actorUserId:'local-demo-user-2',actorSessionId:null},admin={actorUserId:'local-demo-user-3',actorSessionId:null},released=[];
 async function publish(entry){const key=entry.stableKey;let r=await repo.createDraft({...author,...entry,idempotencyKey:key+':create'});r=await repo.validateRevision({...author,revisionId:r.id,expectedRowVersion:r.rowVersion,idempotencyKey:key+':validate'});if(!r.validation?.valid)throw Error(JSON.stringify(r.validation));for(const toState of ['submitted','approved','published'])r=await repo.transition({...(toState==='submitted'?author:admin),revisionId:r.id,expectedRowVersion:r.rowVersion,toState,idempotencyKey:key+':'+toState,requestId:randomUUID(),note:'AI-assisted local assessment correction; humanReviewed:false.'});released.push({stableKey:key,revisionId:r.id,itemId:r.itemId,content:entry.content,itemType:entry.itemType});return r;}
 const revisions=new Map();for(const e of plan.entries)revisions.set(e.sourceItemVersion,(await publish(e)).id);
 const worker=new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:128,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
 async function drain(expected){let completed=0;for(let pass=0;completed<expected&&pass<10;pass++){const r=await worker.drain();if(r.retried||r.deadLettered||!r.completed)throw Error(JSON.stringify(r));completed+=r.completed;}if(completed!==expected)throw Error('Incomplete release');}
 await drain(110);const forms=[];
 for(const f of plan.forms){const content={...studioStarterContent('exam_form',f.level),examLevel:f.level,formKey:'g',timeLimitMinutes:f.timeLimitMinutes,itemStableKeys:f.selected.map(v=>revisions.get(v)),coverage:f.coverage,review:{humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}},editorialOrigin:{evidenceDocument:plan.evidenceDocument,humanReviewed:false}};const r=await publish({stableKey:f.stableKey,itemType:'exam_form',title:f.level.toUpperCase()+' · Khảo Luyện G · Nội dung đã rà',level:f.level,content});forms.push({...f,revisionId:r.id});}
 await drain(2);const definitions=await loadPublishedEditorialHskMockExamDefinitions(api),revisionIds=new Set(revisions.values());
 for(const f of forms){const d=definitions.find(d=>d.blueprint.id==='hsk-mock-editorial-'+f.revisionId);if(!d||d.bank.length!==f.selected.length||d.bank.some(x=>!revisionIds.has(x.sourceItemVersion)))throw Error('Missing reviewed form');if(canonicalStudioJson(d)!==canonicalStudioJson(await resolveHskMockExamDefinitionByBlueprint(api,d.blueprint.id)))throw Error('Pinned restore mismatch');f.blueprintId=d.blueprint.id;f.formVersion=d.blueprint.formVersion;}
 for(const r of released){if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(r.itemId)?.revision_id!==r.revisionId)throw Error('Head mismatch');const p=await repo.releasedRuntimeRevision(r.revisionId),{review,...expected}=r.content;if(r.itemType==='exam_item'){delete expected.answerIndex;delete expected.answer;delete expected.explanationVi;}if(canonicalStudioJson(p?.content)!==canonicalStudioJson(expected))throw Error('Runtime mismatch');if(r.itemType==='exam_item'&&('answerIndex' in p.content||'explanationVi' in p.content))throw Error('Public answer leak');}
 const newIds=new Set(released.map(r=>r.itemId));if(canonicalStudioJson(oldHeads)!==canonicalStudioJson(db.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all().filter(r=>!newIds.has(r.item_id))))throw Error('Other heads changed');if(oldForms!==canonicalStudioJson(plan.forms.map(f=>getHskMockExamDefinition(f.level,'a'))))throw Error('Old forms changed');tables.forEach((t,i)=>{if(fingerprint(db,t)!==before[i])throw Error('Protected data changed: '+t);});if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('FK failure');
 db.exec(apply?'COMMIT':'ROLLBACK');const receipt={mode:apply?'apply':'rehearse-rollback',backup,protectedTables:tables.length,completed:112,forms:forms.map(({level,blueprintId,formVersion})=>({level,blueprintId,formVersion})),releases:released.map(({stableKey,revisionId})=>({stableKey,revisionId}))};if(apply)writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');console.log({mode:receipt.mode,backup,completed:112,protectedTables:tables.length,forms:receipt.forms});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}finally{db.close();}
