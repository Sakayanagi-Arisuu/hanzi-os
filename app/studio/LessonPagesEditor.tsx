"use client";
import { useEffect, useRef, useState } from 'react';
import { LessonPageReader } from '../../src/components/LessonPageReader';
import { emptyLessonBlock, isEditableLessonPageDocument, lessonPagesFromRich, validateLessonPages, type LessonPageDocument, type LessonBlock } from '../../src/learning/lessonPages';
import { getRichLessonContent } from '../../src/learning/richLessonContent';
import { LESSON_ART, type LessonArtKey } from '../../src/learning/lessonPresentation';
import './lesson-pages-editor.css';
import { LessonReadingEditor } from './LessonReadingEditor';
import { LessonDiagramEditor } from './LessonDiagramEditor';
import { LessonMediaPicker } from './LessonMediaPicker';
import { duplicateLessonBlock, duplicateLessonPage } from '../../src/learning/lessonPageEditing';
import { LessonActivityEditor } from './LessonActivityEditor';

export function LessonPagesEditor({ value, lessonId }: { value: unknown; lessonId: string }) {
  const [mounted,setMounted] = useState(false);
  useEffect(()=>{setMounted(true);},[]);
  const [doc,setDoc] = useState<LessonPageDocument | null>(()=>isEditableLessonPageDocument(value) ? value : null);
  const [selected,setSelected] = useState(0);
  const [undo,setUndo] = useState<LessonPageDocument | null>(null);
  const [preview,setPreview] = useState(false);
  const [previewHeading,setPreviewHeading] = useState<{title?:string;objective?:string}>({});
  const hidden = useRef<HTMLInputElement>(null);
  const invalidStored = value !== undefined && !isEditableLessonPageDocument(value);
  const change = (next: LessonPageDocument) => { setUndo(doc);setDoc(next);hidden.current?.dispatchEvent(new Event('input',{bubbles:true})); };
  const page = doc?.pages[selected];
  const updatePage = (fields: Partial<NonNullable<typeof page>>) => doc && change({...doc,pages:doc.pages.map((p,i)=>i===selected?{...p,...fields}:p)});
  const updateBlock = (id: string, fields: Partial<LessonBlock>) => page && updatePage({blocks:page.blocks.map(b=>b.id===id?{...b,...fields}:b)});
  const addPage = () => { const pages=[...(doc?.pages??[]),{id:crypto.randomUUID(),title:'Trang mới',layout:'focus' as const,blocks:[emptyLessonBlock(crypto.randomUUID())]}]; change({...doc,version:1,pages});setSelected(pages.length-1); };
  return <section className="studio-form-section lesson-pages-editor">
    <header><div><h2>Trình soạn trang Thiên Lộ</h2><p>Mỗi khối là một mục học; người học dùng Mục tiếp để xem lần lượt. Đặt một yêu cầu chính trong mỗi khối, tách giải thích dài thành các mục ngắn. Xem như người học dùng đúng giao diện và thứ tự này.</p></div></header>
    <input ref={hidden} type="hidden" name="lessonPages" value={doc?JSON.stringify(doc):value===undefined?'':JSON.stringify(value)} readOnly />
    {invalidStored && <p role="alert">Cấu trúc đã lưu chưa được hỗ trợ. Giữ nguyên bản gốc khi lưu; không tự thay thế.</p>}
    {!doc && !invalidStored && <div className="lesson-editor-actions"><button type="button" disabled={!mounted} onClick={addPage}>Soạn trang đầu tiên</button>{getRichLessonContent(lessonId) && <button type="button" disabled={!mounted} onClick={()=>change(lessonPagesFromRich(getRichLessonContent(lessonId)!))}>Nạp nội dung đang học để biên tập</button>}</div>}
    {doc && <><div className="lesson-editor-actions"><button type="button" disabled={doc.pages.length>=80} onClick={addPage}>Thêm trang</button><button type="button" disabled={!undo} onClick={()=>{if(undo){setDoc(undo);setUndo(null);setSelected(0);}}}>Hoàn tác</button><button type="button" disabled={!mounted} onClick={()=>{const form=hidden.current?.form;if(form){const data=new FormData(form);setPreviewHeading({title:String(data.get('title')||'')||undefined,objective:String(data.get('objectiveVi')||'')||undefined});}setPreview(!preview);}}>{preview?'Tiếp tục soạn':'Xem như người học'}</button></div>
      <label>Minh họa chủ đề<select aria-label="Minh họa chủ đề" value={doc.art??''} onChange={e=>change({...doc,art:(e.target.value||undefined) as LessonArtKey|undefined})}><option value="">Theo chủ đề bài</option>{Object.entries(LESSON_ART).map(([key,art])=><option key={key} value={key}>{art.alt}</option>)}</select></label>
      {preview ? <LessonPageReader key={JSON.stringify(doc)} document={doc} lessonId={lessonId} {...previewHeading} /> : <div className="lesson-editor-columns"><nav aria-label="Các trang đang soạn">{doc.pages.map((p,i)=><button type="button" key={p.id} aria-current={selected===i?'page':undefined} onClick={()=>setSelected(i)}>{i+1}. {p.title}</button>)}</nav>
        {page && <div><label>Tên trang<input value={page.title} onChange={e=>updatePage({title:e.target.value})}/></label><label>Bố cục<select aria-label="Bố cục" value={page.layout} onChange={e=>updatePage({layout:e.target.value as typeof page.layout})}><option value="focus">Một cột tập trung</option><option value="split">Hai cột đối chiếu</option><option value="scene">Tình huống và minh họa</option><option value="dialogue">Nghe và mở lời thoại</option><option value="workshop">Thực hành và tự kiểm</option></select></label>
          <label>Chặng học<select aria-label="Chặng học" value={page.stage??'understand'} onChange={e=>updatePage({stage:e.target.value as typeof page.stage})}><option value="context">Gặp tình huống</option><option value="understand">Hiểu cách dùng</option><option value="practice">Tự luyện</option><option value="transfer">Vận dụng</option></select></label>
          <div className="lesson-editor-actions">{[-1,1].map(delta=><button key={delta} type="button" disabled={selected+delta<0||selected+delta>=doc.pages.length} onClick={()=>{const pages=[...doc.pages];[pages[selected],pages[selected+delta]]=[pages[selected+delta],pages[selected]];change({...doc,pages});setSelected(selected+delta);}}>{delta===-1?'Đưa trang lên':'Đưa trang xuống'}</button>)}<button type="button" disabled={doc.pages.length>=80} onClick={()=>{const pages=[...doc.pages];pages.splice(selected+1,0,duplicateLessonPage(page));change({...doc,pages});setSelected(selected+1);}}>Nhân bản trang</button><button type="button" disabled={doc.pages.length===1} onClick={()=>{change({...doc,pages:doc.pages.filter((_,i)=>i!==selected)});setSelected(Math.max(0,selected-1));}}>Xóa trang</button></div>
          {page.blocks.map((b,i)=><fieldset key={b.id}><legend>Khối {i+1}</legend><label>Loại khối<select value={b.kind} onChange={e=>updateBlock(b.id,{kind:e.target.value as LessonBlock['kind']})}><option value="explanation">Giải thích / sơ đồ bằng chữ</option><option value="dialogue">Hội thoại / câu mẫu</option><option value="reflection">Tự diễn đạt và đối chiếu</option><option value="image">Ảnh minh họa</option><option value="audio">Audio kèm lời thoại</option><option value="reading">Văn bản đọc và ghi chú</option><option value="diagram">Sơ đồ / timeline / bản đồ</option><option value="activity">Bài tập và phản hồi</option></select></label>
            {(['title','body',...(b.kind==='dialogue'||b.kind==='reflection'?['hanzi','pinyin','meaningVi']:[]),...(b.kind==='image'?['imageSrc','alt','provenance']:[])] as (Exclude<keyof LessonBlock,'activity'|'media'|'diagram'|'reading'>)[]).map(field=><label key={field}>{{title:'Tiêu đề',body:'Nội dung / yêu cầu',hanzi:'Hán tự',pinyin:'Pinyin',meaningVi:'Nghĩa Việt',imageSrc:'Đường dẫn ảnh nội bộ (/… .webp)',alt:'Mô tả ảnh',provenance:'Nguồn và quyền sử dụng',id:'',kind:''}[field]}<textarea value={b[field]} onChange={e=>updateBlock(b.id,{[field]:e.target.value})}/></label>)}
            {(b.kind==='image'||b.kind==='audio')&&<LessonMediaPicker kind={b.kind} onSelect={asset=>updateBlock(b.id,{media:{src:asset.url,mimeType:asset.mimeType,metadata:asset.metadata},imageSrc:b.kind==='image'?asset.url:b.imageSrc,alt:asset.metadata.alt,provenance:asset.metadata.provenance+' · '+asset.metadata.license})}/>}
            {b.kind==='reading'&&<LessonReadingEditor value={b.reading} onChange={reading=>updateBlock(b.id,{reading})}/>}
            {b.kind==='diagram'&&<LessonDiagramEditor value={b.diagram} onChange={diagram=>updateBlock(b.id,{diagram})}/>}
            {b.kind==='activity'&&<LessonActivityEditor lessonId={lessonId} value={b.activity} onChange={activity=>updateBlock(b.id,{activity})}/>}
            <div className="lesson-editor-actions"><button type="button" disabled={i===0} onClick={()=>{const blocks=[...page.blocks];[blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]];updatePage({blocks});}}>Đưa khối lên</button><button type="button" disabled={i===page.blocks.length-1} onClick={()=>{const blocks=[...page.blocks];[blocks[i],blocks[i+1]]=[blocks[i+1],blocks[i]];updatePage({blocks});}}>Đưa khối xuống</button><button type="button" disabled={page.blocks.length>=40} onClick={()=>{const blocks=[...page.blocks];blocks.splice(i+1,0,duplicateLessonBlock(b));updatePage({blocks});}}>Nhân bản khối</button><button type="button" disabled={page.blocks.length===1} onClick={()=>updatePage({blocks:page.blocks.filter(x=>x.id!==b.id)})}>Xóa khối</button></div></fieldset>)}
          <button type="button" disabled={page.blocks.length>=40} onClick={()=>updatePage({blocks:[...page.blocks,emptyLessonBlock(crypto.randomUUID())]})}>Thêm khối nội dung</button>
        </div>}</div>}
      {validateLessonPages(doc).length>0 && <div role="status"><strong>Cần hoàn thiện trước phát hành</strong><ul>{[...new Set(validateLessonPages(doc))].map(e=><li key={e}>{e}</li>)}</ul></div>}
    </>}
  </section>;
}
