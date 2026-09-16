export const LESSON_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export type LessonMediaMetadata = {
  title: string; alt: string; caption: string; provenance: string; license: string;
  sourceKind: 'original' | 'licensed' | 'synthetic'; transcript: string;
  focalX: number; focalY: number; humanReviewed: false;
};
export type LessonMediaAsset = { id:string; url:string; mimeType:string; byteLength:number; metadata:LessonMediaMetadata; createdAt:number; usages:Array<{id:string;title:string;state:string}> };
export const mediaExtension = (mime:string) => ({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','audio/mpeg':'mp3','audio/wav':'wav','audio/ogg':'ogg'}[mime]);
export const lessonMediaUrl = (id:string,mime:string) => `/api/content/media/${id}.${mediaExtension(mime)}`;
export function validateMediaMetadata(value:unknown,mime:string):value is LessonMediaMetadata {
  if(!value||typeof value!=='object')return false;
  const m=value as LessonMediaMetadata;
  return !!mediaExtension(mime)&&['title','alt','caption','provenance','license','transcript'].every(key=>typeof m[key as keyof LessonMediaMetadata]==='string'&&String(m[key as keyof LessonMediaMetadata]).length<=12000)
    &&!!m.title.trim()&&!!m.provenance.trim()&&!!m.license.trim()
    &&(mime.startsWith('image/')?!!m.alt.trim():!!m.transcript.trim())
    &&['original','licensed','synthetic'].includes(m.sourceKind)
    &&Number.isFinite(m.focalX)&&m.focalX>=0&&m.focalX<=100&&Number.isFinite(m.focalY)&&m.focalY>=0&&m.focalY<=100;
}
export function mediaBytesMatchMime(bytes:Uint8Array,mime:string):boolean {
  const ascii=(start:number,length:number)=>String.fromCharCode(...bytes.slice(start,start+length));
  if(bytes.length<12)return false;
  if(mime==='image/png')return bytes.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i]);
  if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='image/webp')return ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';
  if(mime==='audio/wav')return ascii(0,4)==='RIFF'&&ascii(8,4)==='WAVE';
  if(mime==='audio/ogg')return ascii(0,4)==='OggS';
  if(mime==='audio/mpeg')return ascii(0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224);
  return false;
}
