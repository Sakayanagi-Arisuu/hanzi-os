"use client";
import type { LessonReading } from '../learning/lessonReading';
import type { ReadingDraft } from '../learning/lessonReadingSession';
export function LessonReadingBlock({reading,draft,onDraft}:{reading:LessonReading;draft:ReadingDraft;onDraft:(draft:ReadingDraft)=>void}) {
  const selected=draft.answerIds??[];
  return <div className="jade-reading">
    <p>{reading.instruction}</p>
    <div className="jade-reading-tools"><button type="button" aria-pressed={draft.showPinyin??false} onClick={()=>onDraft({...draft,showPinyin:!draft.showPinyin,everRevealed:true})}>{draft.showPinyin?'Ẩn Pinyin':'Mở Pinyin'}</button><button type="button" aria-pressed={draft.revealed} onClick={()=>onDraft({...draft,revealed:!draft.revealed,everRevealed:true})}>{draft.revealed?'Ẩn nghĩa Việt':'Mở nghĩa Việt'}</button></div>
    <ol className="jade-reading-text">{reading.paragraphs.map((paragraph,index)=><li key={paragraph.id} className={selected.includes(paragraph.id)?'is-selected':''}>
      <p className="jade-hanzi" lang="zh-Hans">{paragraph.hanzi}</p>
      {draft.showPinyin&&<p className="jade-pinyin">{paragraph.pinyin}</p>}
      {draft.revealed&&<p>{paragraph.meaningVi}</p>}
      <button type="button" aria-pressed={selected.includes(paragraph.id)} onClick={()=>onDraft({...draft,answerIds:selected.includes(paragraph.id)?selected.filter(id=>id!==paragraph.id):[...selected,paragraph.id]})}>{selected.includes(paragraph.id)?'Bỏ chọn':'Chọn'} đoạn {index+1} làm bằng chứng</button>
    </li>)}</ol>
    <label className="jade-answer-label">{reading.notePrompt}<textarea maxLength={12000} value={draft.text} onChange={e=>onDraft({...draft,text:e.target.value})} placeholder="Ghi ý chính bằng lời của bạn và giải thích vì sao chọn những đoạn trên…"/></label>
    <small className="jade-practice-note">Đã chọn {selected.length} đoạn · ghi chú tự học, chưa chấm điểm đọc hiểu.</small>
  </div>;
}
