import { LESSON_MEDIA_MAX_BYTES, lessonMediaUrl, mediaBytesMatchMime, validateMediaMetadata, type LessonMediaAsset, type LessonMediaMetadata } from '../content/lessonMedia';
import type { D1Database } from './d1';

type Row={id:string;mimeType:string;byteLength:number;metadataJson:string;createdAt:number;createdBy:string};
const select='SELECT id, mime_type AS mimeType, byte_length AS byteLength, metadata_json AS metadataJson, created_at AS createdAt, created_by AS createdBy FROM lesson_media_assets';
export class LessonMediaRepository {
  constructor(private readonly db:D1Database) {}
  async usages(url:string) {
    const result=await this.db.prepare('SELECT id, title, workflow_state AS state FROM content_revisions WHERE instr(content_json, ?) > 0 ORDER BY created_at DESC LIMIT 100').bind(url).all<{id:string;title:string;state:string}>();
    if(!result.success)throw new Error('Không đọc được nơi sử dụng học liệu.');
    return result.results??[];
  }
  async list():Promise<LessonMediaAsset[]> {
    return (await this.listPage()).assets;
  }
  async listPage(input:{kind?:string;query?:string;cursor?:string;limit?:number}={}) {
    const limit=input.limit??30;
    if(!Number.isInteger(limit)||limit<1||limit>100)throw new TypeError('Số học liệu mỗi trang không hợp lệ.');
    if(input.kind&&input.kind!=='image'&&input.kind!=='audio')throw new TypeError('Loại học liệu không hợp lệ.');
    const query=(input.query??'').trim();
    if(query.length>160)throw new TypeError('Từ tìm kiếm quá dài.');
    const conditions:string[]=[];const params:(string|number)[]=[];
    if(input.kind){conditions.push('mime_type LIKE ?');params.push(`${input.kind}/%`);}
    if(query){conditions.push("instr(lower(json_extract(metadata_json,'$.title') || ' ' || json_extract(metadata_json,'$.caption') || ' ' || json_extract(metadata_json,'$.provenance')),lower(?)) > 0");params.push(query);}
    if(input.cursor){
      let cursor:unknown;try{cursor=JSON.parse(input.cursor);}catch{throw new TypeError('Vị trí tải tiếp không hợp lệ.');}
      if(!Array.isArray(cursor)||cursor.length!==2||!Number.isSafeInteger(cursor[0])||cursor[0]<0||typeof cursor[1]!=='string'||!/^[0-9a-f-]{36}$/.test(cursor[1]))throw new TypeError('Vị trí tải tiếp không hợp lệ.');
      conditions.push('(created_at < ? OR (created_at = ? AND id < ?))');params.push(cursor[0],cursor[0],cursor[1]);
    }
    const rows=await this.db.prepare(`${select}${conditions.length?` WHERE ${conditions.join(' AND ')}`:''} ORDER BY created_at DESC,id DESC LIMIT ?`).bind(...params,limit+1).all<Row>();
    if(!rows.success)throw new Error('Không đọc được kho học liệu.');
    const page=(rows.results??[]).slice(0,limit);const last=page.at(-1);
    const assets=await Promise.all(page.map(async row=>({id:row.id,mimeType:row.mimeType,byteLength:row.byteLength,createdAt:row.createdAt,metadata:JSON.parse(row.metadataJson),url:lessonMediaUrl(row.id,row.mimeType),usages:await this.usages(lessonMediaUrl(row.id,row.mimeType))})));
    return {assets,nextCursor:(rows.results??[]).length>limit&&last?JSON.stringify([last.createdAt,last.id]):null};
  }
  async upload(input:{mimeType:string;dataBase64:string;metadata:unknown;actorUserId:string}):Promise<LessonMediaAsset> {
    if(!validateMediaMetadata(input.metadata,input.mimeType))throw new TypeError('Cần tên, mô tả/transcript, nguồn và quyền sử dụng hợp lệ.');
    if(typeof input.dataBase64!=='string'||input.dataBase64.length>Math.ceil(LESSON_MEDIA_MAX_BYTES/3)*4||(input.dataBase64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.dataBase64)))throw new TypeError('Tệp quá lớn hoặc mã hóa không hợp lệ.');
    const bytes=Uint8Array.from(atob(input.dataBase64),char=>char.charCodeAt(0));
    if(bytes.length>LESSON_MEDIA_MAX_BYTES||!mediaBytesMatchMime(bytes,input.mimeType))throw new TypeError('Định dạng tệp không khớp PNG/JPEG/WebP hoặc MP3/WAV/OGG.');
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const sha=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
    const id=crypto.randomUUID();const createdAt=Date.now();
    const metadata:LessonMediaMetadata={...input.metadata,humanReviewed:false};
    const queries=[this.db.prepare('INSERT INTO lesson_media_assets(id,content_sha256,mime_type,byte_length,metadata_json,created_by,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,sha,input.mimeType,bytes.length,JSON.stringify(metadata),input.actorUserId,createdAt)];
    const chunkSize=128*1024;
    for(let start=0;start<input.dataBase64.length;start+=chunkSize)queries.push(this.db.prepare('INSERT INTO lesson_media_chunks(asset_id,sequence,data_base64) VALUES(?,?,?)').bind(id,start/chunkSize,input.dataBase64.slice(start,start+chunkSize)));
    const results=await this.db.batch(queries);if(results.some(r=>!r.success))throw new Error('Chưa lưu được học liệu.');
    return {id,mimeType:input.mimeType,byteLength:bytes.length,metadata,createdAt,url:lessonMediaUrl(id,input.mimeType),usages:[]};
  }
  async get(id:string) {return this.db.prepare(`${select} WHERE id=?`).bind(id).first<Row>();}
  async missingReferences(content:unknown):Promise<string[]> {
    const references=new Set<string>();
    const visit=(value:unknown)=>{
      if(typeof value==='string'&&value.startsWith('/api/content/media/'))references.add(value);
      else if(Array.isArray(value))value.forEach(visit);
      else if(value&&typeof value==='object')Object.values(value).forEach(visit);
    };
    visit(content);
    const missing:string[]=[];
    for(const url of references){
      const id=/^\/api\/content\/media\/([0-9a-f-]{36})\.(png|jpg|webp|mp3|wav|ogg)$/.exec(url)?.[1];
      const row=id?await this.get(id):null;
      if(!row||lessonMediaUrl(row.id,row.mimeType)!==url)missing.push(url);
    }
    return missing;
  }
  async releaseAccess(url:string):Promise<'unreleased'|'free'|'premium'|'unknown'> {
    // Only media used exclusively by Thiên Lộ HSK4 lessons is paid.
    const result=await this.db.prepare("SELECT json_extract(package_json, '$.level') AS level, json_extract(package_json, '$.itemType') AS itemType FROM content_release_packages WHERE instr(package_json, ?) > 0").bind(url).all<{level:string|null;itemType:string|null}>();
    if(!result.success)throw new Error('Không đọc được quyền học liệu.');
    const releases=result.results??[];
    if(releases.length===0)return 'unreleased';
    if(releases.some(row=>!['hsk0','hsk1','hsk2','hsk3','hsk4'].includes(row.level??'')||!row.itemType))return 'unknown';
    if(releases.some(row=>row.level!=='hsk4'||row.itemType!=='lesson'))return 'free';
    return 'premium';
  }
  async releasedHsk4LessonIds(url:string):Promise<string[]> {
    const result=await this.db.prepare(`SELECT DISTINCT json_extract(package_json, '$.content.targetLessonId') AS lessonId
      FROM content_release_packages WHERE instr(package_json, ?) > 0
      AND json_extract(package_json, '$.level')='hsk4'
      AND json_extract(package_json, '$.itemType')='lesson'`).bind(url).all<{lessonId:string|null}>();
    if(!result.success)throw new Error('Không đọc được bài dùng học liệu.');
    return (result.results??[]).map(row=>row.lessonId).filter((id):id is string=>typeof id==='string');
  }
  async isReleased(url:string) {return (await this.releaseAccess(url))!=='unreleased';}
  async bytes(id:string) {
    const result=await this.db.prepare('SELECT data_base64 AS data FROM lesson_media_chunks WHERE asset_id=? ORDER BY sequence').bind(id).all<{data:string}>();
    if(!result.success)throw new Error('Không đọc được tệp.');
    return Uint8Array.from(atob((result.results??[]).map(row=>row.data).join('')),char=>char.charCodeAt(0));
  }
  async deleteUnused(id:string,actorUserId:string) {
    const row=await this.get(id);if(!row)return;
    if(row.createdBy!==actorUserId)throw new TypeError('Chỉ người tải lên được xóa học liệu chưa dùng.');
    const url=lessonMediaUrl(id,row.mimeType);
    // Reference check is in the DELETE itself to avoid check/delete races.
    const result=await this.db.prepare(`DELETE FROM lesson_media_assets WHERE id=? AND created_by=? AND NOT EXISTS(SELECT 1 FROM content_revisions WHERE instr(content_json,?)>0) AND NOT EXISTS(SELECT 1 FROM content_release_packages WHERE instr(package_json,?)>0)`).bind(id,actorUserId,url,url).run();
    if(result.meta?.changes!==1)throw new TypeError('Học liệu đang được nội dung sử dụng; hãy thay bằng tệp mới.');
  }
}
