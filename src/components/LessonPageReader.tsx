"use client";
import { LessonReadingBlock } from './LessonReadingBlock';
import { LessonDiagramBlock } from './LessonDiagramBlock';
import { LessonActivityBlock } from './LessonActivityBlock';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Headphones, Lightbulb, PencilLine, Volume2 } from 'lucide-react';
import { captureLessonPageFirstAttempt } from '../learning/lessonPageAttempt';
import { speakMandarin } from '../lib/speech';
import { safeLessonImage, type LessonBlock, type LessonPageDocument } from '../learning/lessonPages';
import { LESSON_ART, lessonPresentation } from '../learning/lessonPresentation';
import { learnerFacingCopy } from '../learning/lessonTeachingFlow';
import './LessonPageReader.css';

import type { ReadingDraft as Draft, ReadingPosition } from '../learning/lessonReadingSession';
const emptyDraft:Draft={text:'',revealed:false,compared:false};
const normalize=(text:string)=>text.normalize('NFKC').replace(/[\s，。！？,.!?]/gu,'');
function Block({block,draft,onDraft,index}:{block:LessonBlock;draft:Draft;onDraft:(value:Draft)=>void;index:number}) {
  const model=<><strong className="jade-hanzi" lang="zh-Hans">{block.hanzi}</strong><p className="jade-pinyin">{block.pinyin}</p><p>{learnerFacingCopy(block.meaningVi)}</p></>;
  return <article className={`lesson-block lesson-block-${block.kind}${block.kind==='image'&&!block.body&&!block.media?.metadata.caption.trim()?' is-standalone-image':''}`}>
    <div className="jade-block-title">{block.kind==='dialogue'?<span className="jade-speaker">{block.title==='B'?'乙':block.title==='A'?'甲':'中文'}</span>:block.kind==='reflection'?<PencilLine size={20}/>:<Lightbulb size={20}/>}<h3>{block.title || `Nội dung ${index+1}`}</h3></div>
    {block.body && <p>{learnerFacingCopy(block.body)}</p>}
    {block.kind==='reading'&&block.reading&&<LessonReadingBlock reading={block.reading} draft={draft} onDraft={onDraft}/>}
    {block.kind==='diagram'&&block.diagram&&<LessonDiagramBlock diagram={block.diagram}/>}
    {block.kind==='activity' && block.activity && <LessonActivityBlock activity={block.activity} draft={draft} onDraft={onDraft}/>}
    {block.kind==='image' && <figure>{safeLessonImage(block.imageSrc)?<img src={block.imageSrc} alt={block.alt} style={{objectPosition:`${block.media?.metadata.focalX??50}% ${block.media?.metadata.focalY??50}%`}}/>:<p>Chọn ảnh nội bộ hợp lệ để xem trước.</p>}{block.media?.metadata.caption.trim()&&<figcaption>{block.media.metadata.caption}</figcaption>}</figure>}
    {block.kind==='dictation' && <div className="jade-listening-controls">{block.media?<audio aria-label="Nghe đoạn cần chép" controls preload="none" src={block.media.src}/>:<button type="button" onClick={()=>speakMandarin(block.hanzi)}><Headphones size={18}/>Nghe đoạn cần chép · giọng tổng hợp</button>}{block.media&&<small>{block.media.metadata.sourceKind==='synthetic'?'Âm thanh tổng hợp':'Bản ghi âm học liệu'}</small>}</div>}
    {block.kind==='audio' && block.media && <><audio controls preload="none" src={block.media.src}/><p>{block.media.metadata.sourceKind==='synthetic'?'Âm thanh tổng hợp':'Bản ghi âm học liệu'}</p><details open={draft.revealed} onToggle={e=>{const revealed=e.currentTarget.open;if(revealed!==draft.revealed)onDraft({...draft,revealed,everRevealed:draft.everRevealed||revealed});}}><summary>Mở lời thoại</summary><p lang="zh-Hans">{block.media.metadata.transcript}</p></details></>}
    {block.kind==='dialogue' && model}
    {(block.kind==='reflection'||block.kind==='dictation') && <><label className="jade-answer-label">Câu trả lời của bạn<textarea maxLength={12000} value={draft.text} onChange={e=>onDraft({...draft,text:e.target.value,compared:false})} placeholder="Nhập câu tiếng Trung hoặc ghi chú của bạn…"/></label>
      <div className="jade-draft-actions"><button type="button" disabled={!draft.text.trim()||!block.hanzi} onClick={()=>onDraft({...captureLessonPageFirstAttempt(draft,new Date().toISOString()),compared:true,everChecked:true})}><Check size={16}/>Đối chiếu câu</button><button type="button" onClick={()=>onDraft({...draft,revealed:!draft.revealed,everRevealed:true})}><BookOpen size={16}/>{draft.revealed?'Thu mẫu lại':'Cần xem mẫu'}</button></div>
      {block.kind==='dictation'&&<button type="button" className="jade-dictation-support" disabled={draft.usedHint} onClick={()=>onDraft({...draft,usedHint:true})}>{draft.usedHint?'Đã ghi nhận dùng Pinyin / gợi ý bàn phím':'Tôi đã dùng Pinyin / gợi ý bàn phím'}</button>}
      {draft.compared && <p className="jade-draft-feedback" role="status">{block.kind==='dictation'?(normalize(draft.text)===normalize(block.hanzi)?'Bản chép khớp lời mẫu (bỏ qua khoảng trắng và dấu câu). Nghe lại và kiểm tra nghĩa.':'Bản chép khác lời mẫu. Mở lời để đối chiếu từng cụm, chú ý số, thời gian và phủ định.'):normalize(draft.text)===normalize(block.hanzi)?'Câu của bạn khớp câu mẫu. Hãy thử đổi một chi tiết và diễn đạt lại.':'Câu của bạn khác câu mẫu. Có thể có nhiều cách diễn đạt đúng; mở mẫu để đối chiếu nghĩa và trật tự câu.'}</p>}
      {draft.revealed && <div className="jade-reveal">{model}<button type="button" className="jade-audio" onClick={()=>speakMandarin(block.hanzi)}><Volume2 size={16}/>Nghe mẫu để đối chiếu</button></div>}
      <small className="jade-practice-note">Tự luyện và đối chiếu · chưa phải điểm đánh giá kỹ năng.</small></>}
  </article>;
}

const stageLabels={context:'Gặp tình huống',understand:'Hiểu cách dùng',practice:'Tự luyện',transfer:'Vận dụng'};
export function LessonPageReader({document,lessonId,title,objective,onComplete,completionLabel='Bước vào Thử Luyện',disabled=false,inputDisabled=false,initialPosition,onPositionChange}:{inputDisabled?:boolean;initialPosition?:ReadingPosition;onPositionChange?:(position:ReadingPosition)=>void;document:LessonPageDocument;lessonId?:string;title?:string;objective?:string;onComplete?:()=>void;completionLabel?:string;disabled?:boolean}) {
  const [index,setIndex]=useState(initialPosition?.index??0);
  const [blockIndex,setBlockIndex]=useState(initialPosition?.blockIndex??0);
  const [drafts,setDrafts]=useState<Record<string,Draft>>(initialPosition?.drafts??{});
  const [showTranscript,setShowTranscript]=useState(initialPosition?.showTranscript??false);
  useEffect(()=>{onPositionChange?.({index,blockIndex,drafts,showTranscript});},[index,blockIndex,drafts,showTranscript,onPositionChange]);
  const effectiveIndex=Math.min(index,document.pages.length-1);
  const current=document.pages[effectiveIndex];
  const presentation=lessonPresentation(lessonId);
  const art=current?.illustration??LESSON_ART[document.art??presentation.art];
  const stages=[...new Set(document.pages.map(p=>p.stage??'understand'))];
  const stage=current?.stage??'understand';
  const activeBlockIndex=Math.min(blockIndex,(current?.blocks.length??1)-1);
  const activeBlock=current?.blocks[activeBlockIndex];
  const contentRef=useRef<HTMLDivElement>(null);
  const [hasMoreBelow,setHasMoreBelow]=useState(false);
  useEffect(()=>{
    const region=contentRef.current;
    if(!region)return;
    region.scrollTop=0;
    const measure=()=>setHasMoreBelow(region.scrollHeight-region.clientHeight-region.scrollTop>8);
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(region);
    for(const child of region.children)observer.observe(child);
    region.addEventListener('scroll',measure,{passive:true});
    return ()=>{observer.disconnect();region.removeEventListener('scroll',measure);};
  },[current?.id,activeBlockIndex,showTranscript]);
  const move=(next:number,previous=false)=>{
    setIndex(next);
    setBlockIndex(previous?Math.max(0,document.pages[next].blocks.length-1):0);
    setShowTranscript(previous&&document.pages[next].layout==='dialogue');
  };
  if(!current)return <p role="status">Bài chưa có trang nội dung.</p>;
  const scene=current.layout==='scene';
  const dialogue=current.layout==='dialogue';
  const transcriptHidden=dialogue&&!showTranscript;
  const lastBlock=activeBlockIndex===current.blocks.length-1;
  const previous=()=>{
    if(activeBlockIndex>0&&!transcriptHidden)setBlockIndex(activeBlockIndex-1);
    else if(effectiveIndex>0)move(effectiveIndex-1,true);
  };
  const next=()=>{
    if(transcriptHidden)setShowTranscript(true);
    else if(!lastBlock)setBlockIndex(activeBlockIndex+1);
    else if(effectiveIndex<document.pages.length-1)move(effectiveIndex+1);
    else onComplete?.();
  };
  const finishing=!transcriptHidden&&lastBlock&&effectiveIndex===document.pages.length-1;
  const nextLabel=transcriptHidden?'Học từng lượt thoại':!lastBlock?'Mục tiếp':finishing?completionLabel:'Trang tiếp';
  return <section inert={inputDisabled} className="lesson-page-reader jade-lesson" data-motion-scene={current.id} aria-label="Các trang lĩnh hội">
    <header className="jade-lesson-heading" style={{backgroundImage:`linear-gradient(90deg,#0b281ef5 10%,#0b281eb3 62%,#0b281e24),url(${art.src})`}}>
      <div><a href="/path" className="jade-back"><ArrowLeft size={16}/>Thiên Lộ</a><span className="jade-eyebrow">NGỌC ĐIỆN · LĨNH HỘI</span><h1>{title??presentation.lesson?.title??'Bài học đang biên tập'}</h1><p>{learnerFacingCopy(objective??presentation.lesson?.objective??'Xem trước nội dung bằng giao diện người học')}</p></div><span className="jade-seal" aria-hidden="true">学</span>
    </header>
    <div className="jade-stages" aria-label="Các chặng của bài">{stages.map((s,i)=><button type="button" key={s} aria-current={stage===s?'step':undefined} onClick={()=>move(document.pages.findIndex(p=>(p.stage??'understand')===s))}><span>{i+1}</span><strong>{stageLabels[s]}</strong></button>)}</div>
    <div className={`lesson-page-content layout-${current.layout}`} key={current.id}>
      <div className="jade-page-title"><div><span className="jade-eyebrow">{String(effectiveIndex+1).padStart(2,'0')} · {stageLabels[stage]}</span><h2>{current.title}</h2></div><label><span className="sr-only">Chọn trang học</span><select aria-label="Chọn trang học" value={current.id} onChange={e=>move(document.pages.findIndex(p=>p.id===e.target.value))}>{document.pages.map((p,i)=><option key={p.id} value={p.id}>{i+1}. {p.title}</option>)}</select></label></div>
      {dialogue&&<div className="jade-listening-controls"><button type="button" onClick={()=>{const text=showTranscript&&activeBlock?.kind==='dialogue'?activeBlock.hanzi:current.blocks.filter(b=>b.kind==='dialogue').map(b=>b.hanzi).join('。');speakMandarin(text);}}><Headphones size={18}/><span>{showTranscript&&activeBlock?.kind==='dialogue'?'Nghe lượt này':'Nghe trọn tình huống'}<small className="jade-audio-source">Giọng tổng hợp</small></span></button><button type="button" className="jade-transcript-toggle" onClick={()=>setShowTranscript(!showTranscript)}><BookOpen size={18}/>{showTranscript?'Ẩn lời thoại để nghe lại':'Mở lời thoại Trung – Pinyin – Việt'}</button></div>}
      {!dialogue&&activeBlock?.kind==='dialogue'&&<div className="jade-listening-controls"><button type="button" onClick={()=>speakMandarin(activeBlock.hanzi)}><Volume2 size={18}/>Nghe âm mẫu tổng hợp</button></div>}
      <div className="jade-page-workspace">
      {(scene||dialogue) && <figure className="jade-scene"><img src={art.src} alt={art.alt} style={{objectPosition:`${current.illustration?.focalX??50}% ${current.illustration?.focalY??50}%`}}/>{current.illustration?.caption?.trim()&&<figcaption>{current.illustration.caption}</figcaption>}</figure>}
      <div className="jade-item-panel">
        {!transcriptHidden&&current.blocks.length>1&&<label className="jade-item-picker"><span aria-live="polite">{dialogue?'Lượt thoại':'Mục'} {activeBlockIndex+1} / {current.blocks.length}</span><select aria-label="Chọn mục trong trang" value={activeBlockIndex} onChange={e=>setBlockIndex(Number(e.target.value))}>{current.blocks.map((b,i)=><option key={b.id} value={i}>{i+1}. {b.title||'Nội dung'}</option>)}</select></label>}
        <div ref={contentRef} className="jade-blocks" key={`${current.id}:${activeBlockIndex}:${showTranscript}`} tabIndex={0} role="region" aria-label="Nội dung trang học">{activeBlock&&!transcriptHidden ? <Block key={activeBlock.id} block={activeBlock} index={activeBlockIndex} draft={drafts[activeBlock.id]??emptyDraft} onDraft={value=>setDrafts(previous=>({...previous,[activeBlock.id]:value}))}/>:<article className="jade-listening-brief"><h3>Nghe trước khi đọc</h3><p>Ai đang nói? Họ cần biết hoặc muốn làm điều gì?</p><p>Nghe một lượt, rồi mở lời thoại để học từng câu.</p><small>Âm mẫu tổng hợp · luôn có thể mở chữ để học.</small></article>}</div>
        {hasMoreBelow&&<button className="jade-more-content" type="button" onClick={()=>contentRef.current?.scrollBy({top:Math.max(60,contentRef.current.clientHeight*.8),behavior:'instant'})}>Xem phần dưới của mục này ↓</button>}
      </div>
      </div>
    </div>
    <footer><button type="button" disabled={effectiveIndex===0&&(activeBlockIndex===0||transcriptHidden)} onClick={previous}><ArrowLeft size={18}/>{activeBlockIndex>0&&!transcriptHidden?'Mục trước':'Trang trước'}</button><span>Trang {effectiveIndex+1} / {document.pages.length}</span>{lessonId&&<a className="jade-footer-dictionary" href={`/dictionary?lesson=${encodeURIComponent(lessonId)}`} target="_blank" rel="noreferrer" aria-label="Tra từ trong bài (mở tab mới)" title="Tra từ trong bài (mở tab mới)"><BookOpen size={20}/></a>}<button type="button" disabled={finishing&&(disabled||!onComplete)} onClick={next}>{nextLabel}<ArrowRight size={18}/></button></footer>
  </section>;
}
