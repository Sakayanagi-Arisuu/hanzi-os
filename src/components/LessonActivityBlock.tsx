"use client";
import {useEffect,useState} from 'react';
import type { ReadingDraft } from '../learning/lessonReadingSession';
import {captureLessonPageFirstAttempt} from '../learning/lessonPageAttempt';
import { evaluateLessonActivity, validateLessonActivity, type LessonActivity } from '../learning/lessonActivities';

export function LessonActivityBlock({activity,draft,onDraft}:{activity:LessonActivity;draft:ReadingDraft;onDraft:(value:ReadingDraft)=>void}) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    if(!activity.timeLimitSeconds||!draft.timerStartedAt)return;
    const interval=window.setInterval(()=>setNow(Date.now()),1000);
    return ()=>window.clearInterval(interval);
  },[activity.timeLimitSeconds,draft.timerStartedAt]);
  if(validateLessonActivity(activity).length)return <p role="status">Hoàn thiện đáp án và phản hồi trong Xưởng để thử bài tập này.</p>;
  const remaining=activity.timeLimitSeconds&&draft.timerStartedAt?Math.max(0,activity.timeLimitSeconds-Math.floor((now-Date.parse(draft.timerStartedAt))/1000)):null;
  const chosen=draft.answerIds??[];
  const update=(fields:Partial<ReadingDraft>)=>onDraft({...draft,...fields,compared:false});
  const result=evaluateLessonActivity(activity,draft);
  const answered=activity.type==='cloze'||activity.type==='rubric'?!!draft.text.trim():activity.type==='order'?chosen.length===activity.options.length:chosen.length===1;
  return <div className="jade-activity">
    {activity.timeLimitSeconds&&<div className="jade-practice-timer" role="status">{remaining===null?<><span>Tự luyện trong {Math.ceil(activity.timeLimitSeconds/60)} phút khi sẵn sàng.</span><button type="button" onClick={()=>{const startedAt=new Date().toISOString();setNow(Date.now());onDraft({...draft,timerStartedAt:startedAt});}}>Bắt đầu canh giờ</button></>:<><strong>{remaining===0?'Hết thời gian tự luyện':`Còn ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`}</strong><span>Bạn vẫn có thể hoàn thành và tự đối chiếu; đồng hồ không chấm điểm.</span>{remaining===0&&<button type="button" onClick={()=>{const startedAt=new Date().toISOString();setNow(Date.now());onDraft({...draft,timerStartedAt:startedAt});}}>Luyện lại có giờ</button>}</>}</div>}
    {activity.type==='choice'&&<div role="group" aria-label="Lựa chọn trả lời">{activity.options.map(option=><button key={option.id} type="button" aria-pressed={chosen.includes(option.id)} onClick={()=>update({answerIds:[option.id]})}><span lang="zh-Hans">{option.text}</span></button>)}</div>}
    {activity.type==='order'&&<><p>Chọn từng mảnh theo thứ tự. Bấm mảnh đã chọn để đưa trở lại.</p><div className="jade-order-answer" role="group" aria-label="Câu đang sắp xếp">{chosen.map((id,index)=><button type="button" key={id} onClick={()=>update({answerIds:chosen.filter((_,i)=>i!==index)})}>{activity.options.find(o=>o.id===id)?.text}</button>)}</div><div role="group" aria-label="Các mảnh còn lại">{activity.options.filter(o=>!chosen.includes(o.id)).map(option=><button key={option.id} type="button" onClick={()=>update({answerIds:[...chosen,option.id]})}>{option.text}</button>)}</div></>}
    {(activity.type==='cloze'||activity.type==='rubric')&&<label className="jade-answer-label">{activity.type==='cloze'?'Phần còn thiếu':'Bản viết của bạn'}<textarea maxLength={12000} value={draft.text} onChange={e=>update({text:e.target.value})}/></label>}
    <div className="jade-draft-actions"><button type="button" disabled={!answered} onClick={()=>onDraft({...captureLessonPageFirstAttempt(draft,new Date().toISOString()),compared:true,everChecked:true})}>{activity.type==='rubric'?'Xem hướng dẫn đối chiếu':'Kiểm tra câu trả lời'}</button>{activity.hint&&<button type="button" onClick={()=>onDraft({...draft,usedHint:true})}>Gợi ý</button>}</div>
    {draft.usedHint&&<p className="jade-reveal">{activity.hint}</p>}
    {draft.compared&&<div role="status" className="jade-reveal"><strong>{result==='correct'?'Đúng với đáp án của câu này.':result==='incorrect'?'Chưa đúng với yêu cầu của câu này.':'Tự đối chiếu theo tiêu chí; câu mở chưa được chấm tự động.'}</strong>{activity.type==='choice'&&<p>{activity.options.find(o=>o.id===chosen[0])?.feedback}</p>}<p>{activity.explanation}</p>{result==='incorrect'&&<p>Đọc giải thích rồi sửa câu trả lời để thử lại.</p>}</div>}
    {activity.type==='rubric'&&(draft.everChecked||draft.compared||chosen.length>0)&&<details className="jade-rubric-checklist"><summary>Tiêu chí tự kiểm · {chosen.length}/{activity.rubric.length}</summary><fieldset><legend>Đối chiếu bài của bạn</legend>{activity.rubric.map(criterion=><label key={criterion.id}><input type="checkbox" checked={chosen.includes(criterion.id)} onChange={e=>onDraft({...draft,answerIds:e.target.checked?[...chosen,criterion.id]:chosen.filter(id=>id!==criterion.id)})}/><strong>{criterion.label}</strong><span>{criterion.guidance}</span></label>)}</fieldset></details>}
    <small className="jade-practice-note">Luyện trong bài · kết quả này chưa phải đánh giá thành thạo.{draft.usedHint?' Đã dùng gợi ý.':''}{draft.everChecked?' Lượt sau đã có phản hồi hỗ trợ.':''}</small>
  </div>;
}
