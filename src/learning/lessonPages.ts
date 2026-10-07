import { isEditableLessonReading, validateLessonReading, type LessonReading } from './lessonReading';
import { isEditableLessonDiagram, validateLessonDiagram, type LessonDiagram } from './lessonDiagram';
import { validateMediaMetadata, mediaExtension, type LessonMediaMetadata } from '../content/lessonMedia';
import { isEditableLessonActivity, validateLessonActivity, type LessonActivity } from './lessonActivities';
import type { RichLessonContent } from './richLessonContent';
import { learnerGrammarLabel } from './lessonTeachingFlow';
import { lessonPresentation } from './lessonPresentation';
import { WORD_BY_ID } from '../data/curriculum';

export type LessonBlock = { id: string; kind: 'explanation' | 'dialogue' | 'image' | 'reflection' | 'activity' | 'audio' | 'diagram' | 'reading' | 'dictation'; reading?:LessonReading; diagram?:LessonDiagram; media?: {src:string;mimeType:string;metadata:LessonMediaMetadata}; activity?: LessonActivity; title: string; body: string; hanzi: string; pinyin: string; meaningVi: string; imageSrc: string; alt: string; provenance: string };
export type LessonPageDocument = { version: 1; art?: import('./lessonPresentation').LessonArtKey; pages: Array<{ id: string; title: string; illustration?: {src:string;alt:string;provenance:string;caption?:string;focalX?:number;focalY?:number}; layout: 'focus' | 'split' | 'scene' | 'dialogue' | 'workshop'; stage?: 'context' | 'understand' | 'practice' | 'transfer'; blocks: LessonBlock[] }> };
export const emptyLessonBlock = (id: string): LessonBlock => ({ id, kind: 'explanation', title: '', body: '', hanzi: '', pinyin: '', meaningVi: '', imageSrc: '', alt: '', provenance: '' });
const rec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const safeLessonImage = (v: string) => /^\/(?!\/)[a-zA-Z0-9_./-]+\.(png|webp|jpg|jpeg|avif)$/i.test(v) && !v.split('/').includes('..');
const validBlockMedia = (v:unknown) => rec(v) && typeof v.src==='string' && typeof v.mimeType==='string' && /^\/api\/content\/media\/[0-9a-f-]{36}\.(png|jpg|webp|mp3|wav|ogg)$/.test(v.src) && v.src.endsWith('.'+mediaExtension(v.mimeType)) && validateMediaMetadata(v.metadata,v.mimeType);
const validIllustration=(v:unknown)=>rec(v)&&typeof v.src==='string'&&safeLessonImage(v.src)&&typeof v.alt==='string'&&!!v.alt.trim()&&v.alt.length<=12000&&typeof v.provenance==='string'&&!!v.provenance.trim()&&v.provenance.length<=12000&&(v.caption===undefined||(typeof v.caption==='string'&&v.caption.length<=12000))&&['focalX','focalY'].every(key=>v[key]===undefined||(typeof v[key]==='number'&&Number.isFinite(v[key])&&v[key]>=0&&v[key]<=100));
export function validateLessonPages(value: unknown): string[] {
  if (!rec(value) || value.version !== 1 || !Array.isArray(value.pages) || !value.pages.length || value.pages.length > 80) return ['Cấu trúc bài cần từ 1 đến 80 trang.'];
  const errors: string[] = []; const ids = new Set<string>();
  if (value.art !== undefined && !['campus','city','work','reading','sound'].includes(String(value.art))) errors.push('Minh họa bài chưa có trong kho.');
  const id = (v: unknown) => { if (typeof v !== 'string' || !v || ids.has(v)) errors.push('Mã trang/khối bị trùng hoặc thiếu.'); else ids.add(v); };
  value.pages.forEach((p, i) => {
    if (!rec(p)) { errors.push('Trang không hợp lệ.'); return; }
    id(p.id);
    if(p.illustration!==undefined&&!validIllustration(p.illustration))errors.push('Minh họa trang cần ảnh nội bộ, mô tả và nguồn sử dụng.');
    if (typeof p.title !== 'string' || !p.title.trim() || p.title.length > 160 || !['focus','split','scene','dialogue','workshop'].includes(String(p.layout))) errors.push(`Trang ${i+1}: cần tên và bố cục hợp lệ.`);
    if (p.stage !== undefined && !['context','understand','practice','transfer'].includes(String(p.stage))) errors.push('Chặng học không hợp lệ.');
    if (!Array.isArray(p.blocks) || !p.blocks.length || p.blocks.length > 40) { errors.push(`Trang ${i+1}: cần 1–40 khối.`); return; }
    p.blocks.forEach(b => {
      if (!rec(b)) { errors.push('Khối không hợp lệ.'); return; } id(b.id);
      if (!['explanation','dialogue','image','reflection','activity','audio','diagram','reading','dictation'].includes(String(b.kind))) errors.push('Loại khối chưa được hỗ trợ.');
      for (const field of ['title','body','hanzi','pinyin','meaningVi','imageSrc','alt','provenance']) if (typeof b[field] !== 'string' || String(b[field]).length > 12000) errors.push(`Trường ${field} không hợp lệ.`);
      if (b.media !== undefined && !validBlockMedia(b.media)) errors.push('Học liệu đính kèm chưa hợp lệ.');
      if (b.kind==='image' && rec(b.media) && (!String(b.media.mimeType).startsWith('image/') || b.media.src!==b.imageSrc)) errors.push('Ảnh phải khớp học liệu được chọn.');
      if (b.kind === 'audio' && (!rec(b.media) || !String(b.media.mimeType).startsWith('audio/'))) errors.push('Khối audio cần tệp âm thanh và transcript.');
      if (b.kind==='dictation') {
        if (!b.body || !b.hanzi || !b.pinyin || !b.meaningVi) errors.push('Nghe–chép cần yêu cầu, lời chép, Pinyin và nghĩa Việt.');
        if (b.media !== undefined && (!rec(b.media) || !String(b.media.mimeType).startsWith('audio/') || !rec(b.media.metadata) || b.media.metadata.transcript !== b.hanzi)) errors.push('Âm thanh nghe–chép phải có lời thoại khớp đáp án.');
      }
      if (b.kind==='reading') errors.push(...validateLessonReading(b.reading));
      if (b.kind==='diagram') errors.push(...validateLessonDiagram(b.diagram));
      if (b.kind === 'activity') { if (!b.body) errors.push('Bài tập cần yêu cầu rõ.'); errors.push(...validateLessonActivity(b.activity)); }
      if (b.kind === 'image' && (typeof b.imageSrc !== 'string' || !safeLessonImage(b.imageSrc) || !b.alt || !b.provenance)) errors.push('Ảnh cần đường dẫn nội bộ, mô tả và nguồn/quyền sử dụng.');
      if (b.kind === 'dialogue' && (!b.hanzi || !b.pinyin || !b.meaningVi)) errors.push('Hội thoại cần đủ Hán tự, Pinyin và nghĩa Việt.');
      if (['explanation','reflection'].includes(String(b.kind)) && !b.body) errors.push('Khối giải thích/tự diễn đạt cần nội dung.');
    });
  }); return errors;
}
export const isLessonPageDocument = (v: unknown): v is LessonPageDocument => validateLessonPages(v).length === 0;

/** Source-preserving first draft. No generated claims or fabricated examples. */
export function lessonPagesFromRich(rich: RichLessonContent): LessonPageDocument {
  const presentation=lessonPresentation(rich.lessonId);
  const pages: LessonPageDocument['pages'] = [];
  const block = (id: string, fields: Partial<LessonBlock>) => ({ ...emptyLessonBlock(`${rich.lessonId}:block:${id}`), ...fields });
  if(presentation.lesson) pages.push({id:`${rich.lessonId}:mission`,title:presentation.contextTitle,layout:'scene',stage:'context',blocks:[block('mission',{title:'Nhiệm vụ của bạn',body:presentation.lesson.objective}),block('method',{title:'Cách học ở bài này',body:presentation.family==='reading'?'Đọc trọn ngữ liệu để xác định ý chính. Ở lượt thứ hai, tìm câu làm bằng chứng cho cách hiểu của bạn. Sau đó che văn bản và tóm lược.':presentation.family==='writing'?'Đọc mẫu, nhận ra cách mở ý và nối ý. Lập ghi chú ngắn rồi tự viết. Đối chiếu nội dung, trật tự câu và cách dùng từ trước khi sửa bản nháp.':'Nghe lượt thoại trước, rồi mở nội dung để hiểu ai đang nói và họ muốn làm gì. Rút mẫu câu, thử diễn đạt và đổi thông tin theo tình huống của bạn.'})]});
  if (rich.dialogue.length) pages.push({ id: `${rich.lessonId}:dialogue`, title: presentation.family==='reading'?'Đọc trọn ngữ liệu':'Hội thoại trong ngữ cảnh', layout: 'dialogue',stage:'context', blocks: rich.dialogue.map((d,i) => block(`dialogue:${i}`, { kind: 'dialogue', title: d.speaker, ...d })) });
  rich.grammar.forEach((g,i) => pages.push({ id: `${rich.lessonId}:grammar:${i}`, title: learnerGrammarLabel(g), layout: 'split', stage:'understand', blocks: [block(`rule:${i}`, {title:learnerGrammarLabel(g),body:g.explanationVi}), ...(g.modelExample.hanzi?[block(`model:${i}`, {kind:'dialogue',title:'Câu mẫu',...g.modelExample})]:[]), ...(g.guidedPractice.modelAnswerHanzi?[block(`try:${i}`, {kind:'reflection',title:'Thử diễn đạt rồi đối chiếu',body:g.guidedPractice.promptVi,hanzi:g.guidedPractice.modelAnswerHanzi,pinyin:g.guidedPractice.modelAnswerPinyin,meaningVi:g.guidedPractice.modelAnswerMeaningVi})]:[])] }));
  const words=(presentation.lesson?.wordIds??[]).map(id=>WORD_BY_ID.get(id)).filter(w=>!!w);
  for(let offset=0;offset<words.length;offset+=6){const group=words.slice(offset,offset+6);pages.push({id:`${rich.lessonId}:words:${offset}`,title:`Từ dùng trong bài · ${offset+1}–${offset+group.length}`,layout:'split',stage:'understand',blocks:group.map((w,i)=>block(`word:${offset+i}`,{kind:'dialogue',title:`${w.simplified} · ${w.meaning}`,body:`${w.pinyin} · ${w.partOfSpeech}`,hanzi:w.example,pinyin:w.examplePinyin,meaningVi:w.exampleMeaning}))});}
  const recall=words.filter(w=>w.example&&w.exampleMeaning).slice(0,3);
  if(recall.length)pages.push({id:`${rich.lessonId}:recall`,title:'Che mẫu và tự gọi lại',layout:'workshop',stage:'practice',blocks:recall.map((w,i)=>block(`recall:${i}`,{kind:'reflection',title:`Tự diễn đạt · ${i+1}`,body:`Diễn đạt bằng tiếng Trung: ${w.exampleMeaning}`,hanzi:w.example,pinyin:w.examplePinyin,meaningVi:w.exampleMeaning}))});
  rich.tasks.forEach((t,i) => pages.push({id:`${rich.lessonId}:task:${i}`,title:t.titleVi,layout:'workshop',stage:'transfer',blocks:[block(`task:${i}`, {kind:'reflection',title:t.titleVi,body:t.instructionVi,hanzi:t.modelDialogue.map(d=>d.hanzi).join('\n'),pinyin:t.modelDialogue.map(d=>d.pinyin).join('\n'),meaningVi:t.modelDialogue.map(d=>d.meaningVi).join('\n')})]}));
  return { version: 1, art:presentation.art, pages };
}




/** Draft shape validation deliberately allows unfinished educational fields. */
export function isEditableLessonPageDocument(v:unknown):v is LessonPageDocument {
 if(!rec(v)||v.version!==1||!Array.isArray(v.pages)||!v.pages.length||v.pages.length>80)return false;
 if(v.art!==undefined&&!['campus','city','work','reading','sound'].includes(String(v.art)))return false;
 const ids=new Set<string>();const id=(v:unknown)=>{if(typeof v!=='string'||!v||ids.has(v))return false;ids.add(v);return true;};
 return v.pages.every(p=>rec(p)&&id(p.id)&&(p.illustration===undefined||validIllustration(p.illustration))&&typeof p.title==='string'&&p.title.length<=160&&['focus','split','scene','dialogue','workshop'].includes(String(p.layout))&&(p.stage===undefined||['context','understand','practice','transfer'].includes(String(p.stage)))&&Array.isArray(p.blocks)&&p.blocks.length>0&&p.blocks.length<=40&&p.blocks.every(b=>rec(b)&&id(b.id)&&['explanation','dialogue','image','reflection','activity','audio','diagram','reading','dictation'].includes(String(b.kind))&&['title','body','hanzi','pinyin','meaningVi','imageSrc','alt','provenance'].every(k=>typeof b[k]==='string'&&String(b[k]).length<=12000)&&(b.activity===undefined||isEditableLessonActivity(b.activity))&&(b.media===undefined||validBlockMedia(b.media))&&(b.diagram===undefined||isEditableLessonDiagram(b.diagram))&&(b.reading===undefined||isEditableLessonReading(b.reading))));
}
