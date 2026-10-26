import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {FixtureD1} from './testing/FixtureD1';
import {LessonPageAttemptRepository} from './lessonPageAttemptRepository';
import {LessonHistoryRepository} from './lessonHistoryRepository';
import {pageHistoryFixture} from '../learning/testing/pageHistoryFixture';
import {readingPageHistory} from '../learning/lessonPageHistory';
import {projectLessonHistory} from '../learning/lessonHistory';
const mocks=vi.hoisted(()=>({published:vi.fn()}));
vi.mock('./contentStudioRepository',()=>({ContentStudioRepository:class{publishedRuntime=mocks.published;}}));
let database:FixtureD1;
const ownerKey=`siwc_${'a'.repeat(64)}`;
beforeEach(()=>{
  database=new FixtureD1();
  for(const owner of ['a','b'])database.sql.prepare("INSERT INTO users(id,status,created_at,updated_at) VALUES(?,'active',1,1)").run(owner);
  mocks.published.mockReset();
});
afterEach(()=>{database.sql.close();vi.restoreAllMocks();});

it('rebuilds business observations after lost replies, with no analytics write or mastery authority',async()=>{
  const records=await readingPageHistory(ownerKey,0,pageHistoryFixture());
  const repository=new LessonPageAttemptRepository(database);
  for(const record of records){
    const receipt=await repository.record('a',record.command);
    expect(receipt).toMatchObject({outcome:'self-review',masteryEligible:false,duplicate:false});
    expect(await repository.record('a',record.command)).toEqual({...receipt,duplicate:true});
  }
  expect(mocks.published).not.toHaveBeenCalled();
  const page=await new LessonHistoryRepository(database).readPage('a',ownerKey,0);
  expect(page.events).toHaveLength(records.length);
  expect(page.events.every(event=>event.authority==='server-recorded'&&event.confirmationState==='confirmed'&&!event.masteryEligible)).toBe(true);
  expect(projectLessonHistory({ownerKey,resetEpoch:0},[...records.map(record=>record.event),...page.events])).toHaveLength(records.length);
  expect((await new LessonHistoryRepository(database).readPage('b','other',0)).events).toEqual([]);
  for(const table of ['learning_attempts','learning_evidence','xp_ledger','lesson_completions']){
    const exists=database.sql.prepare("SELECT name FROM sqlite_master WHERE name=?").get(table);
    if(exists)expect(database.sql.prepare(`SELECT count(*) AS count FROM ${table}`).get()?.count).toBe(0);
  }
});

it('paginates tied page timestamps, retains old bindings and backfills unknown time honestly',async()=>{
  const records=await readingPageHistory(ownerKey,0,pageHistoryFixture());
  for(const record of records)await new LessonPageAttemptRepository(database).record('a',record.command);
  database.sql.exec('UPDATE lesson_page_attempts SET created_at=100');
  const repository=new LessonHistoryRepository(database);
  const seen:string[]=[];
  let cursor=null;
  do{
    const page=await repository.readPage('a',ownerKey,0,{cursor,limit:3});
    seen.push(...page.events.map(event=>event.eventId));cursor=page.nextCursor;
  }while(cursor);
  expect(new Set(seen).size).toBe(records.length);
  expect(seen).toHaveLength(records.length);
  database.sql.prepare(`INSERT INTO lesson_page_attempts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('old','a',0,'old-operation','hash',
    'lesson-page:["boot-1","page","cloze"]','lesson-page-v1:sha256:old','boot-1','old-release',
    JSON.stringify({text:'错',answerIds:[],usedHint:true,priorFeedback:false,priorReveal:false}),'incorrect','',101);
  const event=(await repository.readPage('a',ownerKey,0)).events.find(entry=>entry.operationId==='old-operation')!;
  expect(event).toMatchObject({contentVersion:'lesson-page-v1:sha256:old',revisionId:'old-release',occurredAt:null,
    clockSource:'unknown',outcome:'incorrect',assistance:{hint:true},masteryEligible:false});
  expect((await repository.readPage('a',ownerKey,0)).events.filter(entry=>entry.operationId==='old-operation')).toHaveLength(1);
});

it('retains committed rows on response/DB errors and rejects owner/reset/identity conflicts',async()=>{
  const record=(await readingPageHistory(ownerKey,0,pageHistoryFixture()))[0];
  const repository=new LessonPageAttemptRepository(database);
  await repository.record('a',record.command);
  await expect(repository.record('a',{...record.command,response:{...record.command.response,text:'changed'}})).rejects.toThrow('another response');
  await expect(repository.record('a',{...record.command,idempotencyKey:'bad',activityId:'wrong'})).rejects.toThrow('source');
  database.sql.exec("INSERT INTO course_versions(id,course_id,schema_version,manifest_hash,release_state,created_at) VALUES('fixture','test',1,'hash','draft',1)");
  database.sql.prepare('INSERT INTO learning_documents(user_id,schema_version,content_version,revision,document_json,updated_at) VALUES(?,1,?,0,?,1)').run('a','fixture',JSON.stringify({reset:{epoch:1}}));
  await expect(repository.record('a',record.command)).rejects.toThrow();
  expect((await new LessonHistoryRepository(database).readPage('a',ownerKey,1)).events).toEqual([]);
  expect(database.sql.prepare('SELECT count(*) AS count FROM lesson_page_attempts').get()?.count).toBe(1);
});
