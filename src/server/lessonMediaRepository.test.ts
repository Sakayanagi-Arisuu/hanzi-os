import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { D1Database, D1PreparedStatement, D1RunResult } from './d1';
import { LessonMediaRepository } from './lessonMediaRepository';
import { ContentStudioRepository } from './contentStudioRepository';
const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migrations = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n")
  .replaceAll("--> statement-breakpoint", "");

class SQLiteStatement implements D1PreparedStatement {
  private parameters: unknown[] = [];
  constructor(private readonly statement: StatementSync, private readonly query: string) {}
  bind(...values: unknown[]) { this.parameters = values; return this; }
  private values() { return this.parameters as Array<string | number | bigint | Uint8Array | null>; }
  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const row = this.statement.get(...this.values()) as Record<string, unknown> | undefined;
    return row ? (columnName ? row[columnName] : row) as T : null;
  }
  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return { success: true, results: this.statement.all(...this.values()) as T[] };
  }
  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    if (/^\s*(?:SELECT|WITH)\b/iu.test(this.query)) return this.all<T>();
    const result = this.statement.run(...this.values());
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SQLiteD1 implements D1Database {
  readonly sqlite = new DatabaseSync(":memory:");
  constructor() {
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    this.sqlite.exec(migrations);
  }
  prepare(query: string) { return new SQLiteStatement(this.sqlite.prepare(query), query); }
  async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]) {
    this.sqlite.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) results.push(await statement.run<T>());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}


const metadata={title:'Campus',alt:'Cây và trường học',caption:'',provenance:'HANZI.OS original',license:'Original',sourceKind:'original',transcript:'',focalX:50,focalY:50,humanReviewed:true};
const dataBase64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
function setup(){const db=new SQLiteD1();db.sqlite.prepare("INSERT INTO users(id,status,created_at,updated_at) VALUES('editor','active',1,1)").run();return {db,repo:new LessonMediaRepository(db)};}
describe('lesson media storage',()=>{
 it('pages beyond 100 assets without dropping equal timestamps and filters before paging',async()=>{const {db,repo}=setup();try{
   const insert=db.sqlite.prepare('INSERT INTO lesson_media_assets(id,content_sha256,mime_type,byte_length,metadata_json,created_by,created_at) VALUES(?,?,?,?,?,?,?)');
   for(let i=0;i<105;i++)insert.run(`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,'fixture','image/png',1,JSON.stringify({...metadata,title:i===0?'Unique oldest illustration':`Asset ${i}`}), 'editor',100);
   const ids:string[]=[];let cursor:string|null=null;
   do{const page=await repo.listPage({kind:'image',cursor:cursor??undefined});ids.push(...page.assets.map(a=>a.id));cursor=page.nextCursor;}while(cursor);
   expect(ids).toHaveLength(105);expect(new Set(ids).size).toBe(105);
   expect((await repo.listPage({query:'Unique oldest'})).assets).toHaveLength(1);
   expect((await repo.listPage({kind:'audio'})).assets).toEqual([]);
   await expect(repo.listPage({cursor:'broken'})).rejects.toThrow('không hợp lệ');
 }finally{db.sqlite.close();}});
 it('roundtrips bytes and never adopts a submitted human-review claim',async()=>{const {db,repo}=setup();try{const asset=await repo.upload({mimeType:'image/png',dataBase64,metadata,actorUserId:'editor'});expect(asset.metadata.humanReviewed).toBe(false);expect(Buffer.from(await repo.bytes(asset.id)).toString('base64')).toBe(dataBase64);expect(await repo.isReleased(asset.url)).toBe(false);expect(await repo.missingReferences({pages:[{imageSrc:asset.url}]})).toEqual([]);expect(await repo.missingReferences({media:{src:asset.url.replace('.png','.mp3')}})).toHaveLength(1);await expect(repo.deleteUnused(asset.id,'someone-else')).rejects.toThrow();await repo.deleteUnused(asset.id,'editor');expect(await repo.get(asset.id)).toBeNull();}finally{db.sqlite.close();}});
 it('protects media referenced by a saved draft',async()=>{const {db,repo}=setup();try{const asset=await repo.upload({mimeType:'image/png',dataBase64,metadata,actorUserId:'editor'});await new ContentStudioRepository(db).createDraft({actorUserId:'editor',actorSessionId:null,itemType:'lesson',stableKey:'hsk1.lesson.media-test',title:'Media draft',level:'hsk1',content:{imageSrc:asset.url},idempotencyKey:'media-test-create'});expect((await repo.list())[0].usages).toHaveLength(1);await expect(repo.deleteUnused(asset.id,'editor')).rejects.toThrow('đang được');}finally{db.sqlite.close();}});
 it('rejects spoofed MIME and missing provenance',async()=>{const {db,repo}=setup();try{await expect(repo.upload({mimeType:'audio/mpeg',dataBase64,metadata:{...metadata,transcript:'你好'},actorUserId:'editor'})).rejects.toThrow('Định dạng');await expect(repo.upload({mimeType:'image/png',dataBase64,metadata:{...metadata,license:''},actorUserId:'editor'})).rejects.toThrow('quyền');}finally{db.sqlite.close();}});
});
