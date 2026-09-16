/** User-authorized local release of the source-bound contextual practice batch. */
import { randomUUID } from 'node:crypto';
import { curriculumStudioPlan } from './import-curriculum-studio.mjs';
import { canonicalStudioJson, validateStudioContent } from '../../src/content/studioContent.ts';
import { parsePublishedStudioLearning } from '../../src/content/publishedStudioLessons.ts';
import { ContentStudioRepository } from '../../src/server/contentStudioRepository.ts';
import { ContentReleaseWorker, ContentReleaseWorkerRepository } from '../../src/server/contentReleaseWorker.ts';
import { backupLocalDatabase, findLocalDemoDatabase, openDatabase, requireDemoAccounts, fingerprint, d1Adapter } from './local-demo-database.mjs';

const apply = process.argv.includes('--apply');
const db = openDatabase(findLocalDemoDatabase(process.cwd()));
try {
  requireDemoAccounts(db);
  const plan = curriculumStudioPlan().filter(item => item.itemType === 'communicative_function');
  const api = d1Adapter(db);
  const repo = new ContentStudioRepository(api);
  const author = { actorUserId: 'local-demo-user-2', actorSessionId: null };
  const admin = { actorUserId: 'local-demo-user-3', actorSessionId: null };
  if (apply) await backupLocalDatabase(db, process.cwd(), 'before-context-release');
  db.exec('BEGIN IMMEDIATE');
  const protectedTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(row => row.name).filter(name => /^[a-z_]+$/.test(name) && name !== 'audit_events');
  const before = protectedTables.map(table => fingerprint(db,table));
  if (db.prepare("SELECT count(*) n FROM content_release_outbox_events e JOIN content_items i ON i.id=e.item_id WHERE e.status IN ('pending','processing') AND i.stable_key NOT LIKE 'curriculum-context-%'").get().n) throw new Error('Unrelated release jobs must remain untouched');
  let published = 0;
  for (const entry of plan) {
    const row = db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(entry.stableKey);
    if (!row) throw new Error(`Missing draft: ${entry.stableKey}`);
    let revision = await repo.getRevision(row.id);
    if (revision.workflowState === 'published') continue;
    // Never approve editor changes using a source-only audit.
    if (revision.workflowState !== 'draft' || canonicalStudioJson(revision.content) !== canonicalStudioJson(entry.content)) throw new Error(`Editor changes need a separate review: ${entry.stableKey}`);
    const content = { ...entry.content, review: { humanReviewed: false, aiSelfReview: { accuracy: true, levelFit: true, pedagogy: true, answerIntegrity: true, originality: true } },
      localReview: { scope: 'Source-preserving contextual recall; exact released Chinese/Pinyin/Vietnamese triples, original Vietnamese prompt wrapper, open model answer, no automatic speaking score.', sourceVersion: entry.content.provenance.contentVersion, reviewedAt: '2026-09-11', humanReviewed: false } };
    for (const task of content.tasks) {
      if (!task.answerPinyin || !task.answerMeaningVi || !content.sourceVocabularyIds.includes(task.sourceVocabularyId)) throw new Error('Incomplete task linkage');
    }
    const validated = await validateStudioContent(entry.itemType,content);
    if (!validated.result.valid) throw new Error(JSON.stringify(validated.result.errors));
    parsePublishedStudioLearning({schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{...entry,revision:1,revisionId:revision.id,schemaVersion:1,contentSha256:validated.result.contentSha256,publishedAt:Date.now(),content}]});
    revision = await repo.updateDraft({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:revision.title,level:revision.level,content,idempotencyKey:`${entry.stableKey}:source-review-v1`});
    revision = await repo.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`${entry.stableKey}:validate-v1`});
    if (!revision.validation?.valid) throw new Error('Validation did not pass');
    for (const toState of ['submitted','approved','published']) {
      revision = await repo.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,idempotencyKey:`${entry.stableKey}:${toState}-v1`,requestId:randomUUID(),note:'Phát hành local theo yêu cầu người dùng; rà soát AI trên nguồn hiện hành, humanReviewed:false; không phải chứng nhận năng lực.'});
    }
    published++;
  }
  const worker = new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:100,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
  let completed = 0;
  for (let batch=0;batch<20;batch++) {
    const result = await worker.drain();
    if (result.deadLettered || result.retried) throw new Error(JSON.stringify(result));
    completed += result.completed;
    if (!result.claimed) break;
  }
  if (db.prepare("SELECT count(*) n FROM content_release_outbox_events e JOIN content_items i ON i.id=e.item_id WHERE e.status IN ('pending','processing') AND i.stable_key LIKE 'curriculum-context-%'").get().n) throw new Error('Release jobs still pending');
  protectedTables.forEach((table,index) => { if(fingerprint(db,table)!==before[index]) throw new Error(`Protected data changed: ${table}`); });
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign key check failed');
  console.log({mode:apply?'apply':'rehearse-rollback',published,completed,protectedTables:protectedTables.length});
  db.exec(apply?'COMMIT':'ROLLBACK');
} catch(error) { if(db.isTransaction) db.exec('ROLLBACK'); throw error; }
finally { db.close(); }
