import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
export function OperationNotice() {
  const [notice,setNotice]=useState('');
  useEffect(()=>{const controller=new AbortController();fetch('/api/system/preferences',{signal:controller.signal,cache:'no-store'}).then(response=>response.ok?response.json():null).then(body=>{if(typeof body?.announcement==='string')setNotice(body.announcement);}).catch(()=>undefined);return()=>controller.abort();},[]);
  if(!notice)return null;
  return <details className="operation-notice"><summary aria-label="Thông báo vận hành"><Bell size={18}/><span>Thông báo</span></summary><div role="status">{notice}</div></details>;
}
