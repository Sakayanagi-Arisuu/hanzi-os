import {useEffect,useState} from 'react';
import {listLessonResumes} from '../sync/indexedDb';
import {resolveLearningResumeOwnerScope} from '../sync/learningResumeStore';

export function useLocalPagePractice(ownerKey:string,enabled:boolean,refreshKey:unknown){
 const [result,setResult]=useState<{owner:string;values:unknown[]}|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let cancelled=false,sequence=0;
  const refresh=async()=>{
   const ticket=++sequence;
   try{
    const scope=await resolveLearningResumeOwnerScope(ownerKey);
    const records=await listLessonResumes(scope);
    if(!cancelled&&ticket===sequence)setResult({owner:ownerKey,values:records.filter(r=>r.entryKey.startsWith('lesson-reading:v1:')).map(r=>r.value)});
   }catch{if(!cancelled&&ticket===sequence)setResult(null);}
  };
  const wake=()=>{void refresh();};
  wake();window.addEventListener('focus',wake);window.addEventListener('hanzi-reading-saved',wake);
  return ()=>{cancelled=true;window.removeEventListener('focus',wake);window.removeEventListener('hanzi-reading-saved',wake);};
 },[ownerKey,enabled,refreshKey]);
 return result?.owner===ownerKey?result.values:[];
}
