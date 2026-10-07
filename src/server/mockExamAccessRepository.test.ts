import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { D1Database, D1PreparedStatement, D1RunResult } from './d1';
import { MockExamAccessRepository } from './mockExamAccessRepository';
import { HSK_EXAM_FORM_KEYS, HSK_EXAM_LEVELS } from '../assessment/hskExamStructure';

class Statement implements D1PreparedStatement {
  private values: (string|number|null)[]=[];
  constructor(private statement: StatementSync){}
  bind(...values:unknown[]){this.values=values as (string|number|null)[];return this;}
  async first<T>():Promise<T|null>{return (this.statement.get(...this.values) as T|undefined)??null;}
  async all<T>():Promise<D1RunResult<T>>{return {success:true,results:this.statement.all(...this.values) as T[]};}
  async run<T>():Promise<D1RunResult<T>>{return {success:true,meta:{changes:Number(this.statement.run(...this.values).changes)}};}
}
function database(){
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync('drizzle/0032_mock_exam_access.sql','utf8'));
  sqlite.exec(`CREATE TABLE audit_events(id TEXT PRIMARY KEY,category TEXT,action TEXT,outcome TEXT,actor_user_id TEXT,actor_session_id TEXT,target_type TEXT,target_id TEXT,request_id TEXT,metadata_json TEXT,created_at INTEGER);
    CREATE TABLE assessment_sessions(id TEXT PRIMARY KEY);INSERT INTO assessment_sessions VALUES ('kept-session');`);
  const db:D1Database={prepare(query){return new Statement(sqlite.prepare(query));},async batch<T>(statements:D1PreparedStatement[]){
    sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run<T>());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}
  }};
  return {db,sqlite};
}
describe('Phòng Luyện Đề: quyền theo từng cửa',()=>{
  it('opens exactly A B C by default on every level, with per-door and published overrides',async()=>{
    const {db,sqlite}=database();const repo=new MockExamAccessRepository(db,42);
    for(const level of HSK_EXAM_LEVELS){
      const tiers=await Promise.all(HSK_EXAM_FORM_KEYS.map(key=>repo.tierFor(level,key)));
      expect(tiers.filter(tier=>tier==='free')).toHaveLength(3);
      expect(tiers.slice(0,3)).toEqual(['free','free','free']);
    }
    expect(await repo.tierFor('hsk3','g','free')).toBe('free');
    await repo.setTier('hsk3','g','premium','editor','session','one');
    expect(await repo.tierFor('hsk3','g','free')).toBe('premium');
    await repo.setTier('hsk1','d','free','editor',null,'two');
    expect(await repo.tierFor('hsk1','d')).toBe('free');
    expect(await repo.tierFor('hsk2','d')).toBe('premium');
    expect((await repo.rules()).get('hsk1:d')).toBe('free');
    expect(sqlite.prepare('SELECT id FROM assessment_sessions').get()).toEqual({id:'kept-session'});
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM audit_events').get()).toEqual({n:2});
  });
  it('rejects invalid inputs and rolls back policy when audit fails',async()=>{
    const {db,sqlite}=database();const repo=new MockExamAccessRepository(db);
    await expect(repo.setTier('hsk0','d','free','editor',null,'x')).rejects.toThrow();
    await expect(repo.setTier('hsk1','z','free','editor',null,'x')).rejects.toThrow();
    await expect(repo.setTier('hsk1','d','anything','editor',null,'x')).rejects.toThrow();
    sqlite.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
    await expect(repo.setTier('hsk1','d','free','editor',null,'x')).rejects.toThrow('audit unavailable');
    expect(await repo.tierFor('hsk1','d')).toBe('premium');
  });
});
