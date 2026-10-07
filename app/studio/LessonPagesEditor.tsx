"use client";
import { useEffect, useRef, useState } from 'react';
import { LessonPageReader } from '../../src/components/LessonPageReader';
import { emptyLessonBlock, isEditableLessonPageDocument, lessonPagesFromRich, validateLessonPages, type LessonPageDocument, type LessonBlock } from '../../src/learning/lessonPages';
import { getRichLessonContent } from '../../src/learning/richLessonContent';
import { LESSON_ART, LESSON_SCENES, type LessonArtKey } from '../../src/learning/lessonPresentation';
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
  const [undo,setUndo] = useState<{document:LessonPageDocument;selected:number} | null>(null);
  const [preview,setPreview] = useState(false);
  const [previewHeading,setPreviewHeading] = useState<{title?:string;objective?:string}>({});
  const [focusedBlockId,setFocusedBlockId] = useState<string | null>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const invalidStored = value !== undefined && !isEditableLessonPageDocument(value);
  const change = (next: LessonPageDocument) => { setUndo(doc?{document:doc,selected}:null);setDoc(next);hidden.current?.dispatchEvent(new Event('input',{bubbles:true})); };
  const page = doc?.pages[selected];
  const activities=doc?.pages.flatMap((p,pageIndex)=>p.blocks.flatMap(b=>b.kind==='activity'?[{pageIndex,blockId:b.id,title:b.title,pageTitle:p.title,hasTarget:Boolean(b.activity?.learningTarget)}]:[]))??[];
  const missingTargets=activities.filter(a=>!a.hasTarget);
  const visitNextMissing=()=>{
    if(!missingTargets.length)return;
    const current=activities.findIndex(a=>a.blockId===focusedBlockId);
    const next=activities.find((a,index)=>index>current&&!a.hasTarget)??missingTargets[0];
    setSelected(next.pageIndex);
    setFocusedBlockId(next.blockId);
  };
  useEffect(()=>{
    if(!focusedBlockId||preview)return;
    const block=document.getElementById(`lesson-editor-block-${focusedBlockId}`);
    if(block){block.scrollIntoView({block:'center'});block.querySelector('summary')?.focus();}
  },[focusedBlockId,selected,preview]);
  const updatePage = (fields: Partial<NonNullable<typeof page>>) => doc && change({...doc,pages:doc.pages.map((p,i)=>i===selected?{...p,...fields}:p)});
  const updateBlock = (id: string, fields: Partial<LessonBlock>) => page && updatePage({blocks:page.blocks.map(b=>b.id===id?{...b,...fields}:b)});
  const addPage = () => { const pages=[...(doc?.pages??[]),{id:crypto.randomUUID(),title:'Trang mới',layout:'focus' as const,blocks:[emptyLessonBlock(crypto.randomUUID())]}]; change({...doc,version:1,pages});setSelected(pages.length-1); };
  return <section className={`studio-form-section lesson-pages-editor${preview?' is-preview':''}`}>
    <header><div><h2>Trình soạn trang Thiên Lộ</h2><p>Mỗi khối là một mục học; người học dùng Mục tiếp để xem lần lượt. Đặt một yêu cầu chính trong mỗi khối, tách giải thích dài thành các mục ngắn. Xem như người học dùng đúng giao diện và thứ tự này.</p></div></header>
    <input ref={hidden} type="hidden" name="lessonPages" value={doc?JSON.stringify(doc):value===undefined?'':JSON.stringify(value)} readOnly />
    {invalidStored && <p role="alert">Cấu trúc đã lưu chưa được hỗ trợ. Giữ nguyên bản gốc khi lưu; không tự thay thế.</p>}
    {!doc && !invalidStored && <div className="lesson-editor-actions"><button type="button" disabled={!mounted} onClick={addPage}>Soạn trang đầu tiên</button>{getRichLessonContent(lessonId) && <button type="button" disabled={!mounted} onClick={()=>change(lessonPagesFromRich(getRichLessonContent(lessonId)!))}>Nạp nội dung đang học để biên tập</button>}</div>}
    {doc && <><div className="lesson-editor-actions"><button type="button" disabled={doc.pages.length>=80} onClick={addPage}>Thêm trang</button><button type="button" disabled={!undo} onClick={()=>{if(undo){setDoc(undo.document);setSelected(undo.selected);setUndo(null);hidden.current?.dispatchEvent(new Event('input',{bubbles:true}));}}}>Hoàn tác</button><button type="button" disabled={!mounted} onClick={()=>{const form=hidden.current?.form;if(form){const data=new FormData(form);setPreviewHeading({title:String(data.get('title')||'')||undefined,objective:String(data.get('objectiveVi')||'')||undefined});}setPreview(!preview);}}>{preview?'Tiếp tục soạn':'Xem như người học'}</button></div>
      <div className="lesson-target-queue" role="status"><span>{activities.length-missingTargets.length}/{activities.length} hoạt động đã gắn mục tiêu và nguồn</span>{missingTargets.length>0&&<button type="button" onClick={()=>{setPreview(false);visitNextMissing();}}>Đến hoạt động cần biên tập tiếp ({missingTargets.length})</button>}</div>
      <label>Minh họa chủ đề<select aria-label="Minh họa chủ đề" value={doc.art??''} onChange={e=>change({...doc,art:(e.target.value||undefined) as LessonArtKey|undefined})}><option value="">Theo chủ đề bài</option>{Object.entries(LESSON_ART).map(([key,art])=><option key={key} value={key}>{art.alt}</option>)}</select></label>
      {preview ? <LessonPageReader key={JSON.stringify(doc)} document={doc} lessonId={lessonId} {...previewHeading} /> : <div className="lesson-editor-columns"><nav aria-label="Các trang đang soạn">{doc.pages.map((p,i)=>{const pending=p.blocks.filter(b=>b.kind==='activity'&&!b.activity?.learningTarget).length;return <button type="button" key={p.id} aria-label={`${i+1}. ${p.title}`} aria-current={selected===i?'page':undefined} onClick={()=>setSelected(i)}>{i+1}. {p.title}{pending>0&&<span aria-hidden="true"> · {pending} cần mục tiêu</span>}</button>;})}</nav>
        {page && <div><label>Tên trang<input value={page.title} onChange={e=>updatePage({title:e.target.value})}/></label><label>Bố cục<select aria-label="Bố cục" value={page.layout} onChange={e=>updatePage({layout:e.target.value as typeof page.layout})}><option value="focus">Một cột tập trung</option><option value="split">Hai cột đối chiếu</option><option value="scene">Tình huống và minh họa</option><option value="dialogue">Nghe và mở lời thoại</option><option value="workshop">Thực hành và tự kiểm</option></select></label>
          {(page.layout==='scene'||page.layout==='dialogue')&&<fieldset><legend>Minh họa riêng của trang</legend><p>Chọn ảnh phù hợp tình huống; ảnh này thay ảnh chủ đề chung ở trang hiện tại.</p><label>Chọn cảnh minh họa<select aria-label="Chọn cảnh minh họa" value={LESSON_SCENES.some(scene=>scene.src===page.illustration?.src)?page.illustration?.src:''} onChange={e=>{const scene=LESSON_SCENES.find(scene=>scene.src===e.target.value);if(scene)updatePage({illustration:{...scene}});}}><option value="">Chọn trong kho cảnh hoặc tải ảnh riêng bên dưới</option>{LESSON_SCENES.map(scene=><option key={scene.src} value={scene.src}>{scene.alt}</option>)}</select></label>{page.illustration&&<><img src={page.illustration.src} alt={page.illustration.alt} style={{maxWidth:'100%',maxHeight:180,objectFit:'cover'}}/><label>Mô tả minh họa trang<textarea value={page.illustration.alt} onChange={e=>updatePage({illustration:{...page.illustration!,alt:e.target.value}})}/></label><label>Chú thích minh họa trang<textarea value={page.illustration.caption??''} onChange={e=>updatePage({illustration:{...page.illustration!,caption:e.target.value}})}/></label>{(['focalX','focalY'] as const).map(key=><label key={key}>Trọng tâm minh họa {key==='focalX'?'ngang':'dọc'} (%)<input type="number" min={0} max={100} value={page.illustration![key]??50} onChange={e=>updatePage({illustration:{...page.illustration!,[key]:Number(e.target.value)}})}/></label>)}<button type="button" onClick={()=>updatePage({illustration:undefined})}>Dùng lại ảnh chủ đề chung</button></>}<LessonMediaPicker kind="image" onSelect={asset=>updatePage({illustration:{src:asset.url,alt:asset.metadata.alt,provenance:asset.metadata.provenance+' · '+asset.metadata.license,caption:asset.metadata.caption,focalX:asset.metadata.focalX,focalY:asset.metadata.focalY}})}/></fieldset>}
          <label>Chặng học<select aria-label="Chặng học" value={page.stage??'understand'} onChange={e=>updatePage({stage:e.target.value as typeof page.stage})}><option value="context">Gặp tình huống</option><option value="understand">Hiểu cách dùng</option><option value="practice">Tự luyện</option><option value="transfer">Vận dụng</option></select></label>
          <div className="lesson-editor-actions">{[-1,1].map(delta=><button key={delta} type="button" disabled={selected+delta<0||selected+delta>=doc.pages.length} onClick={()=>{const pages=[...doc.pages];[pages[selected],pages[selected+delta]]=[pages[selected+delta],pages[selected]];change({...doc,pages});setSelected(selected+delta);}}>{delta===-1?'Đưa trang lên':'Đưa trang xuống'}</button>)}<button type="button" disabled={doc.pages.length>=80} onClick={()=>{const pages=[...doc.pages];pages.splice(selected+1,0,duplicateLessonPage(page));change({...doc,pages});setSelected(selected+1);}}>Nhân bản trang</button><button type="button" disabled={doc.pages.length===1} onClick={()=>{change({...doc,pages:doc.pages.filter((_,i)=>i!==selected)});setSelected(Math.max(0,selected-1));}}>Xóa trang</button></div>
          {page.blocks.map((b,i)=><fieldset key={b.id} id={`lesson-editor-block-${b.id}`}><legend>Khối {i+1}{b.kind==='activity'&&!b.activity?.learningTarget?' · cần mục tiêu':''}</legend><label>Loại khối<select value={b.kind} onChange={e=>updateBlock(b.id,{kind:e.target.value as LessonBlock['kind']})}><option value="explanation">Giải thích / sơ đồ bằng chữ</option><option value="dialogue">Hội thoại / câu mẫu</option><option value="reflection">Tự diễn đạt và đối chiếu</option><option value="image">Ảnh minh họa</option><option value="audio">Audio kèm lời thoại</option><option value="dictation">Nghe – chép – đối chiếu</option><option value="reading">Văn bản đọc và ghi chú</option><option value="diagram">Sơ đồ / timeline / bản đồ</option><option value="activity">Bài tập và phản hồi</option></select></label>
            {(['title','body',...(b.kind==='dialogue'||b.kind==='reflection'||b.kind==='dictation'?['hanzi','pinyin','meaningVi']:[]),...(b.kind==='image'?['imageSrc','alt','provenance']:[])] as (Exclude<keyof LessonBlock,'activity'|'media'|'diagram'|'reading'>)[]).map(field=><label key={field}>{{title:'Tiêu đề',body:'Nội dung / yêu cầu',hanzi:'Hán tự',pinyin:'Pinyin',meaningVi:'Nghĩa Việt',imageSrc:'Đường dẫn ảnh nội bộ (/… .webp)',alt:'Mô tả ảnh',provenance:'Nguồn và quyền sử dụng',id:'',kind:''}[field]}<textarea value={b[field]} onChange={e=>updateBlock(b.id,{[field]:e.target.value})}/></label>)}
            {(b.kind==='image'||b.kind==='audio'||b.kind==='dictation')&&<LessonMediaPicker kind={b.kind==='image'?'image':'audio'} onSelect={asset=>updateBlock(b.id,{media:{src:asset.url,mimeType:asset.mimeType,metadata:asset.metadata},imageSrc:b.kind==='image'?asset.url:b.imageSrc,alt:asset.metadata.alt,provenance:asset.metadata.provenance+' · '+asset.metadata.license})}/>}
            {b.kind==='dictation'&&<p>Chưa chọn tệp: dùng giọng tổng hợp từ Hán tự. Khi chọn bản ghi, lời thoại phải khớp Hán tự; người học nghe trước rồi mở đáp án. Đây là tự luyện, không tự tạo điểm kỹ năng.</p>}
            {b.kind==='image'&&b.media&&<fieldset><legend>Thông tin học liệu trong khối</legend><p>Chỉnh thông tin dùng trong bản bài này; tệp gốc và các bản đã phát hành được giữ nguyên.</p><label>Chú thích học liệu<textarea value={b.media.metadata.caption} onChange={e=>updateBlock(b.id,{media:{...b.media!,metadata:{...b.media!.metadata,caption:e.target.value}}})}/></label>{b.kind==='image'&&(['focalX','focalY'] as const).map(key=><label key={key}>Trọng tâm ảnh {key==='focalX'?'ngang':'dọc'} (%)<input type="number" min={0} max={100} value={b.media!.metadata[key]} onChange={e=>updateBlock(b.id,{media:{...b.media!,metadata:{...b.media!.metadata,[key]:Number(e.target.value)}}})}/></label>)}</fieldset>}
            {b.kind==='dictation'&&b.media&&<button type="button" onClick={()=>updateBlock(b.id,{media:undefined})}>Dùng giọng tổng hợp thay bản ghi</button>}
            {b.kind==='reading'&&<LessonReadingEditor value={b.reading} onChange={reading=>updateBlock(b.id,{reading})}/>}
            {b.kind==='diagram'&&<LessonDiagramEditor value={b.diagram} onChange={diagram=>updateBlock(b.id,{diagram})}/>}
            {b.kind==='activity'&&<LessonActivityEditor key={`${b.id}:${focusedBlockId===b.id}`} lessonId={lessonId} value={b.activity} openTarget={focusedBlockId===b.id} onChange={activity=>updateBlock(b.id,{activity})}/>}
            <div className="lesson-editor-actions"><button type="button" disabled={i===0} onClick={()=>{const blocks=[...page.blocks];[blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]];updatePage({blocks});}}>Đưa khối lên</button><button type="button" disabled={i===page.blocks.length-1} onClick={()=>{const blocks=[...page.blocks];[blocks[i],blocks[i+1]]=[blocks[i+1],blocks[i]];updatePage({blocks});}}>Đưa khối xuống</button><button type="button" disabled={page.blocks.length>=40} onClick={()=>{const blocks=[...page.blocks];blocks.splice(i+1,0,duplicateLessonBlock(b));updatePage({blocks});}}>Nhân bản khối</button><button type="button" disabled={page.blocks.length===1} onClick={()=>updatePage({blocks:page.blocks.filter(x=>x.id!==b.id)})}>Xóa khối</button></div></fieldset>)}
          <button type="button" disabled={page.blocks.length>=40} onClick={()=>updatePage({blocks:[...page.blocks,emptyLessonBlock(crypto.randomUUID())]})}>Thêm khối nội dung</button>
        </div>}</div>}
      {validateLessonPages(doc).length>0 && <div role="status"><strong>Cần hoàn thiện trước phát hành</strong><ul>{[...new Set(validateLessonPages(doc))].map(e=><li key={e}>{e}</li>)}</ul></div>}
    </>}
  </section>;
}
