"use client";
import { emptyLessonReading, type LessonReading } from '../../src/learning/lessonReading';
export function LessonReadingEditor({value,onChange}:{value?:LessonReading;onChange:(value:LessonReading)=>void}) {
  const reading=value??emptyLessonReading();
  const update=(fields:Partial<LessonReading>)=>onChange({...reading,...fields});
  return <div className="lesson-reading-editor"><label>Nhiệm vụ đọc<textarea value={reading.instruction} onChange={e=>update({instruction:e.target.value})}/></label><label>Yêu cầu ghi chú<textarea value={reading.notePrompt} onChange={e=>update({notePrompt:e.target.value})}/></label>
    {reading.paragraphs.map((paragraph,index)=><fieldset key={paragraph.id}><legend>Đoạn {index+1}</legend>{(['hanzi','pinyin','meaningVi'] as const).map(field=><label key={field}>{{hanzi:'Văn bản Hán tự',pinyin:'Pinyin của đoạn',meaningVi:'Nghĩa Việt của đoạn'}[field]}<textarea value={paragraph[field]} onChange={e=>update({paragraphs:reading.paragraphs.map(p=>p.id===paragraph.id?{...p,[field]:e.target.value}:p)})}/></label>)}
      <div className="lesson-editor-actions">{[-1,1].map(delta=><button type="button" key={delta} disabled={index+delta<0||index+delta>=reading.paragraphs.length} onClick={()=>{const paragraphs=[...reading.paragraphs];[paragraphs[index],paragraphs[index+delta]]=[paragraphs[index+delta],paragraphs[index]];update({paragraphs});}}>{delta<0?'Đưa đoạn lên':'Đưa đoạn xuống'}</button>)}<button type="button" onClick={()=>update({paragraphs:reading.paragraphs.filter(p=>p.id!==paragraph.id)})}>Xóa đoạn</button></div>
    </fieldset>)}<button type="button" disabled={reading.paragraphs.length>=30} onClick={()=>update({paragraphs:[...reading.paragraphs,{id:crypto.randomUUID(),hanzi:'',pinyin:'',meaningVi:''}]})}>Thêm đoạn văn</button>
  </div>;
}
