/** Local demo fixture only. Run with tsx; never connects to remote D1. */
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { DEMO_USERS, findLocalDemoDatabase, requireDemoAccounts, openDatabase, backupLocalDatabase, fingerprint, d1Adapter } from './local-demo-database.mjs';
import { ContentStudioRepository } from '../../src/server/contentStudioRepository.ts';
import { ContentReleaseWorker, ContentReleaseWorkerRepository } from '../../src/server/contentReleaseWorker.ts';
import { AdminDashboardRepository } from '../../src/server/adminDashboardRepository.ts';
import { LearningProjectionRepository } from '../../src/server/learningProjectionRepository.ts';
import { ReviewQueueRepository } from '../../src/server/reviewQueueRepository.ts';
import { MistakeQueueRepository } from '../../src/server/mistakeQueueRepository.ts';
import { evolveSyncDocument, canonicalStringify } from '../../src/sync/document.ts';
import { RELEASED_VOCABULARY, CONTENT_VERSION } from '../../src/data/curriculum.ts';
import { studioStarterContent, validateStudioContent } from '../../src/content/studioContent.ts';
import { contentReleasePolicyForEnvironment } from '../../src/server/contentReleasePolicy.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = 'demo-workspace-v1';
const DAY = 86400000;
const sha = value => createHash('sha256').update(value).digest('hex');
const triple = (hanzi, pinyin, meaningVi) => ({ hanzi, pinyin, meaningVi });
const reviewed = { humanReviewed: false, aiSelfReview: {
  accuracy: true, levelFit: true, pedagogy: true, answerIntegrity: true, originality: true,
} };

// Original short practice examples. AI self-review checks Chinese/Pinyin/meaning,
// beginner scope, contextual use, consistency and originality. No human approval claim.
const words = [
  ['classroom','教室','jiàoshì','phòng học','我在教室里。','Wǒ zài jiàoshì lǐ.','Tôi ở trong phòng học.','published'],
  ['library','图书馆','túshūguǎn','thư viện','我去图书馆看书。','Wǒ qù túshūguǎn kàn shū.','Tôi đến thư viện đọc sách.','published'],
  ['teacher','老师','lǎoshī','giáo viên','我们的老师很好。','Wǒmen de lǎoshī hěn hǎo.','Giáo viên của chúng tôi rất tốt.','approved'],
  ['classmate','同学','tóngxué','bạn học','他是我的同学。','Tā shì wǒ de tóngxué.','Anh ấy là bạn học của tôi.','submitted'],
  ['study','学习','xuéxí','học tập','我每天学习中文。','Wǒ měitiān xuéxí Zhōngwén.','Tôi học tiếng Trung mỗi ngày.','submitted'],
  ['today','今天','jīntiān','hôm nay','今天我有中文课。','Jīntiān wǒ yǒu Zhōngwén kè.','Hôm nay tôi có tiết tiếng Trung.','validated'],
  ['tomorrow','明天','míngtiān','ngày mai','明天我去学校。','Míngtiān wǒ qù xuéxiào.','Ngày mai tôi đi đến trường.','draft'],
  ['book','书','shū','sách','这本书很好。','Zhè běn shū hěn hǎo.','Quyển sách này rất hay.','returned'],
];

function contentPlan() {
  const plan = words.map(([key,hanzi,pinyin,meaningVi,zh,py,vi,state]) => ({
    key, type: 'vocabulary', level: 'hsk1', title: `${hanzi} · ${meaningVi}`,
    state, content: { hanzi,pinyin,meaningVi,examples:[triple(zh,py,vi)],sourceLessonIds:['survival-1'],review:structuredClone(reviewed) },
  }));
  const grammars = [
    ['location','Nói vị trí với 在','Chủ ngữ + 在 + địa điểm','Dùng 在 để nói ai hoặc vật gì đang ở đâu.','我在学校。','Wǒ zài xuéxiào.','Tôi ở trường.','Không dùng 是 thay cho 在 khi nói vị trí.','Tự nói nơi bạn đang ở.','submitted'],
    ['question','Câu hỏi có/không với 吗','Câu kể + 吗？','Thêm 吗 cuối câu kể để tạo câu hỏi có hoặc không.','你是学生吗？','Nǐ shì xuésheng ma?','Bạn có phải là học sinh không?','Không thêm 吗 vào câu đã có từ nghi vấn 什么.','Đặt một câu hỏi về nghề nghiệp.','validated'],
    ['possession','Diễn đạt sở hữu với 有','Chủ ngữ + 有 + danh từ','Dùng 有 để nói ai đó có người hoặc vật gì.','我有一本书。','Wǒ yǒu yì běn shū.','Tôi có một quyển sách.','Phủ định của 有 thường dùng 没有.','Nói một vật bạn có trong cặp.','draft'],
  ];
  for (const [key,title,pattern,explanationVi,zh,py,vi,pitfallVi,checkpointVi,state] of grammars) {
    plan.push({ key,type:'grammar',level:'hsk1',title,state,
      content:{pattern,explanationVi,examples:[triple(zh,py,vi)],pitfallVi,checkpointVi,sourceLessonIds:['survival-1'],review:structuredClone(reviewed)} });
  }
  plan.push({key:'tone-contrast',type:'pronunciation',level:'hsk0',title:'Phân biệt thanh 1 và thanh 3',state:'draft',content:{
    ...studioStarterContent('pronunciation','hsk0'),targets:['mā / mǎ'],
    conceptVi:'Phân biệt thanh cao ngang với thanh thấp của âm ma.',
    ruleVi:'Nghe và đối chiếu âm mẫu; khi đọc riêng, thanh 3 có đường thấp xuống rồi lên.',
    checkpointVi:'Nghe hai âm ma và tự phân biệt thanh 1 với thanh 3.',
  }});
  return plan;
}

function insert(db, table, record) {
  const keys = Object.keys(record);
  return db.prepare(`INSERT OR IGNORE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`)
    .run(...keys.map(key=>record[key]));
}

function protect(db) {
  const tables = ['users','auth_identities','hanzi_password_credentials','user_roles','auth_sessions',
    'lesson_sessions','assessment_sessions','assessment_attempts','reader_sessions','xp_ledger','course_versions'];
  const output = Object.fromEntries(tables.map(t=>[t,fingerprint(db,t)]));
  output.eligibleEvidence = fingerprint(db,'learning_evidence','WHERE mastery_eligible=1');
  output.nonDemoDocuments = fingerprint(db,'learning_documents',"WHERE user_id NOT IN ('local-demo-user-1','local-demo-user-2','local-demo-user-3')");
  return output;
}

async function addEditorial(db, api) {
  const studio = new ContentStudioRepository(api);
  const author = {actorUserId:DEMO_USERS.editor.id,actorSessionId:null};
  const admin = {actorUserId:DEMO_USERS.admin.id,actorSessionId:null};
  for (const [index,entry] of contentPlan().entries()) {
    const stableKey = `${FIXTURE}-${entry.key}`;
    if (db.prepare('SELECT 1 FROM content_items WHERE stable_key=?').get(stableKey)) continue;
    const content = {...entry.content,demoProvenance:{fixture:FIXTURE,synthetic:true,purpose:'Trình diễn quy trình local',humanReviewed:false}};
    let revision = await studio.createDraft({...author,itemType:entry.type,stableKey,title:entry.title,level:entry.level,content,idempotencyKey:`${stableKey}:create`});
    await studio.setAssignment({...admin,revisionId:revision.id,expectedRowVersion:0,
      ownerUserId:DEMO_USERS.editor.id,reviewerUserId:DEMO_USERS.admin.id,
      priority:index%3===0?'high':'normal',dueAt:Date.now()+(index%4+1)*DAY,
      note:'Bộ dữ liệu demo local: rà ví dụ, nghĩa Việt và nguồn bài trước khi xử lý.',idempotencyKey:`${stableKey}:assign`});
    revision=await studio.getRevision(revision.id);
    if(entry.state==='draft') continue;
    revision=await studio.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`${stableKey}:validate`});
    if(!revision.validation?.valid) throw new Error(`Demo validation failed: ${stableKey} ${JSON.stringify(revision.validation)}`);
    if(entry.state==='validated') continue;
    const steps = entry.state==='returned'?['submitted','draft']:
      entry.state==='submitted'?['submitted']:entry.state==='approved'?['submitted','approved']:['submitted','approved','published'];
    for(const toState of steps) {
      if(toState==='draft') await drainDemoJobs(db,api);
      revision=await studio.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,
        idempotencyKey:`${stableKey}:${toState}`,requestId:randomUUID(),
        note:toState==='draft'?'Demo: bổ sung ví dụ phủ định và ngữ cảnh dùng lượng từ trước khi gửi lại.':'Chuyển trạng thái phục vụ trình diễn demo local; không phải thẩm định bởi người bản ngữ.'});
    }
  }
  await drainDemoJobs(db,api);
}

async function drainDemoJobs(db,api) {
  // Drain real release jobs only if all pending jobs belong to this fixture.
  const other = db.prepare(`SELECT COUNT(*) n FROM content_release_outbox_events e JOIN content_items i ON i.id=e.item_id
    WHERE e.status IN ('pending','processing') AND i.stable_key NOT LIKE ?`).get(`${FIXTURE}-%`).n;
  if(other) throw new Error('Có release job ngoài demo. Không xử lý hàng đợi của người dùng.');
  const worker = new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:100,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
  const drain=await worker.drain();
  if(drain.deadLettered||drain.retried) throw new Error(`Release demo chưa hoàn tất: ${JSON.stringify(drain)}`);
}

function addLearnerData(db, now) {
  const account=DEMO_USERS.learner;
  const docRow=db.prepare('SELECT * FROM learning_documents WHERE user_id=?').get(account.id);
  const document=JSON.parse(docRow.document_json);
  const epoch=document.reset.epoch;
  const enrollment=db.prepare("SELECT * FROM enrollments WHERE user_id=? AND status='active' AND course_version_id=?").get(account.id,CONTENT_VERSION);
  if(!enrollment) throw new Error('Demo learner chưa có enrollment hiện hành.');
  const activities=[
    ['grammar','daily-1:hsk-vocab-00046-sentence',`${CONTENT_VERSION}:daily-1:1`,'reading-comprehension','Không có ai ở đây.'],
    ['listening','boot-1:yi-listening',`${CONTENT_VERSION}:boot-1:1`,'listening-selection','hai'],
    ['pronunciation','boot-1:er-pinyin',`${CONTENT_VERSION}:boot-1:1`,'phonology-recognition','ér'],
    ['vocabulary','boot-1:er-meaning',`${CONTENT_VERSION}:boot-1:1`,'meaning-selection','một'],
  ];
  // Synthetic practice timeline is scoped and marked; no mastery, XP or completion is seeded.
  for(let day=0;day<7;day++) for(let n=0;n<4+day%3;n++) {
    const [skill,activityId,activityVersion,method,answer]=activities[n%activities.length];
    const key=`${FIXTURE}:practice:${epoch}:${day}:${n}`;
    const occurred=Math.max(enrollment.started_at,now-day*DAY-(n+1)*180000);
    const incorrect=n%3!==2;
    const base={user_id:account.id,enrollment_id:enrollment.id,reset_epoch:epoch,content_version:CONTENT_VERSION,activity_id:activityId,activity_version:activityVersion,source:'lesson',method,skill};
    insert(db,'idempotency_records',{id:`${key}:idem`,user_id:account.id,reset_epoch:epoch,scope:'learning-attempt-v1',idempotency_key:key,
      request_hash:sha(key),status:'completed',response_status:201,response_json:JSON.stringify({fixture:FIXTURE,synthetic:true}),created_at:occurred,updated_at:occurred,completed_at:occurred});
    const added=insert(db,'learning_attempts',{...base,id:`${key}:attempt`,session_id:null,device_id:null,device_sequence:null,idempotency_record_id:`${key}:idem`,schema_version:1,
      response_json:JSON.stringify({answer,fixture:FIXTURE,synthetic:true}),outcome:incorrect?'incorrect':'unverified',score:incorrect?0:null,
      used_hint:0,prior_exposure:1,required_for_pass:0,scoring_version:'objective-policy-v1',occurred_at:occurred,received_at:now});
    insert(db,'learning_evidence',{...base,id:`${key}:evidence`,attempt_id:`${key}:attempt`,session_id:null,schema_version:1,
      policy_version:'objective-policy-v1',outcome:incorrect?'incorrect':'unverified',score:incorrect?0:null,verified:incorrect?1:0,mastery_eligible:0,
      metadata_json:JSON.stringify({fixture:FIXTURE,synthetic:true,purpose:'local-demo',usedHint:false,priorExposure:true}),occurred_at:occurred,recorded_at:now});
    if(added.changes) insert(db,'sync_changes',{user_id:account.id,entity_type:'learning_attempt',entity_id:`${key}:attempt`,revision:1,reset_epoch:epoch,operation_id:key,operation:'upsert',payload_json:JSON.stringify({attemptId:`${key}:attempt`,fixture:FIXTURE}),occurred_at:now});
  }
  for(const [role,info] of Object.entries(DEMO_USERS)) {
    const row=db.prepare('SELECT * FROM learning_documents WHERE user_id=?').get(info.id);
    const previous=JSON.parse(row.document_json);
    if(previous.state.activityLog.some(e=>e.id===`${FIXTURE}:profile:${info.id}`)) continue;
    const state=structuredClone(previous.state);
    state.profile.name=role==='learner'?'Minh An · Demo':role==='editor'?'Linh Chi · Biên tập demo':'Quang Minh · Quản trị demo';
    const ids=RELEASED_VOCABULARY.slice(role==='learner'?0:12,role==='learner'?18:20).map(word=>word.id);
    state.savedWords=[...new Set([...state.savedWords,...ids])];
    state.activityLog.push({id:`${FIXTURE}:profile:${info.id}`,type:'practice',label:'Khởi tạo hồ sơ trình diễn · dữ liệu mẫu',xp:0,occurredAt:new Date(now).toISOString()});
    if(role==='learner') for(let day=0;day<7;day++) state.activityLog.push({id:`${FIXTURE}:activity:${day}`,type:'practice',label:['Luyện nghe và nhận diện thanh điệu · Demo','Đọc và ghi nhớ từ trong ngữ cảnh · Demo','Ôn từ vựng và sửa lỗi · Demo'][day%3],xp:0,occurredAt:new Date(now-day*DAY-1200000).toISOString()});
    const next=evolveSyncDocument(previous,previous.state,state,new Date(now),`${FIXTURE}:${info.id}`);
    const revision=row.revision+1;
    db.prepare('UPDATE learning_documents SET document_json=?,revision=?,updated_at=? WHERE user_id=? AND revision=?')
      .run(canonicalStringify(next),revision,now,info.id,row.revision);
    db.prepare('UPDATE profiles SET display_name=?,revision=revision+1,updated_at=? WHERE user_id=?').run(state.profile.name,now,info.id);
    insert(db,'sync_changes',{user_id:info.id,entity_type:'learning_document',entity_id:info.id,revision,reset_epoch:previous.reset.epoch,
      operation_id:`${FIXTURE}:document:${info.id}`,operation:'upsert',payload_json:canonicalStringify(next),occurred_at:now});
    insert(db,'audit_events',{id:`${FIXTURE}:audit:${info.id}`,category:'account',action:'demo.workspace.seeded',outcome:'success',actor_user_id:DEMO_USERS.admin.id,
      actor_session_id:null,target_type:'user',target_id:info.id,request_id:FIXTURE,metadata_json:JSON.stringify({fixture:FIXTURE,synthetic:true,username:info.username}),created_at:now});
  }
}

async function verify(db, api) {
  const fk=db.prepare('PRAGMA foreign_key_check').all();
  if(fk.length) throw new Error(`Foreign keys lỗi: ${fk.length}`);
  const bad=db.prepare('SELECT COUNT(*) n FROM learning_evidence WHERE id LIKE ? AND mastery_eligible<>0').get(`${FIXTURE}:%`).n;
  if(bad) throw new Error('Demo không được tạo mastery.');
  const studio=new ContentStudioRepository(api);
  for(const row of await studio.list({limit:100})) {
    if(!row.stableKey.startsWith(FIXTURE)||row.workflowState==='draft') continue;
    const validation=await validateStudioContent(row.itemType,row.content);
    if(!validation.result.valid) throw new Error(`Revision demo lỗi ${row.stableKey}`);
  }
  const localPolicy=contentReleasePolicyForEnvironment('development');
  const projection=new LearningProjectionRepository(api,localPolicy);
  for(const info of Object.values(DEMO_USERS)) await projection.readV4(info.id);
  const review=await new ReviewQueueRepository(api,localPolicy).read(DEMO_USERS.learner.id);
  const mistakes=await new MistakeQueueRepository(api,localPolicy).read(DEMO_USERS.learner.id);
  const overview=await new AdminDashboardRepository(api).overview();
  return {
    accounts:Object.values(DEMO_USERS).map(x=>x.username),
    revisions:db.prepare('SELECT workflow_state state,COUNT(*) count FROM content_revisions GROUP BY workflow_state').all(),
    releasedPackages:db.prepare('SELECT COUNT(*) n FROM content_release_packages').get().n,
    assignments:db.prepare('SELECT COUNT(*) n FROM content_revision_assignment_events').get().n,
    workflowEvents:db.prepare('SELECT COUNT(*) n FROM content_workflow_events').get().n,
    demoAttempts:db.prepare('SELECT COUNT(*) n FROM learning_attempts WHERE id LIKE ?').get(`${FIXTURE}:%`).n,
    reviewCards:review.cards?.length ?? review,
    mistakeItems:mistakes.items?.length ?? Object.keys(mistakes),
    overview,foreignKeyErrors:0,seededMasteryEvidence:0,
  };
}

async function seed(db) {
  requireDemoAccounts(db);
  const before=protect(db);
  const api=d1Adapter(db);
  db.exec('BEGIN IMMEDIATE');
  try {
    await addEditorial(db,api);
    addLearnerData(db,Date.now());
    const result=await verify(db,api);
    if(JSON.stringify(protect(db))!==JSON.stringify(before)) throw new Error('Protected data changed; rolling back.');
    db.exec('COMMIT');
    return result;
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

const mode=process.argv[2]??'--inspect';
if(!['--inspect','--rehearse','--apply'].includes(mode)) throw new Error('Use --inspect, --rehearse or --apply (local only).');
const path=findLocalDemoDatabase(ROOT);
const db=openDatabase(path,mode!=='--apply');
try {
  requireDemoAccounts(db);
  if(mode==='--inspect') console.log(JSON.stringify(await verify(db,d1Adapter(db)),null,2));
  else {
    const backupPath=await backupLocalDatabase(db,ROOT,'before-demo-workspace');
    console.log('Backup:',backupPath);
    const rehearsalPath=await backupLocalDatabase(db,ROOT,'demo-workspace-rehearsal');
    const rehearsal=openDatabase(rehearsalPath);
    try {
      const first=await seed(rehearsal);
      const before=fingerprint(rehearsal,'content_revisions')+fingerprint(rehearsal,'learning_attempts')+fingerprint(rehearsal,'learning_documents');
      await seed(rehearsal);
      const after=fingerprint(rehearsal,'content_revisions')+fingerprint(rehearsal,'learning_attempts')+fingerprint(rehearsal,'learning_documents');
      if(before!==after) throw new Error('Second seed is not idempotent.');
      console.log('Rehearsal + second-run idempotence passed:',JSON.stringify(first,null,2));
    } finally { rehearsal.close(); }
    if(mode==='--apply') console.log('Applied:',JSON.stringify(await seed(db),null,2));
    else console.log('Rehearsal only. Live D1 unchanged.');
  }
} finally { db.close(); }
