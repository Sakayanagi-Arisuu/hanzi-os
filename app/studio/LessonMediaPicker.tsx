"use client";
import { useState } from 'react';
import { LESSON_MEDIA_MAX_BYTES, type LessonMediaAsset, type LessonMediaMetadata } from '../../src/content/lessonMedia';

const blank:LessonMediaMetadata={title:'',alt:'',caption:'',provenance:'',license:'',sourceKind:'original',transcript:'',focalX:50,focalY:50,humanReviewed:false};
export function LessonMediaPicker({kind,onSelect}:{kind:'image'|'audio';onSelect:(asset:LessonMediaAsset)=>void}) {
  const [open,setOpen]=useState(false);const [assets,setAssets]=useState<LessonMediaAsset[]>([]);
  const [metadata,setMetadata]=useState(blank);const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [query,setQuery]=useState('');const [activeQuery,setActiveQuery]=useState('');const [nextCursor,setNextCursor]=useState<string|null>(null);
  const refresh=async(append=false)=>{setBusy(true);setError('');try{const search=append?activeQuery:query;const params=new URLSearchParams({kind,q:search});if(append&&nextCursor)params.set('cursor',nextCursor);const response=await fetch(`/api/content/media?${params}`);const data=await response.json();if(!response.ok)throw new Error(data.error?.message??'Chưa đọc được kho học liệu.');setAssets(old=>append?[...new Map([...old,...data.assets].map(asset=>[asset.id,asset])).values()]:data.assets);setNextCursor(data.nextCursor??null);setActiveQuery(search);}catch(e){setError(e instanceof Error?e.message:'Chưa đọc được kho.');}finally{setBusy(false);}};
  const upload=async()=>{
    if(!file)return;setBusy(true);setError('');
    try{
      if(file.size>LESSON_MEDIA_MAX_BYTES)throw new Error('Chọn tệp tối đa 8 MB.');
      const dataBase64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Không đọc được tệp.'));reader.readAsDataURL(file);});
      const response=await fetch('/api/content/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mimeType:file.type,dataBase64,metadata})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message??'Chưa tải lên được.');
      setAssets(old=>[data.asset,...old]);setFile(null);onSelect(data.asset);setOpen(false);
    }catch(e){setError(e instanceof Error?e.message:'Chưa tải lên được.');}finally{setBusy(false);}
  };
  return <div className="lesson-media-picker"><button type="button" onClick={()=>{setOpen(!open);if(!open)void refresh();}}>{open?'Đóng kho học liệu':`Chọn hoặc tải ${kind==='image'?'ảnh':'audio'}`}</button>{open&&<section aria-label="Kho học liệu bài học">
    <p>Thay tệp tạo học liệu mới, giữ nguyên tệp của các bản bài học trước. Nội dung chưa phát hành chỉ mở trong Xưởng.</p>
    {error&&<p role="alert">{error}</p>}
    <label>Tìm học liệu theo tên, chú thích hoặc nguồn<input maxLength={160} value={query} disabled={busy} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(!busy)void refresh();}}}/></label>
    <button type="button" disabled={busy} onClick={()=>void refresh()}>Tìm học liệu</button>
    {!busy&&!assets.length&&<p role="status">Chưa có học liệu phù hợp.</p>}
    <fieldset disabled={busy}><legend>Tải học liệu mới</legend>
      <label>Tệp {kind==='image'?'PNG, JPEG, WebP':'MP3, WAV, OGG'} · tối đa 8 MB<input type="file" accept={kind==='image'?'image/png,image/jpeg,image/webp':'audio/mpeg,audio/wav,audio/ogg'} onChange={e=>{setFile(e.target.files?.[0]??null);}}/></label>
      {(['title','alt','caption','provenance','license',...(kind==='audio'?['transcript']:[])] as Array<'title'|'alt'|'caption'|'provenance'|'license'|'transcript'>).map(key=><label key={key}>{{title:'Tên học liệu',alt:'Mô tả ảnh cho người không nhìn thấy',caption:'Chú thích',provenance:'Nguồn học liệu',license:'Giấy phép hoặc quyền sử dụng',transcript:'Lời thoại đầy đủ'}[key]}<textarea value={metadata[key]} onChange={e=>setMetadata({...metadata,[key]:e.target.value})}/></label>)}
      <label>Loại nguồn<select value={metadata.sourceKind} onChange={e=>setMetadata({...metadata,sourceKind:e.target.value as LessonMediaMetadata['sourceKind']})}><option value="original">Nguyên bản của HANZI.OS</option><option value="licensed">Nguồn có giấy phép</option><option value="synthetic">AI / âm thanh tổng hợp</option></select></label>
      {kind==='image'&&<>{(['focalX','focalY'] as const).map(key=><label key={key}>Điểm trọng tâm {key==='focalX'?'ngang':'dọc'} (%)<input type="number" min={0} max={100} value={metadata[key]} onChange={e=>setMetadata({...metadata,[key]:Number(e.target.value)})}/></label>)}</>}
      <p>Chưa được người biên tập xác nhận review. Việc tải lên không tự đánh dấu đã duyệt.</p>
      <button type="button" disabled={!file} onClick={()=>void upload()}>Tải lên và dùng trong khối</button>
    </fieldset>
    <div className="lesson-media-grid">{assets.filter(asset=>asset.mimeType.startsWith(kind+'/')).map(asset=><article key={asset.id}>
      {kind==='image'?<img src={asset.url} alt={asset.metadata.alt} style={{objectPosition:`${asset.metadata.focalX}% ${asset.metadata.focalY}%`}}/>:<audio controls preload="none" src={asset.url}/>}
      <strong>{asset.metadata.title}</strong><p>{asset.metadata.caption}</p><small>{asset.metadata.provenance} · {asset.metadata.license}</small>
      <details><summary>Nơi sử dụng ({asset.usages.length})</summary>{asset.usages.length?asset.usages.map(usage=><p key={usage.id}><a href={`/studio/items/${usage.id}`} target="_blank" rel="noreferrer">{usage.title}</a> · {usage.state}</p>):<p>Chưa có bản bài học lưu tham chiếu tệp này.</p>}</details>
      <button type="button" onClick={()=>{onSelect(asset);setOpen(false);}}>Dùng học liệu này</button>
      {!asset.usages.length&&<button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{const response=await fetch(asset.url,{method:'DELETE'});if(!response.ok){const data=await response.json();throw new Error(data.error?.message??'Chưa xóa được.');}setAssets(old=>old.filter(a=>a.id!==asset.id));}catch(e){setError(e instanceof Error?e.message:'Chưa xóa được.');}finally{setBusy(false);}}}>Xóa tệp chưa dùng</button>}
    </article>)}</div>
    {nextCursor&&<button type="button" disabled={busy} onClick={()=>void refresh(true)}>{busy?'Đang tải…':'Tải thêm học liệu'}</button>}
  </section>}</div>;
}
