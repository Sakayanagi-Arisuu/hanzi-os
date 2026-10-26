"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ASSESSMENT_SKILLS, assessmentItemErrors, type StudioAssessmentItem } from '../../../src/content/studioAssessment';
import type { StudioRevision } from '../../../src/server/contentStudioRepository';

export function AssessmentEditor({ revision }: { revision?: StudioRevision }) {
  const initial = revision?.content as unknown as StudioAssessmentItem | undefined;
  const [skill,setSkill]=useState(initial?.skill ?? 'vocabulary');
  const [busy,setBusy]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [error,setError]=useState('');
  const dirty=useRef(false);
  useEffect(()=>{setMounted(true);const warn=(event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const data=new FormData(event.currentTarget);
    const content={contentKind:'assessment-item' as const,skill,prompt:String(data.get('prompt')),instruction:String(data.get('instruction')),options:[0,1,2,3].map(i=>String(data.get(`option${i}`))),answerIndex:Number(data.get('answerIndex')),explanationVi:String(data.get('explanationVi')),provenance:String(data.get('provenance')),stimulusText:String(data.get('stimulusText')??''),review:{humanReviewed:false,aiSelfReview:Object.fromEntries(['accuracy','levelFit','pedagogy','answerIntegrity','originality'].map(key=>[key,data.get(key)==='on']))}};
    const issues=assessmentItemErrors(content);if(issues.length){setError(issues.join(' '));return;}
    setBusy(true);setError('');
    try { const response=await fetch(revision?`/api/studio/revisions/${revision.id}`:'/api/studio/items',{method:revision?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({itemType:'exam_item',level:revision?.level??'hsk0',stableKey:revision?.stableKey??`assessment.item.${crypto.randomUUID()}`,title:`Khảo nghiệm · ${content.prompt.slice(0,90)}`,content,expectedRowVersion:revision?.rowVersion,idempotencyKey:`assessment-save:${crypto.randomUUID()}`})});const body=await response.json();if(!response.ok)throw Error(body.error?.message??'Chưa lưu được câu hỏi.');dirty.current=false;window.location.assign(`/studio/items/${body.revision.id}?notice=${encodeURIComponent('Đã lưu câu khảo nghiệm. Hãy kiểm tra và gửi duyệt.')}`); } catch(reason){setError(reason instanceof Error?reason.message:'Chưa lưu được câu hỏi.');setBusy(false);}
  }
  return <form className="studio-structured-editor tv-assessment-editor" inert={!mounted} onChange={()=>{dirty.current=true;}} onSubmit={save}>
    <header className="studio-editor-heading"><h2>{revision?'Biên tập câu khảo nghiệm':'Soạn câu khảo nghiệm'}</h2><small>Câu mới vẫn cần người duyệt độc lập trước khi phát hành.</small></header>
    <div className="tv-form-scroll"><div className="studio-form-section">
    <label>Kỹ năng<select value={skill} onChange={event=>setSkill(event.target.value as typeof skill)}>{Object.entries(ASSESSMENT_SKILLS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    <label>Ngữ liệu / câu hỏi<textarea name="prompt" required maxLength={1000} defaultValue={initial?.prompt}/></label>
    <label>Hướng dẫn ngắn<input name="instruction" required maxLength={500} defaultValue={initial?.instruction} placeholder="Chọn nghĩa phù hợp"/></label>
    {skill==='listening'&&<label>Văn bản tiếng Trung để đọc<input name="stimulusText" required maxLength={500} defaultValue={initial?.stimulusText}/><small>Âm tổng hợp chỉ dùng luyện tập; không tạo bằng chứng nghe độc lập.</small></label>}
    <fieldset><legend>Bốn lựa chọn · đánh dấu đáp án đúng</legend>{[0,1,2,3].map(i=><label key={i} className="tv-assessment-option"><input type="radio" required name="answerIndex" value={i} defaultChecked={initial?.answerIndex===i}/><span>{String.fromCharCode(65+i)}</span><input name={`option${i}`} aria-label={`Lựa chọn ${String.fromCharCode(65+i)}`} required maxLength={500} defaultValue={initial?.options[i]}/></label>)}</fieldset>
    <label>Giải thích đáp án<textarea name="explanationVi" required maxLength={2000} defaultValue={initial?.explanationVi}/></label>
    <label>Nguồn và quyền sử dụng<textarea name="provenance" required maxLength={1000} defaultValue={initial?.provenance} placeholder="Nội dung nguyên bản hoặc nguồn được phép sử dụng"/></label>
    <details><summary>Tự kiểm chất lượng trước khi gửi duyệt</summary>{[['accuracy','Ngữ liệu và đáp án chính xác'],['levelFit','Phù hợp nền tảng đầu vào'],['pedagogy','Hướng dẫn rõ ràng'],['answerIntegrity','Chỉ có một đáp án đúng'],['originality','Có quyền sử dụng nội dung']].map(([key,label])=><label key={key}><input type="checkbox" name={key}/>{label}</label>)}</details>
    </div></div>
    <footer className="studio-editor-footer"><div role={error?'alert':undefined}>{error||'Lưu bản nháp, sau đó kiểm tra và gửi duyệt.'}</div><button disabled={busy||!mounted} type="submit">{busy?'Đang lưu…':'Lưu câu khảo nghiệm'}</button></footer>
  </form>;
}
