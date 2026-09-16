import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {D1Database,D1PreparedStatement} from './d1';
import {LessonPageAttemptRepository} from './lessonPageAttemptRepository';
import {publishedLessonPageActivities} from './publishedLessonPageActivities';
import {emptyLessonBlock} from '../learning/lessonPages';
import {emptyLessonActivity} from '../learning/lessonActivities';
import {matchPageAttemptReceipt,parsePageAttemptCommand} from '../learning/pageAttemptCommand';
const {publishedRuntime,releasedLessonRuntimeRevisions}=vi.hoisted(()=>({publishedRuntime:vi.fn(),releasedLessonRuntimeRevisions:vi.fn()}));
vi.mock('./contentStudioRepository',()=>({ContentStudioRepository:class{publishedRuntime=publishedRuntime;releasedLessonRuntimeRevisions=releasedLessonRuntimeRevisions;}}));
let sqlite:DatabaseSync,db:D1Database;
const manifest={schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{schemaVersion:1,itemType:'lesson',level:'hsk0',stableKey:'boot-1',title:'Bài',revisionId:'rev',revision:1,contentSha256:'hash',publishedAt:1,content:{targetLessonId:'boot-1',lessonPages:{version:1,pages:[{id:'p',title:'Trang',layout:'focus',blocks:[{...emptyLessonBlock('b'),kind:'activity',body:'Điền',activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:['在'],explanation:'Vị trí'}}]}]}}}]};
beforeEach(()=>{
 sqlite=new DatabaseSync(':memory:');
 sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY,status TEXT); CREATE TABLE learning_documents(user_id TEXT PRIMARY KEY,document_json TEXT); INSERT INTO users VALUES('a','active'),('b','active');");
 sqlite.exec(readFileSync(new URL('../../drizzle/0025_lesson_page_attempts.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
 db={prepare(query:string){let values:unknown[]=[];const statement=sqlite.prepare(query);const args=()=>values as (string|number|null)[];
  const wrapped={bind(...v:unknown[]){values=v;return wrapped;},async first(){return statement.get(...args())??null;},async all(){return {success:true,results:statement.all(...args())};},async run(){const result=statement.run(...args());return {success:true,meta:{changes:Number(result.changes)}};}};
  return wrapped as D1PreparedStatement;
 },async batch(){throw new Error('Unexpected batch');}};
 publishedRuntime.mockReset();publishedRuntime.mockResolvedValue(manifest);
 releasedLessonRuntimeRevisions.mockReset();releasedLessonRuntimeRevisions.mockResolvedValue([]);
});
afterEach(()=>sqlite.close());
const command=async()=>{
 const entry=[...(await publishedLessonPageActivities(manifest)).values()][0];
 return {version:1,idempotencyKey:'one',resetEpoch:0,lessonId:'boot-1',activityId:entry.activityId,activityVersion:entry.activityVersion,occurredAt:'2026-09-14T10:00:00Z',response:{text:'在',answerIds:[],usedHint:false,priorFeedback:false,priorReveal:false}};
};
it('scores from published answers and deduplicates per owner without trusting a client score',async()=>{
 const repo=new LessonPageAttemptRepository(db),c=await command();
 const first=await repo.record('a',c);
 expect(matchPageAttemptReceipt(first,parsePageAttemptCommand(c)!)).toBe(true);
 expect(first.outcome).toBe('correct');expect(first.masteryEligible).toBe(false);
 expect(await repo.record('a',c)).toEqual({...first,duplicate:true});
 await expect(repo.record('a',{...c,response:{...c.response,text:'错'}})).rejects.toThrow('Idempotency');
 expect((await repo.record('b',c)).attemptId).not.toBe(first.attemptId);
 await expect(repo.record('a',{...c,score:100})).rejects.toThrow('Invalid');
 expect(sqlite.prepare('SELECT count(*) n FROM lesson_page_attempts').get()?.n).toBe(2);
});
it('closes a reset race during manifest loading and does not insert stale work',async()=>{
 const c=await command();
 publishedRuntime.mockImplementationOnce(async()=>{sqlite.prepare('INSERT INTO learning_documents VALUES(?,?)').run('a',JSON.stringify({reset:{epoch:1}}));return manifest;});
 await expect(new LessonPageAttemptRepository(db).record('a',c)).rejects.toThrow('stale reset');
 expect(sqlite.prepare('SELECT count(*) n FROM lesson_page_attempts').get()?.n).toBe(0);
});
it('rejects unavailable accounts and activity versions and cascades deletion',async()=>{
 const c=await command(),repo=new LessonPageAttemptRepository(db);
 await expect(repo.record('a',{...c,activityVersion:'stale'})).rejects.toThrow('version');
 sqlite.prepare("UPDATE users SET status='locked' WHERE id='a'").run();
 await expect(repo.record('a',c)).rejects.toThrow('Account unavailable');
 await repo.record('b',c);
 sqlite.prepare("DELETE FROM users WHERE id='b'").run();
 expect(sqlite.prepare('SELECT count(*) n FROM lesson_page_attempts').get()?.n).toBe(0);
});
it('rejects a duplicate after the account is locked without changing its original response',async()=>{
 const c=await command(),repo=new LessonPageAttemptRepository(db);
 await repo.record('a',c);
 sqlite.prepare("UPDATE users SET status='locked' WHERE id='a'").run();
 await expect(repo.record('a',c)).rejects.toThrow('Account unavailable');
 expect(sqlite.prepare('SELECT count(*) n FROM lesson_page_attempts').get()?.n).toBe(1);
});
it('checks reset again when a reset races a duplicate lookup',async()=>{
 const c=await command(),repo=new LessonPageAttemptRepository(db);
 await repo.record('a',c);
 const originalPrepare=db.prepare.bind(db);
 db.prepare=(query:string)=>{
  const statement=originalPrepare(query);
  if(query.startsWith('SELECT id,request_hash,outcome')){
   const originalFirst=statement.first.bind(statement);
   statement.first=async <T>()=>{
    const row=await originalFirst<T>();
    sqlite.prepare('INSERT INTO learning_documents VALUES(?,?)').run('a',JSON.stringify({reset:{epoch:1}}));
    return row;
   };
  }
  return statement;
 };
 await expect(repo.record('a',c)).rejects.toThrow('stale reset');
 expect(sqlite.prepare('SELECT count(*) n FROM lesson_page_attempts').get()?.n).toBe(1);
});
it('keeps feedback outcome separate from mastery and retains reported assistance',async()=>{
 const c=await command(),repo=new LessonPageAttemptRepository(db);
 const assisted={...c,response:{...c.response,usedHint:true,priorFeedback:true,priorReveal:true}};
 expect(await repo.record('a',assisted)).toMatchObject({outcome:'correct',masteryEligible:false});
 const row=sqlite.prepare('SELECT response_json FROM lesson_page_attempts').get();
 expect(JSON.parse(String(row?.response_json))).toEqual(assisted.response);
});
it('deduplicates concurrent submissions and allows the same key only in a new reset epoch',async()=>{
 const c=await command(),repo=new LessonPageAttemptRepository(db);
 const receipts=await Promise.all([repo.record('a',c),repo.record('a',c)]);
 expect(new Set(receipts.map(r=>r.attemptId)).size).toBe(1);
 expect(receipts.map(r=>r.duplicate).sort()).toEqual([false,true]);
 sqlite.prepare('INSERT INTO learning_documents VALUES(?,?)').run('a',JSON.stringify({reset:{epoch:1}}));
 await expect(repo.record('a',c)).rejects.toThrow('stale reset');
 const next=await repo.record('a',{...c,resetEpoch:1});
 expect(next.attemptId).not.toBe(receipts[0].attemptId);
 expect(next.duplicate).toBe(false);
 expect(sqlite.prepare('SELECT reset_epoch FROM lesson_page_attempts ORDER BY reset_epoch').all()).toEqual([{reset_epoch:0},{reset_epoch:1}]);
});

it('records an offline v1 command against its released answer after a new lesson revision',async()=>{
 const c=await command(),repo=new LessonPageAttemptRepository(db);
 const updated=structuredClone(manifest);
 updated.items[0].revisionId='new-revision';updated.items[0].revision=2;
 updated.items[0].content.lessonPages.pages[0].blocks[0].activity.acceptedAnswers=['有'];
 publishedRuntime.mockResolvedValue(updated);
 releasedLessonRuntimeRevisions.mockResolvedValue(manifest.items);
 const result=await repo.record('a',c);
 expect(result).toMatchObject({outcome:'correct',masteryEligible:false,duplicate:false});
 expect(releasedLessonRuntimeRevisions).toHaveBeenCalledWith('boot-1');
 expect(sqlite.prepare('SELECT revision_id,response_json FROM lesson_page_attempts').get()).toEqual({revision_id:'rev',response_json:JSON.stringify({answerIds:[],priorFeedback:false,priorReveal:false,text:'在',usedHint:false})});
 releasedLessonRuntimeRevisions.mockRejectedValue(new Error('history offline'));
 expect(await repo.record('a',c)).toEqual({...result,duplicate:true});
});

it('preserves an offline activity removed from the current revision without accepting a forged version',async()=>{
 const c=await command(),repo=new LessonPageAttemptRepository(db);
 publishedRuntime.mockResolvedValue({...manifest,items:[]});
 releasedLessonRuntimeRevisions.mockResolvedValue(manifest.items);
 expect(await repo.record('a',c)).toMatchObject({outcome:'correct',masteryEligible:false});
 await expect(repo.record('a',{...c,idempotencyKey:'forged',activityVersion:'forged'})).rejects.toThrow('not published');
 expect(sqlite.prepare('SELECT count(*) n FROM lesson_page_attempts').get()?.n).toBe(1);
});

it('fails closed on history errors and a reset during history resolution',async()=>{
 const c=await command(),repo=new LessonPageAttemptRepository(db);
 publishedRuntime.mockResolvedValue({...manifest,items:[]});
 releasedLessonRuntimeRevisions.mockRejectedValueOnce(new Error('digest fence'));
 await expect(repo.record('a',c)).rejects.toThrow('digest fence');
 releasedLessonRuntimeRevisions.mockImplementationOnce(async()=>{
  sqlite.prepare('INSERT INTO learning_documents VALUES(?,?)').run('a',JSON.stringify({reset:{epoch:1}}));
  return manifest.items;
 });
 await expect(repo.record('a',c)).rejects.toThrow('stale reset');
 expect(sqlite.prepare('SELECT count(*) n FROM lesson_page_attempts').get()?.n).toBe(0);
});
