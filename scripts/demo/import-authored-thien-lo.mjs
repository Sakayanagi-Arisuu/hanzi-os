/** Import original page manuscripts into local Studio; never replace an editor's revision. */
import { readFileSync } from 'node:fs';
import { canonicalStudioJson } from '../../src/content/studioContent.ts';
import {authoredBatches} from '../content/authored-batch-registry.mjs';
import { importCurriculumStudio } from './import-curriculum-studio.mjs';
import { backupLocalDatabase, findLocalDemoDatabase, openDatabase, requireDemoAccounts, fingerprint } from './local-demo-database.mjs';

const manuscripts={
  'hsk2-daily-needs-family-lesson-01':{file:'thien-lo-hsk2-polite-request-v2.json',level:'hsk2'},
  'boot-1':{file:'thien-lo-boot-1-v2.json',level:'hsk0'},
  'professional-4':{file:'thien-lo-professional-4-v2.json',level:'hsk1'},
  'professional-3':{file:'thien-lo-professional-3-v2.json',level:'hsk1'},
  'professional-2':{file:'thien-lo-professional-2-v2.json',level:'hsk1'},
  'boot-2':{file:'thien-lo-boot-2-v2.json',level:'hsk0'},
  'professional-1':{file:'thien-lo-professional-1-v2.json',level:'hsk1'},
  'hsk3-cohesion-reconstruction-lesson-01':{file:'thien-lo-hsk3-timeline-v2.json',level:'hsk3'},
};
const selected=process.argv.find(arg=>arg.startsWith('--lesson='))?.slice('--lesson='.length)??'professional-1';
const batch=process.argv.find(arg=>arg.startsWith('--batch='))?.slice('--batch='.length);
if(batch && !Object.hasOwn(authoredBatches,batch))throw new Error('Unknown authored batch');
if(batch && process.argv.some(arg=>arg.startsWith('--lesson=')))throw new Error('Select a batch or a lesson, not both');
const drafts=batch
  ? JSON.parse(readFileSync(new URL(`../../content/drafts/${authoredBatches[batch].file}.json`,import.meta.url),'utf8')).items
  : (()=>{
    const manuscript=manuscripts[selected];
    if(!manuscript)throw new Error('Unknown authored lesson; select a registered manuscript.');
    const draft=JSON.parse(readFileSync(new URL(`../../content/drafts/${manuscript.file}`,import.meta.url),'utf8'));
    if(draft.lessonId!==selected)throw new Error('Manuscript selection mismatch');
    return [{...draft,level:manuscript.level}];
  })();
if(batch && JSON.stringify(drafts.map(d=>d.lessonId))!==JSON.stringify(authoredBatches[batch].lessonIds))throw new Error('Batch inventory mismatch');
const plan=drafts.map(draft=>{
  if(draft.studioContent?.targetLessonId!==draft.lessonId)throw new Error('Manuscript target mismatch');
  return {itemType:'lesson',level:draft.level,stableKey:`thien-lo-v2-${draft.lessonId}`,title:draft.title,content:draft.studioContent};
});
const apply = process.argv.includes('--apply');
const db = openDatabase(findLocalDemoDatabase(process.cwd()));
try {
  requireDemoAccounts(db);
  if (apply) await backupLocalDatabase(db, process.cwd(), 'before-authored-thien-lo-import');
  db.exec('BEGIN IMMEDIATE');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(row=>row.name).filter(name=>/^[a-z_]+$/.test(name));
  const before = tables.map(table=>fingerprint(db,table));
  for (const entry of plan) {
    const existing = db.prepare('SELECT r.content_json FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(entry.stableKey);
    if (existing && canonicalStudioJson(JSON.parse(existing.content_json)) !== canonicalStudioJson(entry.content)) throw new Error('Existing authored draft differs; preserve editor changes and reconcile explicitly.');
  }
  const inserted = await importCurriculumStudio(db,plan);
  if (await importCurriculumStudio(db,plan)) throw new Error('Import is not idempotent');
  tables.forEach((table,index)=>{if(fingerprint(db,table)!==before[index])throw new Error(`Protected data changed: ${table}`);});
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign key check failed');
  db.exec(apply?'COMMIT':'ROLLBACK');
  console.log({mode:apply?'apply':'rehearse-rollback',inserted,protectedTables:tables.length,published:false});
} catch(error) { if(db.isTransaction)db.exec('ROLLBACK');throw error; }
finally { db.close(); }
