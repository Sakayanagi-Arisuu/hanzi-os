import {createHash} from 'node:crypto';

const mediaId='restore-lesson-media';
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const imageHash=createHash('sha256').update(image).digest('hex');
const metadata=JSON.stringify({title:'Ảnh kiểm tra khôi phục',alt:'Một điểm ảnh',caption:'Học liệu kiểm thử',provenance:'Original restore fixture',license:'CC0',sourceKind:'original',humanReviewed:false,focalX:25,focalY:70});
const response=JSON.stringify({text:'我没去过北京。',answerIds:[],usedHint:true,everRevealed:true});

export function seedThienLoRestoreFixture(db){
 db.exec('BEGIN IMMEDIATE');
 try{
  const day=db.prepare('INSERT INTO learner_access_days (user_id,day,first_seen_at,provenance) VALUES (?,?,?,?)');
  day.run('restore-user','2026-09-19',1,'visit');
  day.run('restore-user','2026-09-20',2,'visit');
  day.run('migration-legacy-user','2026-09-20',3,'visit');
  db.prepare('INSERT INTO lesson_media_assets (id,content_sha256,mime_type,byte_length,metadata_json,created_by,created_at) VALUES (?,?,?,?,?,?,?)').run(mediaId,imageHash,'image/png',image.length,metadata,'restore-user',1);
  const chunk=db.prepare('INSERT INTO lesson_media_chunks (asset_id,sequence,data_base64) VALUES (?,?,?)');
  // Match the repository: split base64 text on a four-character boundary.
  const encoded=image.toString('base64');
  chunk.run(mediaId,0,encoded.slice(0,24));
  chunk.run(mediaId,1,encoded.slice(24));
  const attempt=db.prepare(`INSERT INTO lesson_page_attempts
   (id,user_id,reset_epoch,idempotency_key,request_hash,activity_id,activity_version,lesson_id,revision_id,response_json,outcome,occurred_at,created_at)
   VALUES (?,?,?,'same-key','request-hash','restore-page:choice','version-1','restore-lesson','revision-1',?,?, '2026-09-20T00:00:00.000Z',1)`);
  attempt.run('restore-page-current','restore-user',0,response,'incorrect');
  attempt.run('restore-page-new-epoch','restore-user',1,response,'self-review');
  attempt.run('restore-page-other-owner','migration-legacy-user',0,response,'correct');
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}

export function readThienLoRestoreFixture(db){
 return {
  days:db.prepare('SELECT * FROM learner_access_days ORDER BY user_id,day').all(),
  assets:db.prepare('SELECT * FROM lesson_media_assets ORDER BY id').all(),
  chunks:db.prepare('SELECT * FROM lesson_media_chunks ORDER BY asset_id,sequence').all(),
  attempts:db.prepare('SELECT * FROM lesson_page_attempts ORDER BY id').all(),
 };
}

export function assertThienLoRestoreFixture(db,expected){
 const actual=readThienLoRestoreFixture(db);
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Thiên Lộ restore changed visit days, media, or page attempt receipts');
 if(actual.days.length!==3||actual.assets.length!==1||actual.chunks.length!==2||actual.attempts.length!==3)throw new Error('Thiên Lộ restore fixture is incomplete');
 const bytes=Buffer.from(actual.chunks.map(row=>row.data_base64).join(''),'base64');
 if(!bytes.equals(image)||actual.assets[0].byte_length!==bytes.length||actual.assets[0].content_sha256!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Restored media bytes do not match the stored hash');
 const reject=(sql,errorText)=>{
  try{db.exec(sql);}catch(error){if(String(error).includes(errorText))return;throw error;}
  throw new Error(`Restored constraint did not reject: ${errorText}`);
 };
 // Exercise restored constraints without leaving mutations behind, even on failure.
 db.exec('SAVEPOINT thien_lo_restore_constraints');
 try{
  reject("INSERT INTO learner_access_days VALUES ('restore-user','2026-09-20',9,'visit')",'UNIQUE constraint failed');
  reject("UPDATE learner_access_days SET user_id='missing-user' WHERE user_id='restore-user'",'FOREIGN KEY constraint failed');
  reject("UPDATE lesson_media_assets SET metadata_json='broken'",'lesson_media_metadata_valid');
  reject('UPDATE lesson_media_assets SET byte_length=0','lesson_media_size_valid');
  reject("UPDATE lesson_media_chunks SET asset_id='missing-asset'",'FOREIGN KEY constraint failed');
  reject("UPDATE lesson_page_attempts SET reset_epoch=-1",'lesson_page_attempt_epoch');
  reject("UPDATE lesson_page_attempts SET response_json='broken'",'lesson_page_attempt_response');
  reject("UPDATE lesson_page_attempts SET outcome='mastered'",'lesson_page_attempt_outcome');
  reject("UPDATE lesson_page_attempts SET reset_epoch=0 WHERE id='restore-page-new-epoch'",'UNIQUE constraint failed');
  reject("UPDATE lesson_page_attempts SET user_id='missing-user' WHERE id='restore-page-current'",'FOREIGN KEY constraint failed');
 }finally{
  db.exec('ROLLBACK TO thien_lo_restore_constraints');
  db.exec('RELEASE thien_lo_restore_constraints');
 }
 if(JSON.stringify(readThienLoRestoreFixture(db))!==JSON.stringify(expected))throw new Error('Constraint probes changed restored Thiên Lộ data');
 return {visitDays:3,mediaAssets:1,mediaChunks:2,pageAttempts:3,mediaBytes:'exact',ownerEpochIdempotency:'preserved',constraints:'ok'};
}
